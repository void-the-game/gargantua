import { Router } from 'express'
import { RoomController } from '@/presentation/controllers/RoomController'

export const roomRoutes = (router: Router) => {
  const roomController = new RoomController()

  router.get('/rooms', async (req, res, next) => {
    try {
      await roomController.listRooms(req, res)
    } catch (error) {
      next(error)
    }
  })

  router.get('/rooms/:code', async (req, res, next) => {
    try {
      await roomController.getRoom(req, res)
    } catch (error) {
      next(error)
    }
  })
}
