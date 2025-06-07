import { Types } from 'mongoose'

export class Token {
  constructor(
    public readonly userId: string,
    public readonly token: string,
    public readonly expiresAt: Date,
    public readonly type: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET'
  ) {}
}
