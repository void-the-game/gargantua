import { BcryptPasswordHasher } from './BcryptPasswordHasher'

describe('BcryptPasswordHasher', () => {
  const passwordHasher = new BcryptPasswordHasher()
  const password = 'mySecretPassword123!'

  it('should hash a password', async () => {
    const hash = await passwordHasher.hash(password)
    expect(typeof hash).toBe('string')
    expect(hash).not.toBe(password)
    expect(hash.length).toBeGreaterThan(0)
  })

  it('should compare a correct password with its hash and return true', async () => {
    const hash = await passwordHasher.hash(password)
    const result = await passwordHasher.compare(password, hash)
    expect(result).toBe(true)
  })

  it('should compare an incorrect password with a hash and return false', async () => {
    const hash = await passwordHasher.hash(password)
    const result = await passwordHasher.compare('wrongPassword', hash)
    expect(result).toBe(false)
  })
})