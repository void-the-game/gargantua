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
      points: created.points,
      level: created.level,
      winRate: created.winRate,
      ranking: created.ranking,
      gamesPlayed: created.gamesPlayed,
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
      points: doc.points,
      level: doc.level,
      winRate: doc.winRate,
      ranking: doc.ranking,
      gamesPlayed: doc.gamesPlayed,
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
      points: updated.points,
      level: updated.level,
      winRate: updated.winRate,
      ranking: updated.ranking,
      gamesPlayed: updated.gamesPlayed,
    })
  }
}
