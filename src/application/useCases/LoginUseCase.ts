import { UserRepository } from '@/domain/repositories/UserRepository'

export class LoginUseCase {
  constructor(private userRepository: UserRepository) {}

  async execute(email: string, password: string) {
    const user = await this.userRepository.getUserByEmail(email)

    if (!user) throw new Error('User not found')

    if (!user.id) return

    const isPasswordValid = await this.userRepository.comparePassword(
      user.id,
      password
    )

    return isPasswordValid
  }
}
