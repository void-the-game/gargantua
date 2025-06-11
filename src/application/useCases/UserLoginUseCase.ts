import { UserRepository } from '@/domain/repositories/UserRepository'
import { PasswordHasher } from '@/domain/services/PasswordHasher'
import { JwtTokenService } from '@/infrastructure/services/JwtTokenService'

type UserLoginUseCaseResponse = {
  accessToken?: string
  message?: string
  success: boolean
  username?: string
}

enum ERRORS_MESSAGES {
  USER_NOT_FOUND = 'User not found',
  PASSWORD_INCORRECT = 'Incorrect user or password',
}

export class UserLoginUseCase {
  constructor(
    private userRepository: UserRepository, 
    private passwordHasher: PasswordHasher,
    private jwtTokenService: JwtTokenService
) { }

  async execute(email: string, password: string): Promise<UserLoginUseCaseResponse> {
    const user = await this.userRepository.getUserByEmail(email)

    if (!user) return { success: false, message: ERRORS_MESSAGES.USER_NOT_FOUND }

    if (!user!.id) return { success: false, message: ERRORS_MESSAGES.USER_NOT_FOUND }

    const isPasswordValid = await this.passwordHasher.compare(
      password,
      user.password
    )

    if (!isPasswordValid) return { success: false, message: ERRORS_MESSAGES.PASSWORD_INCORRECT }

    const username = user.username
    const userId = user.id
    const userAccessToken = await this.jwtTokenService.generateToken(userId, 'ACCESS')

    return { success: true, username, message: 'Logged in successfully', accessToken: userAccessToken }
  }
}
