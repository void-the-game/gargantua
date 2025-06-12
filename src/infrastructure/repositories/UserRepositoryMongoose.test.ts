import { UserRepositoryMongoose } from './UserRepositoryMongoose'
import { UserModel } from '@/infrastructure/models/UserModel'
import { TokenModel } from '@/infrastructure/models/TokenModel'
import { User } from '@/domain/entities/User'

jest.mock('@/infrastructure/models/UserModel')
jest.mock('@/infrastructure/models/TokenModel')

describe('UserRepositoryMongoose', () => {
  let repo: UserRepositoryMongoose

  beforeEach(() => {
    repo = new UserRepositoryMongoose()
    jest.clearAllMocks()
  })

  it('should return user when found by email', async () => {
    const user = { email: 'test@example.com' }
      ; (UserModel.findOne as jest.Mock).mockResolvedValue(user)
    const result = await repo.getUserByEmail('test@example.com')
    expect(UserModel.findOne).toHaveBeenCalledWith({ email: 'test@example.com' })
    expect(result).toBe(user)
  })


  it('should return user when found by username', async () => {
    const user = { username: 'testuser' }
      ; (UserModel.findOne as jest.Mock).mockResolvedValue(user)
    const result = await repo.getUserByUserName('testuser')
    expect(UserModel.findOne).toHaveBeenCalledWith({ username: 'testuser' })
    expect(result).toBe(user)
  })



  it('should create and return a new user', async () => {
    const user = { username: 'newuser', email: 'new@example.com' } as User
    const saveMock = jest.fn().mockResolvedValue(undefined)
      ; (UserModel as unknown as jest.Mock).mockImplementation(() => ({
        save: saveMock,
        ...user,
      }))
    const result = await repo.create(user)
    expect(saveMock).toHaveBeenCalled()
    expect(result).toMatchObject(user)
  })


  it('should return result of UserModel.exists by email', async () => {
    ; (UserModel.exists as jest.Mock).mockResolvedValue(true)
    const result = await repo.userExistsByEmail('test@example.com')
    expect(UserModel.exists).toHaveBeenCalledWith({ email: 'test@example.com' })
    expect(result).toBe(true)
  })

  it('should return result of UserModel.exists by username', async () => {
    ; (UserModel.exists as jest.Mock).mockResolvedValue(false)
    const result = await repo.userExistsByUsername('testuser')
    expect(UserModel.exists).toHaveBeenCalledWith({ username: 'testuser' })
    expect(result).toBe(false)
  })

  it('should call updateOne with correct params', async () => {
    const execMock = jest.fn().mockResolvedValue(undefined)
      ; (UserModel.updateOne as jest.Mock).mockReturnValue({ exec: execMock })
    await repo.update('userId', { username: 'updated' })
    expect(UserModel.updateOne).toHaveBeenCalledWith({ _id: 'userId' }, { username: 'updated' })
    expect(execMock).toHaveBeenCalled()
  })

  it('should throw an error if token is not provided', async () => {
    await expect(repo.verifyEmail('userId', '')).rejects.toThrow('Token is required')
  })

  it('should throw if token is not found', async () => {
    ; (TokenModel.findOne as jest.Mock).mockResolvedValue(null)
    await expect(repo.verifyEmail('userId', 'sometoken')).rejects.toThrow('Token not found')
  })

  it('should throw if token does not match', async () => {
    ; (TokenModel.findOne as jest.Mock).mockResolvedValue({ token: 'othertoken' })
    await expect(repo.verifyEmail('userId', 'sometoken')).rejects.toThrow('Invalid token')
  })

  it('should update user as verified if token matches', async () => {
    ; (TokenModel.findOne as jest.Mock).mockResolvedValue({ token: 'validtoken' })
    const execMock = jest.fn().mockResolvedValue({ nModified: 1 })
      ; (UserModel.updateOne as jest.Mock).mockReturnValue({ exec: execMock })
    const result = await repo.verifyEmail('userId', 'validtoken')
    expect(TokenModel.findOne).toHaveBeenCalledWith({ userId: 'userId' })
    expect(UserModel.updateOne).toHaveBeenCalledWith({ _id: 'userId' }, { verified: true })
    expect(execMock).toHaveBeenCalled()
    expect(result).toEqual({ nModified: 1 })
  })
})