import { UserRepository } from '@/domain/repositories/UserRepository'

type UserLoginUseCaseResponse = {
  success: boolean
  message?: string
}

enum ERRORS_MESSAGES {
  USER_NOT_FOUND = 'User not found',
  PASSWORD_INCORRECT = 'Incorrect user or password',
}

export class UserLoginUseCase {
  constructor(private userRepository: UserRepository) { }

  async execute(email: string, password: string): Promise<UserLoginUseCaseResponse> {
    const user = await this.userRepository.getUserByEmail(email)

    if (!user) return { success: false, message: ERRORS_MESSAGES.USER_NOT_FOUND }

    if (!user!.id) return { success: false, message: ERRORS_MESSAGES.USER_NOT_FOUND }

    const isPasswordValid = await this.userRepository.comparePassword(
      user.id,
      password
    )

    if (!isPasswordValid) return { success: false, message: ERRORS_MESSAGES.PASSWORD_INCORRECT }

    return { success: true, message: 'Logged in succesfully' }
  }
}
