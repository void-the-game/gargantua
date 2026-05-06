import { ProfileRepository } from '@/domain/repositories/ProfileRepository'
import { Profile } from '@/domain/entities/Profile'
import { ProfileModel } from '@/infrastructure/models/ProfileModel'

export class ProfileRepositoryMongoose implements ProfileRepository {
  async create(profile: Profile): Promise<Profile> {
    const created = await ProfileModel.create(profile)
    return new Profile({
      id: created._id.toString(),
      userId: created.userId.toString(),
      nickname: created.nickname || '',
      avatar: created.avatar || '',
      bio: created.bio || '',
      pontos: created.pontos,
      nivel: created.nivel,
      taxaVitoria: created.taxaVitoria,
      ranking: created.ranking,
      partidasJogadas: created.partidasJogadas,
    })
  }

  async findByUserId(userId: string): Promise<any> {
    const doc = await ProfileModel.findOne({ userId }).populate(
      'userId',
      'username email'
    )
    if (!doc) return null
    return {
      id: doc._id.toString(),
      user: doc.userId,
      nickname: doc.nickname || '',
      avatar: doc.avatar || '',
      bio: doc.bio || '',
      pontos: doc.pontos,
      nivel: doc.nivel,
      taxaVitoria: doc.taxaVitoria,
      ranking: doc.ranking,
      partidasJogadas: doc.partidasJogadas,
    }
  }

  async update(
    userId: string,
    data: Partial<Profile>
  ): Promise<Profile | null> {
    const updated = await ProfileModel.findOneAndUpdate(
      { userId },
      { $set: data },
      { new: true }
    )
    if (!updated) return null
    return new Profile({
      id: updated._id.toString(),
      userId: updated.userId.toString(),
      nickname: updated.nickname || '',
      avatar: updated.avatar || '',
      bio: updated.bio || '',
      pontos: updated.pontos,
      nivel: updated.nivel,
      taxaVitoria: updated.taxaVitoria,
      ranking: updated.ranking,
      partidasJogadas: updated.partidasJogadas,
    })
  }
}
