import { ProfileRepository } from '@/domain/repositories/ProfileRepository'
import { AzureBlobService } from '@/infrastructure/services/AzureBlobService'

export class SetAvatarUseCase {
  constructor(
    private profileRepository: ProfileRepository,
    private blobService: AzureBlobService
  ) {}

  async execute(userId: string, avatarName: string) {
    const exists = await this.blobService.blobExists(avatarName)
    if (!exists) {
      throw new Error('AVATAR_INVALID')
    }
    const avatarUrl = await this.blobService.getBlobUrl(avatarName)
    const profile = await this.profileRepository.update(userId, {
      avatar: avatarUrl,
    })

    if (!profile) {
      throw new Error('NOT_FOUND')
    }
    return avatarUrl
  }
}
