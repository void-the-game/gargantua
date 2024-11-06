import { User } from '../models/user.js'
import { Token } from '../models/token.js'
import { sendEmail } from '../utils/mailer.js'
import { nanoid } from 'nanoid'

export const userService = {
  getUser: ({ username }) => User.findOne({ username }),
  getUserByEmail: (email) => User.findOne({ email }),
  create: ({ email, username, password }) =>
    new User({
      email,
      username,
      password,
    }).save(),
  userExistsByEmail: (email) => User.exists({ email }),
  userExistsByUsername: (username) => User.exists({ username }),
  sendEmail: async (user) => {
    const token = await new Token({
      userId: user._id,
      token: nanoid(64),
    }).save()

    const message = `${process.env.BASE_URL}/user/verify/${user.username}/${token.token}`

    const emailSent = await sendEmail(user.email, 'Verify Email', message)

    return emailSent
  },
  verifyEmail: async ({ username, userToken }) => {
    const user = await User.findOne({ username })
    const token = await Token.findOne({
      userId: user._id,
      token: userToken,
    })

    if (!token && user.verified)
      return {
        success: false,
        error: {
          type: 'ALREADY_VERIFIED',
          message: 'User already verified',
        },
      }

    if (!token)
      return {
        success: false,
        error: { type: 'NO_TOKEN', message: 'No token found' },
      }

    try {
      await User.updateOne({ _id: user._id, verified: true })
      await Token.findByIdAndRemove(token._id)
    } catch (error) {
      console.error(error)
      return {
        success: false,
        error: {
          type: 'UNHANDLED_ERROR',
          message: error.message,
        },
      }
    }

    return { success: true, message: 'Email verified', error: null }
  },
}
