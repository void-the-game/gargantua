import { createUser, getUser, verifyUserEmail } from '../controllers/userController.js'

export const user = (router) => {
  router.post('/user/create', createUser)
  router.get('/user/:username', getUser)
  router.get('/user/:username/:token', verifyUserEmail)
}