import mongoose from 'mongoose'

const Schema = mongoose.Schema

const tokenSchema = new mongoose.Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'users',
    required: true,
  },
  token: {
    type: String,
    required: true
  }
})

export const Token = mongoose.model('Token', tokenSchema)
