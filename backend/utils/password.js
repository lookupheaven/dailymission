import { pbkdf2Sync, randomBytes } from 'crypto'

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const hash = pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':')
  const test = pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex')
  return hash === test
}
