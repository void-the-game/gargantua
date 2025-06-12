import { VerifyEmailUseCase } from './VerifyUserEmailUseCase'
import { TokenRepository } from '@/domain/repositories/TokenRepository'
import { UserRepository } from '@/domain/repositories/UserRepository'
import { TokenService } from '@/domain/services/TokenService'

describe('VerifyEmailUseCase', () => {
  let tokenService: jest.Mocked<TokenService>
  let tokenRepository: jest.Mocked<TokenRepository>
  let userRepository: jest.Mocked<UserRepository>
  let useCase: VerifyEmailUseCase

  const validToken = 'token'
  const userId = '123'
  const now = new Date()
  const futureDate = new Date(now.getTime() + 10000)
  const pastDate = new Date(now.getTime() - 10000)

  beforeEach(() => {
    tokenService = {
      verifyToken: jest.fn()
    } as any

    tokenRepository = {
      find: jest.fn(),
      delete: jest.fn()
    } as any

    userRepository = {
      update: jest.fn()
    } as any

    useCase = new VerifyEmailUseCase(tokenService, tokenRepository, userRepository)
  })

  it('should return success when token is valid and not expired', async () => {
    tokenService.verifyToken.mockResolvedValue({ userId, isValid: true })
    tokenRepository.find.mockResolvedValue({ token: validToken, userId, expiresAt: futureDate, type: 'EMAIL_VERIFICATION' })
    userRepository.update.mockResolvedValue(undefined)
    tokenRepository.delete.mockResolvedValue(true)

    const result = await useCase.execute(validToken)

    expect(tokenService.verifyToken).toHaveBeenCalledWith(validToken)
    expect(tokenRepository.find).toHaveBeenCalledWith(validToken, userId)
    expect(userRepository.update).toHaveBeenCalledWith(userId, { verified: true })
    expect(tokenRepository.delete).toHaveBeenCalledWith(validToken)
    expect(result).toEqual({ success: true })
  })

  it('should return error if token is invalid', async () => {
    tokenService.verifyToken.mockResolvedValue({ userId, isValid: false })

    const result = await useCase.execute(validToken)

    expect(result).toEqual({ success: false, message: 'Invalid token' })
    expect(tokenRepository.find).not.toHaveBeenCalled()
    expect(userRepository.update).not.toHaveBeenCalled()
    expect(tokenRepository.delete).not.toHaveBeenCalled()
  })

  it('should return error if token is not found', async () => {
    tokenService.verifyToken.mockResolvedValue({ userId, isValid: true })
    tokenRepository.find.mockResolvedValue(null)

    const result = await useCase.execute(validToken)

    expect(result).toEqual({ success: false, message: 'Token is either expired or not found' })
    expect(userRepository.update).not.toHaveBeenCalled()
    expect(tokenRepository.delete).not.toHaveBeenCalled()
  })

  it('should return error if token is expired', async () => {
    tokenService.verifyToken.mockResolvedValue({ userId, isValid: true })
    tokenRepository.find.mockResolvedValue({ token: validToken, userId, expiresAt: pastDate, type: 'EMAIL_VERIFICATION' })

    const result = await useCase.execute(validToken)

    expect(result).toEqual({ success: false, message: 'Token is either expired or not found' })
    expect(userRepository.update).not.toHaveBeenCalled()
    expect(tokenRepository.delete).not.toHaveBeenCalled()
  })

  it('should return { success: false } if token deletion fails', async () => {
    tokenService.verifyToken.mockResolvedValue({ userId, isValid: true })
    tokenRepository.find.mockResolvedValue({ token: validToken, userId, expiresAt: futureDate, type: 'EMAIL_VERIFICATION' })
    userRepository.update.mockResolvedValue(undefined)
    tokenRepository.delete.mockResolvedValue(false)

    const result = await useCase.execute(validToken)

    expect(result).toEqual({ success: false })
  })
})