import { ProfileRepository } from '@/domain/repositories/ProfileRepository'

export class UpdateProfileUseCase {
  constructor(private profileRepository: ProfileRepository) {}

  async execute(userId: string, data: { nickname?: string; bio?: string }) {
    const profile = await this.profileRepository.update(userId, data)
    if (!profile) {
      throw new Error('NOT_FOUND')
    }
    return profile
  }
}
