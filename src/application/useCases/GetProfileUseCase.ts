import { ProfileRepository } from '@/domain/repositories/ProfileRepository'

export class GetProfileUseCase {
  constructor(private profileRepository: ProfileRepository) {}

  async execute(userId: string) {
    const profile = await this.profileRepository.findByUserId(userId)
    if (!profile) {
      throw new Error('NOT_FOUND')
    }
    return profile
  }
}
