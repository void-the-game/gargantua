import jwt from 'jsonwebtoken'
import { TokenService } from '@/domain/services/TokenService'

export class JwtTokenService implements TokenService {
  private secret: string

  constructor(secret: string) {
    if (!secret) throw new Error('JWT secret is required')
    this.secret = secret
  }

  async generateToken(userId: string, type: string): Promise<string> {
    if (!this.secret) throw new Error('Secret is required')
    return jwt.sign({ userId, type }, this.secret, {
      expiresIn: type === 'EMAIL_VERIFICATION' ? '7d' : '1h',
    })
  }

  async verifyToken(
    token: string
  ): Promise<{ userId: string; isValid: boolean }> {
    try {
      if (!this.secret) throw new Error('Secret is required')
      const decoded = jwt.verify(token, this.secret) as { userId: string }

      return { userId: decoded.userId, isValid: true }
    } catch {
      return { userId: '', isValid: false }
    }
  }
}
