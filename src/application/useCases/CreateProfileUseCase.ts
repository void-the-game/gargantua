import { ProfileRepository } from '@/domain/repositories/ProfileRepository'
import { Profile } from '@/domain/entities/Profile'

export class CreateProfileUseCase {
  constructor(private profileRepository: ProfileRepository) {}

  async execute(userId: string, data: { nickname?: string; bio?: string }) {
    const existing = await this.profileRepository.findByUserId(userId)
    if (existing) {
      throw new Error('PROFILE_EXISTS')
    }

    const profile = new Profile({
      userId,
      nickname: data.nickname,
      bio: data.bio,
      points: 0,
      level: 1,
      winRate: 0,
      ranking: 0,
      gamesPlayed: 0,
    })

    return this.profileRepository.create(profile)
  }
}
