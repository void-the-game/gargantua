import { Token } from '@/domain/entities/Token'
import { Types } from 'mongoose'

export interface TokenRepository {
  create(token: Token): Promise<void>
  find(token: string, userId: string): Promise<Token | null>
  delete(tokenId: string): Promise<void>
  deleteAllForUser(userId: Types.ObjectId, type: string): Promise<void>
}
