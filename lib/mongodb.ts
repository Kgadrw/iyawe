import { MongoClient, Db, MongoClientOptions } from 'mongodb'

let client: MongoClient | null = null
let db: Db | null = null

export async function connectDatabase(): Promise<Db> {
  if (db) {
    return db
  }

  const uri = process.env.DATABASE_URL
  if (!uri) {
    throw new Error('DATABASE_URL environment variable is not set')
  }

  // Connection options optimized for MongoDB Atlas
  const options: MongoClientOptions = {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
    retryWrites: true,
    retryReads: true,
  }

  try {
    client = new MongoClient(uri, options)
    await client.connect()
    
    // Extract database name from URI or use default
    const dbName = extractDatabaseName(uri) || 'iyawe'
    db = client.db(dbName)

    return db
  } catch (error: any) {
    console.error('Failed to connect to MongoDB:', error.message)
    throw error
  }
}

function extractDatabaseName(uri: string): string | null {
  try {
    const url = new URL(uri)
    const pathname = url.pathname
    if (pathname && pathname.length > 1) {
      return pathname.substring(1).split('?')[0]
    }
    return null
  } catch {
    // If URI parsing fails, try regex
    const match = uri.match(/\/\/(?:[^/]+\/)?([^?]+)/)
    return match ? match[1] : null
  }
}

export async function getCollection(collectionName: string) {
  const database = await connectDatabase()
  return database.collection(collectionName)
}

// Collections
export const collections = {
  users: () => getCollection('users'),
  lostReports: () => getCollection('lostReports'),
  foundReports: () => getCollection('foundReports'),
  matches: () => getCollection('matches'),
  verifications: () => getCollection('verifications'),
  handovers: () => getCollection('handovers'),
  institutions: () => getCollection('institutions'),
  ads: () => getCollection('ads'),
  notifications: () => getCollection('notifications'),
}
