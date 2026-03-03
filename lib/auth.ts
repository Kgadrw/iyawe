import bcrypt from 'bcryptjs'
import { collections } from './mongodb'
import { ObjectId } from 'mongodb'

export enum UserRole {
  USER = 'USER',
  INSTITUTION = 'INSTITUTION',
  ADMIN = 'ADMIN',
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function createUser(
  email: string,
  password: string,
  name: string,
  phone?: string,
  role: UserRole = UserRole.USER
) {
  const passwordHash = await hashPassword(password)
  const usersCollection = await collections.users()
  
  const result = await usersCollection.insertOne({
    email,
    passwordHash,
    name,
    phone: phone || null,
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  return usersCollection.findOne({ _id: result.insertedId })
}

export async function getUserByEmail(email: string) {
  const usersCollection = await collections.users()
  const user = await usersCollection.findOne({ email })
  
  if (!user) {
    return null
  }

  // Fetch institution if exists
  let institution = null
  if (user.role === UserRole.INSTITUTION) {
    try {
      const institutionsCollection = await collections.institutions()
      institution = await institutionsCollection.findOne({ userId: user._id })
    } catch {
      // Continue without institution
    }
  }

  return {
    ...user,
    id: user._id.toString(),
    institution,
  }
}

export async function getUserById(id: string) {
  const usersCollection = await collections.users()
  const user = await usersCollection.findOne({ _id: new ObjectId(id) })
  
  if (!user) {
    return null
  }

  // Fetch institution if exists
  let institution = null
  if (user.role === UserRole.INSTITUTION) {
    try {
      const institutionsCollection = await collections.institutions()
      institution = await institutionsCollection.findOne({ userId: user._id })
    } catch {
      // Continue without institution
    }
  }

  return {
    ...user,
    id: user._id.toString(),
    institution,
  }
}