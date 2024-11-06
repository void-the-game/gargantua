import { userService } from '../services/userService.js'
import validator from 'validator'
import { createHash } from '../utils/hash.js'
import jwt from 'jsonwebtoken'

export const getUser = async (req, res) => {
  const { username } = req.params
  const user = await userService.getUser({ username })

  if (!user) return res.status(404).json({ message: 'User not found' })

  return res.status(200).json(user)
}

export const createUser = async (req, res) => {
  const { username, email, password } = req.body

  if (!username || !email || !password)
    return res
      .status(400)
      .json({ message: 'All fields are required', success: false })

  const hasUserByUsername = await userService.userExistsByUsername(username)
  const hasUserByEmail = await userService.userExistsByEmail(email)

  const userExists = hasUserByUsername || hasUserByEmail

  if (userExists) {
    return res.status(422).json({
      success: true,
      message: 'User already exists',
    })
  }

  const isValidEmail = validator.isEmail(email)

  if (!isValidEmail)
    return res.status(422).json({
      success: false,
      message: 'Type a valid email address',
    })

  const attendPasswordRequirements = validator.isStrongPassword(password)

  if (!attendPasswordRequirements)
    return res.status(422).json({
      success: false,
      message: 'Password does not meet the requirements',
    })

  const hashedPassword = await createHash(password)

  const user = await userService.create({
    username,
    email,
    password: hashedPassword,
  })

  if (!user._id)
    return res.status(400).json({
      success: false,
      message: 'An error occurred',
    })

  const emailSent = await userService.sendEmail(user)

  if (!emailSent.success)
    return res.status(400).json({
      success: false,
      message: emailSent.message,
    })

  return res.status(201).json({
    success: true,
    message: `Created! ${emailSent.message}`,
  })
}

export const verifyUserEmail = async (req, res) => {
  const { username, token } = req.params

  if (!username || !token)
    return res.status(400).json({
      success: false,
      message: 'Invalid link. Cannot verify user email address',
    })

  const emailVerified = await userService.verifyEmail({
    username,
    userToken: token,
  })

  if (!emailVerified.success) return res.status(400).json(emailVerified)

  return res.status(200).json({ success: true, message: 'Email verified' })
}

export const userLogin = async (req, res) => {
  const { email, password } = req.body

  if (!email || !password)
    return res.status(400).json({
      success: false,
      message: 'All fields are required',
    })

  const user = await userService.getUserByEmail(email)

  const isPasswordCorrect = await user?.comparePassword(password)

  if (!user || !isPasswordCorrect) {
    return res.status(400).json({
      success: false,
      message: 'Incorrect user or password',
    })
  }

  const accessToken = jwt.sign(
    {
      id: user._id,
    },
    'secret',
    { expiresIn: '1h' }
  )

  return res.status(200).json({
    success: true,
    message: 'Logged in succesfully',
    accessToken,
    username: user.username,
  })
}
