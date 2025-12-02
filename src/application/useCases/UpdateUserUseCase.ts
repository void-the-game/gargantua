import { User } from '@/domain/entities/User'
import { UserRepository } from '@/domain/repositories/UserRepository'
import { PasswordHasher } from '@/domain/services/PasswordHasher'

export class UpdateUserUseCase {
  constructor(
    private userRepository: UserRepository,
    private passwordHasher: PasswordHasher
  ) {}

  async execute(
    userId: string,
    data: { email?: string; username?: string; password?: string }
  ) {
    const userExists = await this.userRepository.getUserById(userId)

    if (!userExists) {
      throw new Error('User not found')
    }

    const updateData: Partial<User> = {}

    if (data.username && data.username !== userExists.username) {
      const usernameInUse = await this.userRepository.userExistsByUsername(
        data.username
      )
      if (usernameInUse) {
        throw new Error('Username already in use')
      }
      updateData.username = data.username
    }

    if (data.email && data.email !== userExists.email) {
      const emailInUse = await this.userRepository.userExistsByEmail(data.email)
      if (emailInUse) {
        throw new Error('Email already in use')
      }
      updateData.email = data.email
    }

    if (data.password) {
      updateData.password = await this.passwordHasher.hash(data.password)
    }

    const updatedUser = await this.userRepository.update(userId, updateData)

    if (!updatedUser) {
      throw new Error('Failed to update user')
    }

    return {
      success: true,
      message: 'User updated successfully',
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
      },
    }
  }
}
