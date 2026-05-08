import mongoose, { Schema, Document } from 'mongoose'

interface IProfile extends Document {
  userId: mongoose.Types.ObjectId
  nickname?: string
  avatar?: string
  bio?: string
  points: number
  level: number
  winRate: number
  ranking: number
  gamesPlayed: number
}

const ProfileSchema = new Schema<IProfile>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  nickname: { type: String, default: '' },
  avatar: { type: String, default: '' },
  bio: { type: String, default: '' },
  points: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  winRate: { type: Number, default: 0 },
  ranking: { type: Number, default: 0 },
  gamesPlayed: { type: Number, default: 0 },
})

ProfileSchema.index({ ranking: 1 })
ProfileSchema.index({ points: -1 })

export const ProfileModel = mongoose.model<IProfile>('Profile', ProfileSchema)
