import { Router } from 'express'

import { userRoutes } from './user'

const router = Router()

const routes = (routerInstance: Router) => {
  userRoutes(routerInstance)
}

routes(router)

export default router
