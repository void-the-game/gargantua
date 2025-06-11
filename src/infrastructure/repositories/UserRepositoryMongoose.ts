import { User } from '@/domain/entities/User'
import { UserRepository } from '@/domain/repositories/UserRepository'
import { UserModel } from '@/infrastructure/models/UserModel'
import { TokenModel } from '@/infrastructure/models/TokenModel'

export class UserRepositoryMongoose implements UserRepository {
  async getUserByEmail(email: string): Promise<User | null> {
    return await UserModel.findOne({ email })
  }

  async getUserByUserName(username: string): Promise<User | null> {
    return await UserModel.findOne({ username })
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

  async verifyEmail(userId: string, token: string): Promise<unknown> {
    if (!token) throw new Error('Token is required')

    const userToken = await TokenModel.findOne({ userId })
    if (!userToken) throw new Error('Token not found')

    if (userToken.token !== token) throw new Error('Invalid token')

    const emailVerified = await UserModel.updateOne({ _id: userId }, { verified: true }).exec()

    return emailVerified
  }
}
