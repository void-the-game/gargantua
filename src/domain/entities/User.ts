export class User {
  id?: string
  email: string
  username: string
  password: string
  verified?: boolean

  constructor(username: string, email: string, password: string) {
    this.username = username
    this.email = email
    this.password = password
  }
}
