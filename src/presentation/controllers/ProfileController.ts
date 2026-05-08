import { Request, Response } from 'express'
import { ProfileRepositoryMongoose } from '@/infrastructure/repositories/ProfileRepositoryMongoose'
import { AzureBlobService } from '@/infrastructure/services/AzureBlobService'
import { CreateProfileUseCase } from '@/application/useCases/CreateProfileUseCase'
import { GetProfileUseCase } from '@/application/useCases/GetProfileUseCase'
import { UpdateProfileUseCase } from '@/application/useCases/UpdateProfileUseCase'
import { ListAvatarsUseCase } from '@/application/useCases/ListAvatarsUseCase'
import { SetAvatarUseCase } from '@/application/useCases/SetAvatarUseCase'

export class ProfileController {
  private createProfileUseCase: CreateProfileUseCase
  private getProfileUseCase: GetProfileUseCase
  private updateProfileUseCase: UpdateProfileUseCase
  private listAvatarsUseCase: ListAvatarsUseCase
  private setAvatarUseCase: SetAvatarUseCase

  constructor() {
    const profileRepository = new ProfileRepositoryMongoose()
    const blobService = new AzureBlobService()

    this.createProfileUseCase = new CreateProfileUseCase(profileRepository)
    this.getProfileUseCase = new GetProfileUseCase(profileRepository)
    this.updateProfileUseCase = new UpdateProfileUseCase(profileRepository)
    this.listAvatarsUseCase = new ListAvatarsUseCase(blobService)
    this.setAvatarUseCase = new SetAvatarUseCase(profileRepository, blobService)
  }

  createProfile = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id
      const { nickname, bio } = req.body

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' })
      }

      const profile = await this.createProfileUseCase.execute(userId, {
        nickname,
        bio,
      })
      return res.status(201).json({ success: true, profile })
    } catch (error: any) {
      if (error.message === 'PROFILE_EXISTS') {
        return res.status(409).json({
          success: false,
          message: 'Profile already exists for this user',
        })
      }
      return res.status(500).json({ success: false, message: error.message })
    }
  }

  getProfile = async (req: Request, res: Response) => {
    try {
      const { userId } = req.params
      const profile = await this.getProfileUseCase.execute(userId)
      return res.status(200).json({ success: true, profile })
    } catch (error: any) {
      if (error.message === 'NOT_FOUND') {
        return res
          .status(404)
          .json({ success: false, message: 'Profile not found' })
      }
      return res.status(500).json({ success: false, message: error.message })
    }
  }

  updateProfile = async (req: Request, res: Response) => {
    try {
      const loggedInUserId = (req as any).user?.id
      const { userId } = req.params
      const { nickname, bio } = req.body

      if (!loggedInUserId || loggedInUserId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden to edit another user profile',
        })
      }

      const profile = await this.updateProfileUseCase.execute(userId, {
        nickname,
        bio,
      })
      return res.status(200).json({ success: true, profile })
    } catch (error: any) {
      if (error.message === 'NOT_FOUND') {
        return res
          .status(404)
          .json({ success: false, message: 'Profile not found' })
      }
      return res.status(500).json({ success: false, message: error.message })
    }
  }

  listAvatars = async (req: Request, res: Response) => {
    try {
      const avatars = await this.listAvatarsUseCase.execute()
      return res.status(200).json({ success: true, avatars })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message })
    }
  }

  setAvatar = async (req: Request, res: Response) => {
    try {
      const loggedInUserId = (req as any).user?.id
      const { userId } = req.params
      const { avatarName } = req.body

      if (!loggedInUserId || loggedInUserId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden to edit another user profile',
        })
      }

      if (!avatarName) {
        return res
          .status(400)
          .json({ success: false, message: 'Avatar name is required' })
      }

      const avatarUrl = await this.setAvatarUseCase.execute(userId, avatarName)
      return res.status(200).json({ success: true, avatarUrl })
    } catch (error: any) {
      if (error.message === 'AVATAR_INVALID') {
        return res
          .status(400)
          .json({ success: false, message: 'Invalid avatar name' })
      }
      if (error.message === 'NOT_FOUND') {
        return res
          .status(404)
          .json({ success: false, message: 'Profile not found' })
      }
      return res.status(500).json({ success: false, message: error.message })
    }
  }

  getRanking = async (req: Request, res: Response) => {
    // Placeholder returning empty array for now
    return res.status(200).json({ success: true, ranking: [] })
  }
}
