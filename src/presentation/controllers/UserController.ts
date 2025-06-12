import { GetUserByUsernameUseCase } from '@/application/useCases/GetUserByUsernameUseCase'
import { RegisterUserUseCase } from '@/application/useCases/RegisterUserUseCase'
import { VerifyEmailUseCase } from '@/application/useCases/VerifyUserEmailUseCase'
import { TokenMongoose } from '@/infrastructure/repositories/TokenMongoose'
import { UserRepositoryMongoose } from '@/infrastructure/repositories/UserRepositoryMongoose'
import { BcryptPasswordHasher } from '@/infrastructure/services/BcryptPasswordHasher'
import { JwtTokenService } from '@/infrastructure/services/JwtTokenService'
import { NodeMailerEmailService } from '@/infrastructure/services/NodemailerEmailService'
import { Request, Response } from 'express'
import process from 'process'
import validator from 'validator'
import dotenv from 'dotenv'
import * as Sentry from '@sentry/node'

import { UserLoginUseCase } from '@/application/useCases/UserLoginUseCase'
dotenv.config()

export class UserController {
  private getUserByUsernameUseCase: GetUserByUsernameUseCase
  private registerUserUseCase: RegisterUserUseCase
  private verifyUserEmailUseCase: VerifyEmailUseCase
  private userLoginUseCase: UserLoginUseCase

  constructor() {
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) throw new Error('JWT secret is required')

    const userRepository = new UserRepositoryMongoose()
    const tokenRepository = new TokenMongoose()
    const passwordHasher = new BcryptPasswordHasher()
    const emailService = new NodeMailerEmailService()
    const tokenService = new JwtTokenService(jwtSecret)

    this.getUserByUsernameUseCase = new GetUserByUsernameUseCase(userRepository)
    this.registerUserUseCase = new RegisterUserUseCase(
      userRepository,
      passwordHasher,
      emailService,
      tokenService,
      tokenRepository
    )

    this.userLoginUseCase = new UserLoginUseCase(
      userRepository,
      passwordHasher,
      tokenService
    )

    this.verifyUserEmailUseCase = new VerifyEmailUseCase(
      tokenService,
      tokenRepository,
      userRepository
    )
  }

  async createUser(req: Request, res: Response) {
    const { logger } = Sentry

    logger.info('User registration attempt', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      email: req.body.email?.split('@')[0] + '@***',
    })

    try {
      const { email, username, password } = req.body

      if (!validator.isEmail(email)) {
        logger.warn('Invalid email provided', {
          email: email,
        })
        return res.status(422).json({
          success: false,
          message: 'Type a valid email address',
        })
      }

      if (!validator.isStrongPassword(password)) {
        logger.warn('Weak password provided', {
          email: email?.split('@')[0] + '@***',
        })
        return res.status(422).json({
          success: false,
          message: 'Password does not meet the requirements',
        })
      }

      const result = await this.registerUserUseCase.execute(
        email,
        username,
        password
      )

      logger.info('User registration successful', {
        username,
        email: email?.split('@')[0] + '@***',
      })

      return res.status(201).json(result)
    } catch (error: any) {
      logger.error('User registration failed', {
        error: error.message,
        email: req.body.email?.split('@')[0] + '@***',
      })

      Sentry.captureException(error)

      const statusCode = error.message === 'User already exists' ? 422 : 400

      return res.status(statusCode).json({
        success: false,
        message: error.message,
      })
    }
  }

  async getUserByUsername(req: Request, res: Response) {
    const { username } = req.params

    if (!username) {
      return res.status(400).json({
        success: false,
        message: 'Username is required',
      })
    }

    const user = await this.getUserByUsernameUseCase.execute(username)

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      })
    }

    return res.status(200).json({
      success: true,
      user,
    })
  }

  async verifyUserEmail(req: Request, res: Response) {
    const { logger } = Sentry

    logger.info('Email verification attempt', {
      hasToken: !!req.params.token,
    })

    const { token } = req.params

    if (!token) {
      logger.warn('Email verification with invalid token')

      return res.status(400).json({
        success: false,
        message: 'Invalid link. Cannot verify user email address',
      })
    }

    try {
      const { success, message } =
        await this.verifyUserEmailUseCase.execute(token)

      if (!success) {
        logger.warn('Email verification failed', { message })
        return res.status(400).json({ message })
      }

      logger.info('Email verification successful')
      return res.status(200).json({ success: true, message: 'Email verified' })
    } catch (error: any) {
      logger.error('Email verification error', { error: error.message })
      Sentry.captureException(error)
      return res.status(500).json({ message: 'Internal server error' })
    }
  }

  async loginUser(req: Request, res: Response) {
    const { logger } = Sentry

    logger.info('Login attempt', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      email: req.body.email?.split('@')[0] + '@***',
    })

    const { email, password } = req.body

    if (!email || !password) {
      logger.warn('Login attempt with missing fields', {
        hasEmail: !!email,
        hasPassword: !!password,
      })

      return res.status(400).json({
        success: false,
        message: 'All fields are required',
      })
    }

    try {
      const { accessToken, message, success, username } =
        await this.userLoginUseCase.execute(email, password)

      if (!success) {
        logger.warn('Login failed - invalid credentials', {
          email: email?.split('@')[0] + '@***',
        })

        return res.status(400).json({ message })
      }

      logger.info('Login successful', {
        username,
        email: email?.split('@')[0] + '@***',
      })

      //Define contexto do usuário para erros futuros
      Sentry.setUser({
        username,
        email: email?.split('@')[0] + '@***',
      })

      return res.status(200).json({ accessToken, message, success, username })
    } catch (error: any) {
      logger.error('Login error', {
        error: error.message,
        email: req.body.email?.split('@')[0] + '@***',
      })

      Sentry.captureException(error)
      return res.status(500).json({ message: 'Internal server error' })
    }
  }
}
