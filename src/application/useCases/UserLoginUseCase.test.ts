import { UserLoginUseCase } from './UserLoginUseCase'
import { UserRepository } from '@/domain/repositories/UserRepository'
import { PasswordHasher } from '@/domain/services/PasswordHasher'
import { JwtTokenService } from '@/infrastructure/services/JwtTokenService'

describe('UserLoginUseCase', () => {
  let userRepository: jest.Mocked<UserRepository>
  let passwordHasher: jest.Mocked<PasswordHasher>
  let jwtTokenService: jest.Mocked<JwtTokenService>
  let useCase: UserLoginUseCase

  const mockUser = {
    id: '123',
    email: 'xpto@example.com',
    password: 'hashed-password',
    username: 'xpto-da-silva'
  }

  beforeEach(() => {
    userRepository = {
      getUserByEmail: jest.fn()
    } as any

    passwordHasher = {
      compare: jest.fn()
    } as any

    jwtTokenService = {
      generateToken: jest.fn()
    } as any

    useCase = new UserLoginUseCase(userRepository, passwordHasher, jwtTokenService)
  })

  it('should return USER_NOT_FOUND if user does not exist', async () => {
    userRepository.getUserByEmail.mockResolvedValue(null)

    const result = await useCase.execute('notfound@example.com', 'password')

    expect(result).toEqual({
      success: false,
      message: 'User not found'
    })
  })

  it('should return USER_NOT_FOUND if user has no id', async () => {
    userRepository.getUserByEmail.mockResolvedValue({ ...mockUser, id: undefined })

    const result = await useCase.execute('test@example.com', 'password')

    expect(result).toEqual({
      success: false,
      message: 'User not found'
    })
  })

  it('should return PASSWORD_INCORRECT if password is invalid', async () => {
    userRepository.getUserByEmail.mockResolvedValue(mockUser)
    passwordHasher.compare.mockResolvedValue(false)

    const result = await useCase.execute('test@example.com', 'wrongpassword')

    expect(result).toEqual({
      success: false,
      message: 'Incorrect user or password'
    })
  })

  it('should return accessToken and username on successful login', async () => {
    userRepository.getUserByEmail.mockResolvedValue(mockUser)
    passwordHasher.compare.mockResolvedValue(true)
    jwtTokenService.generateToken.mockResolvedValue('jwt-access-token')

    const result = await useCase.execute('test@example.com', 'correctpassword')

    expect(result).toEqual({
      success: true,
      username: 'xpto-da-silva',
      message: 'Logged in successfully',
      accessToken: 'jwt-access-token'
    })
    expect(jwtTokenService.generateToken).toHaveBeenCalledWith('123', 'ACCESS')
  })
})