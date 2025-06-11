import { UserRepository } from '@/domain/repositories/UserRepository';

export class GetUserByUsernameUseCase {
  constructor(private userRepository: UserRepository) {}

  async execute(username: string) {
    if (!username) {
      throw new Error('Username is required');
    }

    const user = await this.userRepository.getUserByUserName(username);

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }
}