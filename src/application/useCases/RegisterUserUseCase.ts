import { Token } from '@/domain/entities/Token'
import { User } from '@/domain/entities/User'
import { TokenRepository } from '@/domain/repositories/TokenRepository'
import { UserRepository } from '@/domain/repositories/UserRepository'
import { EmailService } from '@/domain/services/EmailService'
import { PasswordHasher } from '@/domain/services/PasswordHasher'
import { TokenService } from '@/domain/services/TokenService'

export class RegisterUserUseCase {
  constructor(
    private userRepository: UserRepository,
    private passwordHasher: PasswordHasher,
    private emailService: EmailService,
    private tokenService: TokenService,
    private tokenRepository: TokenRepository
  ) { }

  async execute(email: string, username: string, password: string) {
    const [userByUsername, userByEmail] = await Promise.all([
      this.userRepository.userExistsByUsername(username),
      this.userRepository.userExistsByEmail(email),
    ])

    if (userByUsername || userByEmail) {
      throw new Error('User already exists')
    }

    const hashedPassword = await this.passwordHasher.hash(password)

    const user = new User(username, email, hashedPassword)

    const createdUser = await this.userRepository.create(user)

    if (!createdUser.id) {
      throw new Error('An error occured while creating user')
    }

    const token = await this.tokenService.generateToken(
      createdUser.id,
      'EMAIL_VERIFICATION'
    )
    const expiration = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 dias
    await this.tokenRepository.create(
      new Token(createdUser.id, token, expiration, 'EMAIL_VERIFICATION')
    )

    await this.emailService.sendConfirmationEmail(createdUser.email, token)

    return {
      success: true,
      message: 'User created successfully',
    }
  }
}
