export class Profile {
  id?: string
  userId!: string
  nickname?: string
  avatar?: string
  bio?: string
  pontos!: number
  nivel!: number
  taxaVitoria!: number
  ranking!: number
  partidasJogadas!: number

  constructor(data: Partial<Profile>) {
    Object.assign(this, data)
  }
}
