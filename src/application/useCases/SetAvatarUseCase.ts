import { ProfileRepository } from '@/domain/repositories/ProfileRepository'
import { AzureBlobService } from '@/infrastructure/services/AzureBlobService'

export class SetAvatarUseCase {
  constructor(
    private profileRepository: ProfileRepository,
    private blobService: AzureBlobService
  ) {}

  async execute(userId: string, avatarName: string) {
    const avatars = await this.blobService.listBlobs()
    const avatar = avatars.find((a) => a.name === avatarName)

    if (!avatar) {
      throw new Error('AVATAR_INVALID')
    }
    console.log(avatar)
    const profile = await this.profileRepository.update(userId, {
      avatar: avatar.url,
    })
    if (!profile) {
      throw new Error('NOT_FOUND')
    }

    return avatar.url
  }
}
