import { Router } from 'express'

import { userRoutes } from './user'
import { profileRoutes } from './profile'

const router = Router()

const routes = (routerInstance: Router) => {
  userRoutes(routerInstance)
  profileRoutes(routerInstance)
}

routes(router)

export default router
