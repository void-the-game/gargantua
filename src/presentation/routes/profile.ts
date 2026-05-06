import { Router, Request, Response, NextFunction } from 'express'
import { ProfileController } from '@/presentation/controllers/ProfileController'
import { authMiddleware } from '@/presentation/middlewares/authMiddleware'

export const profileRoutes = (router: Router) => {
  const profileController = new ProfileController()

  router.get(
    '/profile/avatars',
    authMiddleware,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        await profileController.listAvatars(req, res)
      } catch (error) {
        next(error)
      }
    }
  )

  router.get(
    '/profile/ranking',
    authMiddleware,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        await profileController.getRanking(req, res)
      } catch (error) {
        next(error)
      }
    }
  )

  router.post(
    '/profile',
    authMiddleware,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        await profileController.createProfile(req, res)
      } catch (error) {
        next(error)
      }
    }
  )

  router.get(
    '/profile/:userId',
    authMiddleware,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        await profileController.getProfile(req, res)
      } catch (error) {
        next(error)
      }
    }
  )

  router.patch(
    '/profile/:userId',
    authMiddleware,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        await profileController.updateProfile(req, res)
      } catch (error) {
        next(error)
      }
    }
  )

  router.patch(
    '/profile/:userId/avatar',
    authMiddleware,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        await profileController.setAvatar(req, res)
      } catch (error) {
        next(error)
      }
    }
  )
}
