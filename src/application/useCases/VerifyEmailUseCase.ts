import { TokenRepository } from '@/domain/repositories/TokenRepository'
import { UserRepository } from '@/domain/repositories/UserRepository'
import { TokenService } from '@/domain/services/TokenService'

export class VerifyEmailUseCase {
  constructor(
    private tokenService: TokenService,
    private tokenRepository: TokenRepository,
    private userRepository: UserRepository
  ) { }

  async execute(token: string) {
    const { userId, isValid } = await this.tokenService.verifyToken(token)
    if (!isValid) throw new Error('Invalid token')

    const storedToken = await this.tokenRepository.find(token, userId)

    if (!storedToken || storedToken.expiresAt < new Date()) {
      throw new Error('Token is either expired or not found')
    }

    await this.userRepository.update(userId, { verified: true })

    await this.tokenRepository.delete(storedToken.token)
  }
}
