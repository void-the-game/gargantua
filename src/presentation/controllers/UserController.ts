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
import { UpdateUserUseCase } from '@/application/useCases/UpdateUserUseCase'
import { User } from '@/domain/entities/User'
import { DeleteUserUseCase } from '@/application/useCases/DeleteUserUseCase'
dotenv.config()

export class UserController {
  private getUserByUsernameUseCase: GetUserByUsernameUseCase
  private registerUserUseCase: RegisterUserUseCase
  private verifyUserEmailUseCase: VerifyEmailUseCase
  private userLoginUseCase: UserLoginUseCase
  private updateUserUseCase: UpdateUserUseCase
  private deleteUserUseCase: DeleteUserUseCase

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

    this.updateUserUseCase = new UpdateUserUseCase(
      userRepository,
      passwordHasher
    )

    this.deleteUserUseCase = new DeleteUserUseCase(userRepository)
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

    const { success, message } =
      await this.verifyUserEmailUseCase.execute(token)

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

    const { accessToken, message, success, username, id } =
      await this.userLoginUseCase.execute(email, password)

    if (!success) return res.status(400).json({ message })

    return res.status(200).json({ accessToken, message, success, username, id })
  }

  async updateUser(req: Request, res: Response) {
    try {
      const authenticatedUserId = req.user?.id

      const { userId } = req.params

      if (authenticatedUserId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You can only update your own profile',
        })
      }

      const { email, username, password } = req.body

      if (email && !validator.isEmail(email)) {
        return res.status(422).json({
          success: false,
          message: 'Type a valid email address',
        })
      }

      if (password && !validator.isStrongPassword(password)) {
        return res.status(422).json({
          success: false,
          message: 'Password does not meet the requirements',
        })
      }

      const updateData: Partial<User> = {}
      if (email) updateData.email = email
      if (username) updateData.username = username
      if (password) updateData.password = password

      const result = await this.updateUserUseCase.execute(userId, updateData)

      return res.status(200).json(result)
    } catch (error: any) {
      const statusMap: any = {
        'User not found': 404,
        'Username already in use': 422,
        'Email already in use': 422,
      }

      const statusCode = statusMap[error.message] || 400

      return res.status(statusCode).json({
        success: false,
        message: error.message,
      })
    }
  }

  async deleteUser(req: Request, res: Response) {
    try {
      const authenticatedUserId = req.user?.id

      const { userId } = req.params

      if (authenticatedUserId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You can only delete your own profile',
        })
      }

      const result = await this.deleteUserUseCase.execute(userId)

      return res.status(200).json(result)
    } catch (error: any) {
      const statusCode = error.message === 'User not found' ? 404 : 400
      return res.status(statusCode).json({
        success: false,
        message: error.message,
      })
    }
  }
}
