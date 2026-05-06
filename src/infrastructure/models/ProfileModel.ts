import mongoose, { Schema, Document } from 'mongoose'

interface IProfile extends Document {
  userId: mongoose.Types.ObjectId
  nickname?: string
  avatar?: string
  bio?: string
  pontos: number
  nivel: number
  taxaVitoria: number
  ranking: number
  partidasJogadas: number
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
  pontos: { type: Number, default: 0 },
  nivel: { type: Number, default: 1 },
  taxaVitoria: { type: Number, default: 0 },
  ranking: { type: Number, default: 0 },
  partidasJogadas: { type: Number, default: 0 },
})

ProfileSchema.index({ ranking: 1 })
ProfileSchema.index({ pontos: -1 })

export const ProfileModel = mongoose.model<IProfile>('Profile', ProfileSchema)
