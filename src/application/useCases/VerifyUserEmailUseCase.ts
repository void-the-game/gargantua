import { TokenRepository } from '@/domain/repositories/TokenRepository'
import { UserRepository } from '@/domain/repositories/UserRepository'
import { TokenService } from '@/domain/services/TokenService'

type VerifyEmailUseCaseResponse = {
  success: boolean
  message?: string
}

enum ERRORS_MESSAGES {
  INVALID_TOKEN = 'Invalid token',
  TOKEN_EXPIRED = 'Token is either expired or not found',
}

export class VerifyEmailUseCase {
  constructor(
    private tokenService: TokenService,
    private tokenRepository: TokenRepository,
    private userRepository: UserRepository
  ) { }

  async execute(token: string): Promise<VerifyEmailUseCaseResponse> {
    const { userId, isValid } = await this.tokenService.verifyToken(token)
    if (!isValid) return { success: false, message: ERRORS_MESSAGES.INVALID_TOKEN }

    const storedToken = await this.tokenRepository.find(token, userId)

    if (!storedToken || storedToken.expiresAt < new Date()) {
      return { success: false, message: ERRORS_MESSAGES.TOKEN_EXPIRED }
    }

    await this.userRepository.update(userId, { verified: true })

    const deletedToken = await this.tokenRepository.delete(storedToken.token)
    return { success: deletedToken }
  }
}
