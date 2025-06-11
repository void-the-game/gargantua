export interface TokenService {
  generateToken(userId: string, type: string): Promise<string>
  verifyToken(token: string): Promise<{ userId: string; isValid: boolean }>
}
