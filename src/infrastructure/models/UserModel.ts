import mongoose, { Schema, Document } from 'mongoose'

interface IUser extends Document {
  username: string
  email: string
  password: string
  verified: boolean
}

const UserSchema = new Schema({
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

const UserModel = mongoose.model<IUser>('User', UserSchema)

export { UserModel, IUser }
