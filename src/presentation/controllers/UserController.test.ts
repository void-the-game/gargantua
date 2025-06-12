import { UserController } from './UserController'
import { Request, Response } from 'express'
const validator = require('validator')

jest.mock('@/application/useCases/GetUserByUsernameUseCase')
jest.mock('@/application/useCases/RegisterUserUseCase')
jest.mock('@/application/useCases/VerifyUserEmailUseCase')
jest.mock('@/application/useCases/UserLoginUseCase')
jest.mock('@/infrastructure/repositories/UserRepositoryMongoose')
jest.mock('@/infrastructure/repositories/TokenMongoose')
jest.mock('@/infrastructure/services/BcryptPasswordHasher')
jest.mock('@/infrastructure/services/JwtTokenService')
jest.mock('@/infrastructure/services/NodemailerEmailService')
jest.mock('validator', () => ({
  isEmail: jest.fn(),
  isStrongPassword: jest.fn(),
}))


describe('UserController', () => {
  let controller: UserController
  let req: Partial<Request>
  let res: Partial<Response>
  let statusMock: jest.Mock
  let jsonMock: jest.Mock

  beforeAll(() => {
    process.env.JWT_SECRET = 'app_secret'
  })

  beforeEach(() => {
    controller = new UserController()
    statusMock = jest.fn().mockReturnThis()
    jsonMock = jest.fn()
    req = {}
    res = {
      status: statusMock,
      json: jsonMock,
    } as any
    jest.clearAllMocks()
  })

  describe('create user', () => {
    it('should return 422 if email is invalid', async () => {
      req.body = { email: 'test.com', username: 'user', password: 'Password123!' }

      validator.isEmail.mockReturnValue(false)

      await controller.createUser(req as Request, res as Response)

      expect(statusMock).toHaveBeenCalledWith(422)
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Type a valid email address',
      })
    })

    it('should return 422 if password is not strong', async () => {
      req.body = { email: 'test@email.com', username: 'user', password: '123' }

      validator.isEmail.mockReturnValue(true)
      validator.isStrongPassword.mockReturnValue(false)

      await controller.createUser(req as Request, res as Response)

      expect(statusMock).toHaveBeenCalledWith(422)
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Password does not meet the requirements',
      })
    })

    it('should return 201 and result on success', async () => {
      req.body = { email: 'test@email.com', username: 'user', password: 'Password123!' }

      validator.isEmail.mockReturnValue(true)
      validator.isStrongPassword.mockReturnValue(true)

      //@ts-ignore
      controller.registerUserUseCase.execute = jest.fn().mockResolvedValue({ success: true })
      await controller.createUser(req as Request, res as Response)

      expect(statusMock).toHaveBeenCalledWith(201)
      expect(jsonMock).toHaveBeenCalledWith({ success: true })
    })

    it('should return 422 if user already exists', async () => {
      req.body = { email: 'test@email.com', username: 'user', password: 'Password123!' }

      validator.isEmail.mockReturnValue(true)
      validator.isStrongPassword.mockReturnValue(true)

      //@ts-ignore
      controller.registerUserUseCase.execute = jest.fn().mockRejectedValue(new Error('User already exists'))
      await controller.createUser(req as Request, res as Response)

      expect(statusMock).toHaveBeenCalledWith(422)
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'User already exists',
      })
    })

    it('should return 400 on other errors', async () => {
      req.body = { email: 'test@email.com', username: 'user', password: 'Password123!' }

      validator.isEmail.mockReturnValue(true)
      validator.isStrongPassword.mockReturnValue(true)

      //@ts-ignore
      controller.registerUserUseCase.execute = jest.fn().mockRejectedValue(new Error('Some error'))
      await controller.createUser(req as Request, res as Response)

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Some error',
      })
    })

    describe('get user by username', () => {
      it('should return 400 if username is missing', async () => {
        req.params = {}
        await controller.getUserByUsername(req as Request, res as Response)

        expect(statusMock).toHaveBeenCalledWith(400)
        expect(jsonMock).toHaveBeenCalledWith({
          success: false,
          message: 'Username is required',
        })
      })

      it('should return 404 if user not found', async () => {
        req.params = { username: 'user' }

        //@ts-ignore
        controller.getUserByUsernameUseCase.execute = jest.fn().mockResolvedValue(null)
        await controller.getUserByUsername(req as Request, res as Response)
        expect(statusMock).toHaveBeenCalledWith(404)
        expect(jsonMock).toHaveBeenCalledWith({
          success: false,
          message: 'User not found',
        })
      })

      it('should return 200 and user if found', async () => {
        req.params = { username: 'user' }
        const user = { username: 'user', email: 'test@email.com' }

        //@ts-ignore
        controller.getUserByUsernameUseCase.execute = jest.fn().mockResolvedValue(user)
        await controller.getUserByUsername(req as Request, res as Response)

        expect(statusMock).toHaveBeenCalledWith(200)
        expect(jsonMock).toHaveBeenCalledWith({
          success: true,
          user,
        })
      })
    })

    describe('verify user email', () => {
      it('should return 400 if token is missing', async () => {
        req.params = {}

        await controller.verifyUserEmail(req as Request, res as Response)

        expect(statusMock).toHaveBeenCalledWith(400)
        expect(jsonMock).toHaveBeenCalledWith({
          success: false,
          message: 'Invalid link. Cannot verify user email address',
        })
      })

      it('should return 400 if verification fails', async () => {
        req.params = { token: 'sometoken' }

        // @ts-ignore
        controller.verifyUserEmailUseCase.execute = jest.fn().mockResolvedValue({ success: false, message: 'Invalid token' })

        await controller.verifyUserEmail(req as Request, res as Response)
        expect(statusMock).toHaveBeenCalledWith(400)
        expect(jsonMock).toHaveBeenCalledWith({ message: 'Invalid token' })
      })

      it('should return 200 if verification succeeds', async () => {
        req.params = { token: 'sometoken' }

        //@ts-ignore
        controller.verifyUserEmailUseCase.execute = jest.fn().mockResolvedValue({ success: true, message: 'ok' })
        await controller.verifyUserEmail(req as Request, res as Response)

        expect(statusMock).toHaveBeenCalledWith(200)
        expect(jsonMock).toHaveBeenCalledWith({ success: true, message: 'Email verified' })
      })
    })

    describe('loginUser', () => {
      it('should return 400 if email or password is missing', async () => {
        req.body = { email: '', password: '' }

        await controller.loginUser(req as Request, res as Response)

        expect(statusMock).toHaveBeenCalledWith(400)
        expect(jsonMock).toHaveBeenCalledWith({
          success: false,
          message: 'All fields are required',
        })
      })

      it('should return 400 if login fails', async () => {
        req.body = { email: 'test@email.com', password: 'Password123!' }

        //@ts-ignore
        controller.userLoginUseCase.execute = jest.fn().mockResolvedValue({ success: false, message: 'Invalid credentials' })
        await controller.loginUser(req as Request, res as Response)

        expect(statusMock).toHaveBeenCalledWith(400)
        expect(jsonMock).toHaveBeenCalledWith({ message: 'Invalid credentials' })
      })

      it('should return 200 and token if login succeeds', async () => {
        req.body = { email: 'test@email.com', password: 'Password123!' }
        const result = { accessToken: 'token', message: 'ok', success: true, username: 'user' }

        //@ts-ignore
        controller.userLoginUseCase.execute = jest.fn().mockResolvedValue(result)
        await controller.loginUser(req as Request, res as Response)

        expect(statusMock).toHaveBeenCalledWith(200)
        expect(jsonMock).toHaveBeenCalledWith(result)
      })
    })
  })
})
