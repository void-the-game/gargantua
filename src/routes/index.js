import { Router } from 'express'

import { user } from './user.js'

const router = Router()

const routes = { user }

for (const route in routes) {
  if (routes.hasOwnProperty(route)) {
    routes[route](router)
  }
}

export default router
