import { hash } from 'bcrypt'

export const createHash = async (string) => hash(string, 10)
