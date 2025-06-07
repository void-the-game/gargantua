import { User } from '@/domain/entities/User'

export interface UserRepository {
  getUser(username: string): Promise<User | null>
  getUserByEmail(email: string): Promise<User | null>
  getUserByUserName(username: string): Promise<User | null>
  create(user: User): Promise<User>
  userExistsByEmail(email: string): Promise<unknown>
  userExistsByUsername(username: string): Promise<unknown>
  update(userId: string, data: Partial<User>): Promise<void>
  comparePassword(userId: string, plainPassword: string): Promise<boolean>
}
