import { User } from '@/domain/entities/User'

export interface UserRepository {
  getUserByEmail(email: string): Promise<User | null>
  getUserByUserName(username: string): Promise<User | null>
  create(user: User): Promise<User>
  userExistsByEmail(email: string): Promise<unknown>
  userExistsByUsername(username: string): Promise<unknown>
  update(userId: string, data: Partial<User>): Promise<void>
  verifyEmail(userId: string, token: string): Promise<unknown>
}
