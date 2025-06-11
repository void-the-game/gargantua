import { Token } from '@/domain/entities/Token'
import { TokenRepository } from '@/domain/repositories/TokenRepository'
import { TokenModel } from '@/infrastructure/models/TokenModel'
import { Types } from 'mongoose'

export class TokenMongoose implements TokenRepository {
  async create(token: Token): Promise<void> {
    await TokenModel.create({
      userId: token.userId,
      token: token.token,
      expiresAt: token.expiresAt,
      type: token.type,
    })
  }

  async find(token: string, userId: string): Promise<Token | null> {
    const found = await TokenModel.findOne({ token, userId })
    return found
      ? new Token(found.userId, found.token, found.expiresAt, found.type)
      : null
  }

  async delete(tokenId: string): Promise<boolean> {
    const deleteToken = await TokenModel.deleteOne({ token: tokenId })

    return deleteToken.deletedCount > 0
  }
  deleteAllForUser(userId: Types.ObjectId, type: string): Promise<void> {
    throw new Error('Method not implemented.')
  }
}
