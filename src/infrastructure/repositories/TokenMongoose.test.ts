import { TokenMongoose } from './TokenMongoose'
import { TokenModel } from '@/infrastructure/models/TokenModel'
import { Token } from '@/domain/entities/Token'

jest.mock('@/infrastructure/models/TokenModel')

describe('TokenMongoose.find', () => {
  const tokenMongoose = new TokenMongoose()
  const mockToken = 'sometoken'
  const mockUserId = 'user123'
  const mockExpiresAt = new Date()
  const mockType = 'access'

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should return a Token instance when found', async () => {
    const tokenFound = {
      userId: mockUserId,
      token: mockToken,
      expiresAt: mockExpiresAt,
      type: mockType,
    }
    ;(TokenModel.findOne as jest.Mock).mockResolvedValue(tokenFound)

    const result = await tokenMongoose.find(mockToken, mockUserId)

    expect(TokenModel.findOne).toHaveBeenCalledWith({ token: mockToken, userId: mockUserId })
    expect(result).toBeInstanceOf(Token)
    expect(result).toMatchObject({
      userId: mockUserId,
      token: mockToken,
      expiresAt: mockExpiresAt,
      type: mockType,
    })
  })

  it('should return null when not found', async () => {
    ;(TokenModel.findOne as jest.Mock).mockResolvedValue(null)

    const result = await tokenMongoose.find(mockToken, mockUserId)

    expect(TokenModel.findOne).toHaveBeenCalledWith({ token: mockToken, userId: mockUserId })
    expect(result).toBeNull()
  })
})