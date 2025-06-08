import { Router, Request, Response } from 'express'
import { UserController } from '@/presentation/controllers/UserController'

export const userRoutes = (router: Router) => {
  const userController = new UserController()

  router.post('/user/create', async (req, res, next) => {
    try {
      await userController.createUser(req, res)
    } catch (error) {
      next(error)
    }
  })

  router.get('/user/:username', async (req: Request, res: Response, next) => {
    try {
      await userController.getUserByUsername(req, res)
    } catch (error) {
      next(error)
    }
  })

  router.get('/user/verify/:token', async (req: Request, res: Response, next) => {
    try {
      await userController.verifyUserEmail(req, res)
    } catch (error) {
      next(error)
    }
  })

  router.post('/user/login', async (req: Request, res: Response, next) => {
    try {
      await userController.loginUser(req, res)
    } catch (error) {
      next(error)
    }
  })
}
