import { User } from '@/domain/entities/User'
import { UserRepository } from '@/domain/repositories/UserRepository'
import { UserModel } from '@/infrastructure/models/UserModel'
import { compareSync } from 'bcrypt'

export class UserRepositoryMongoose implements UserRepository {
  async getUser(username: string): Promise<User | null> {
    return await UserModel.findOne({ username })
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return await UserModel.findOne({ email })
  }

  async create(user: User): Promise<User> {
    const newUser = new UserModel(user)
    await newUser.save()
    return newUser
  }

  async userExistsByEmail(email: string): Promise<unknown> {
    return await UserModel.exists({ email })
  }

  async userExistsByUsername(username: string): Promise<unknown> {
    return await UserModel.exists({ username })
  }

  async update(userId: string, data: Partial<User>): Promise<void> {
    await UserModel.updateOne({ _id: userId }, data).exec()
  }

  async comparePassword(
    userId: string,
    plainPassword: string
  ): Promise<boolean> {
    const user = await UserModel.findById(userId)
    if (!user) throw new Error('User not found')
    return compareSync(plainPassword, user.password)
  }
}
