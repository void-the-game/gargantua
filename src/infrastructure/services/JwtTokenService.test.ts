import { JwtTokenService } from './JwtTokenService'
import * as jwt from 'jsonwebtoken'

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn() as jest.Mock<string, any>,
  verify: jest.fn(),
}))

const mockedJwt = jwt as jest.Mocked<typeof jwt>

describe('JwtTokenService', () => {
  const secret = 'test_secret'
  const userId = 'xpto-da-silva'
  const type = 'EMAIL_VERIFICATION'
  let service: JwtTokenService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new JwtTokenService(secret)
  })

  describe('constructor', () => {
    it('should throw an error if secret is not provided', () => {
      expect(() => new JwtTokenService('')).toThrow('JWT secret is required')
    })

    it('should set the secret', () => {
      expect((service as any).secret).toBe(secret)
    })
  })

  describe('generateToken', () => {
    it('should call jwt.sign with correct params for EMAIL_VERIFICATION', async () => {
      (mockedJwt.sign as jest.Mock).mockReturnValue('signed_token')
      const token = await service.generateToken(userId, 'EMAIL_VERIFICATION')
      expect(mockedJwt.sign).toHaveBeenCalledWith(
        { userId, type: 'EMAIL_VERIFICATION' },
        secret,
        { expiresIn: '7d' }
      )
      expect(token).toBe('signed_token')
    })

    it('should call jwt.sign with correct params for other types', async () => {
      (mockedJwt.sign as jest.Mock).mockReturnValue('signed_token')
      const token = await service.generateToken(userId, 'ACCESS')
      expect(mockedJwt.sign).toHaveBeenCalledWith(
        { userId, type: 'ACCESS' },
        secret,
        { expiresIn: '1h' }
      )
      expect(token).toBe('signed_token')
    })
  })

  describe('verifyToken', () => {
    it('should return userId and isValid true for valid token', async () => {
      (mockedJwt.verify as jest.Mock).mockReturnValue({ userId })
      const result = await service.verifyToken('valid_token')
      expect(mockedJwt.verify).toHaveBeenCalledWith('valid_token', secret)
      expect(result).toEqual({ userId, isValid: true })
    })

    it('should return isValid false for invalid token', async () => {
      mockedJwt.verify.mockImplementation(() => { throw new Error('invalid') })
      const result = await service.verifyToken('invalid_token')
      expect(result).toEqual({ userId: '', isValid: false })
    })
  })
})