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
      userRepository,
    )
  }

  async createUser(req: Request, res: Response) {
    try {
      const { email, username, password } = req.body

      if (!validator.isEmail(email)) {
        return res.status(422).json({
          success: false,
          message: 'Type a valid email address',
        })
      }

      if (!validator.isStrongPassword(password)) {
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
      return res.status(201).json(result)
    } catch (error: any) {
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
    const { token } = req.params

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Invalid link. Cannot verify user email address',
      })
    }

    const { success, message } = await this.verifyUserEmailUseCase.execute(token)

    if (!success) return res.status(400).json({ message })

    return res.status(200).json({ success: true, message: 'Email verified' })
  }

  async loginUser(req: Request, res: Response) {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required',
      })
    }

    const { accessToken, message, success, username } = await this.userLoginUseCase.execute(email, password)

    if (!success) return res.status(400).json({ message })

    return res.status(200).json({ accessToken, message, success, username })
  }
}
