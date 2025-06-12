import { RegisterUserUseCase } from './RegisterUserUseCase'
import { User } from '@/domain/entities/User'
import { Token } from '@/domain/entities/Token'

const mockUserRepository = {
  userExistsByUsername: jest.fn(),
  userExistsByEmail: jest.fn(),
  create: jest.fn(),
}

const mockPasswordHasher = {
  hash: jest.fn(),
}

const mockEmailService = {
  sendConfirmationEmail: jest.fn(),
}

const mockTokenService = {
  generateToken: jest.fn(),
}

const mockTokenRepository = {
  create: jest.fn(),
}

const buildRegisterUserUseCase = () => {
  return new RegisterUserUseCase(
    mockUserRepository as any,
    mockPasswordHasher as any,
    mockEmailService as any,
    mockTokenService as any,
    mockTokenRepository as any
  )
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('RegisterUserUseCase', () => {
  it('should create a new user and send confirmation email', async () => {
    mockUserRepository.userExistsByUsername.mockResolvedValue(false)
    mockUserRepository.userExistsByEmail.mockResolvedValue(false)
    mockPasswordHasher.hash.mockResolvedValue('hashed-password')
    mockUserRepository.create.mockImplementation(async (user: User) => ({
      ...user,
      id: 'user-id',
    }))
    mockTokenService.generateToken.mockResolvedValue('token-value')
    mockTokenRepository.create.mockResolvedValue(undefined)
    mockEmailService.sendConfirmationEmail.mockResolvedValue(undefined)

    const registerUseCase = buildRegisterUserUseCase()
    const result = await registerUseCase.execute('test@email.com', 'username', 'password')

    expect(result).toEqual({
      success: true,
      message: 'User created successfully',
    })
    expect(mockUserRepository.userExistsByUsername).toHaveBeenCalledWith('username')
    expect(mockUserRepository.userExistsByEmail).toHaveBeenCalledWith('test@email.com')
    expect(mockPasswordHasher.hash).toHaveBeenCalledWith('password')
    expect(mockUserRepository.create).toHaveBeenCalled()
    expect(mockTokenService.generateToken).toHaveBeenCalledWith('user-id', 'EMAIL_VERIFICATION')
    expect(mockTokenRepository.create).toHaveBeenCalledWith(
      expect.any(Token)
    )
    expect(mockEmailService.sendConfirmationEmail).toHaveBeenCalledWith('test@email.com', 'token-value')
  })

  it('should throw an error if username already exists', async () => {
    mockUserRepository.userExistsByUsername.mockResolvedValue(true)
    mockUserRepository.userExistsByEmail.mockResolvedValue(false)

    const registerUserUseCase = buildRegisterUserUseCase()
    await expect(
      registerUserUseCase.execute('test@email.com', 'username', 'password')
    ).rejects.toThrow('User already exists')
  })

  it('should throw an error if email already exists', async () => {
    mockUserRepository.userExistsByUsername.mockResolvedValue(false)
    mockUserRepository.userExistsByEmail.mockResolvedValue(true)

    const registerUserUseCase = buildRegisterUserUseCase()
    await expect(
      registerUserUseCase.execute('test@email.com', 'username', 'password')
    ).rejects.toThrow('User already exists')
  })

  it('should throw an error if user creation fails (no id)', async () => {
    mockUserRepository.userExistsByUsername.mockResolvedValue(false)
    mockUserRepository.userExistsByEmail.mockResolvedValue(false)
    mockPasswordHasher.hash.mockResolvedValue('hashed-password')
    mockUserRepository.create.mockResolvedValue({})

    const registerUserUseCase = buildRegisterUserUseCase()
    await expect(
      registerUserUseCase.execute('test@email.com', 'username', 'password')
    ).rejects.toThrow('An error occurred while creating user')
  })
})