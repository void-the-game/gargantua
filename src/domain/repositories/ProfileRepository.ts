import { Profile } from '@/domain/entities/Profile'

export interface ProfileRepository {
  create(profile: Profile): Promise<Profile>
  findByUserId(userId: string): Promise<any>
  update(userId: string, data: Partial<Profile>): Promise<Profile | null>
}
