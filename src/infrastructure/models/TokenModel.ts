import mongoose, { Schema, Document, Types } from 'mongoose'

interface IToken extends Document {
  userId: string
  token: string
  expiresAt: Date
  type: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET'
}

const TokenSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'users',
    required: true,
  },
  token: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  type: {
    type: String,
    required: true,
  },
})

const TokenModel = mongoose.model<IToken>('Token', TokenSchema)

export { TokenModel, IToken }
