import { Router } from 'express'

import { userRoutes } from './user'
import { profileRoutes } from './profile'
import { roomRoutes } from './room'

const router = Router()

const routes = (routerInstance: Router) => {
  userRoutes(routerInstance)
  profileRoutes(routerInstance)
  roomRoutes(routerInstance)
}

routes(router)

export default router
