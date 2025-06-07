import jwt from 'jsonwebtoken'
import { TokenService } from '@/domain/services/TokenService'

export class JwtTokenService implements TokenService {
  constructor(private readonly secret: string) {}

  async generateToken(userId: string, type: string): Promise<string> {
    return jwt.sign({ userId, type }, this.secret, {
      expiresIn: type === 'EMAIL_VERIFICATION' ? '7d' : '1h',
    })
  }

  async verifyToken(
    token: string
  ): Promise<{ userId: string; isValid: boolean }> {
    try {
      const decoded = jwt.verify(token, this.secret) as { userId: string }
      return { userId: decoded.userId, isValid: true }
    } catch {
      return { userId: '', isValid: false }
    }
  }
}
