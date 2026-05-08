export class Profile {
  id?: string
  userId!: string
  nickname?: string
  avatar?: string
  bio?: string
  points!: number
  level!: number
  winRate!: number
  ranking!: number
  gamesPlayed!: number

  constructor(data: Partial<Profile>) {
    Object.assign(this, data)
  }
}
