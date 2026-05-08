import { UserRepository } from '@/domain/repositories/UserRepository'

export class DeleteUserUseCase {
  constructor(private userRepository: UserRepository) {}

  async execute(userId: string) {
    const userExists = await this.userRepository.getUserById(userId)

    if (!userExists) {
      throw new Error('User not found')
    }

    await this.userRepository.delete(userId)

    return {
      success: true,
      message: 'User deleted successfully',
    }
  }
}
