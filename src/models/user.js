import mongoose from 'mongoose'
import { compareSync } from 'bcrypt'

const Schema = mongoose.Schema

const userSchema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  verified: {
    type: Boolean,
    default: false,
  },
})

userSchema.methods.comparePassword = function (password) {
  return compareSync(password, this.password)
}

export const User = mongoose.model('User', userSchema)
