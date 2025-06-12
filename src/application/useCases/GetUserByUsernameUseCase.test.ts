import { UserRepository } from '@/domain/repositories/UserRepository';
import { GetUserByUsernameUseCase } from './GetUserByUsernameUseCase';
import { User } from '@/domain/entities/User'

describe('GetUserByUsernameUseCase', () => {
  let userRepository: jest.Mocked<UserRepository>;
  let useCase: GetUserByUsernameUseCase;

  beforeEach(() => {
    userRepository = {
      getUserByUserName: jest.fn(),
    } as any;
    useCase = new GetUserByUsernameUseCase(userRepository);
  });

  it('should throw an error if username is not provided', async () => {
    await expect(useCase.execute('')).rejects.toThrow('Username is required');
    await expect(useCase.execute(undefined as any)).rejects.toThrow('Username is required');
  });

  it('should throw an error if user is not found', async () => {
    userRepository.getUserByUserName.mockResolvedValue(null);

    await expect(useCase.execute('void')).rejects.toThrow('User not found');
  });

  it('should return the user if found', async () => {
    const mockUser = { id: '1', username: 'void', email: 'void123@email.com', password: '123' };
    userRepository.getUserByUserName.mockResolvedValue(mockUser);

    const result = await useCase.execute('void');
    expect(result).toBe(mockUser);
    expect(userRepository.getUserByUserName).toHaveBeenCalledWith('void');
  });
});