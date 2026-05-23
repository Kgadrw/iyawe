import { MongoClient, Db, MongoClientOptions } from 'mongodb'

const globalForMongo = globalThis as unknown as {
  mongoClient: MongoClient | null
  mongoDb: Db | null
  mongoConnectPromise: Promise<Db> | null
}

function getMongoOptions(): MongoClientOptions {
  return {
    serverSelectionTimeoutMS: 30000,
    connectTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
    retryWrites: true,
    retryReads: true,
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
    const match = uri.match(/mongodb(?:\+srv)?:\/\/[^/]+\/([^?]+)/)
    return match?.[1] ?? null
  }
}

export function getMongoConnectionHelp(error?: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? '')

  if (!process.env.DATABASE_URL) {
    return 'Add DATABASE_URL to .env.local (copy from .env or backend/.env), then restart npm run dev.'
  }

  if (
    message.includes('Server selection timed out') ||
    message.includes('ENOTFOUND') ||
    message.includes('querySrv')
  ) {
    return [
      'Cannot reach MongoDB. Check:',
      '1) Internet connection',
      '2) MongoDB Atlas → Network Access → allow your IP (or 0.0.0.0/0 for testing)',
      '3) DATABASE_URL in .env.local is correct (URL-encode special characters in passwords, e.g. @ → %40)',
      '4) Restart the dev server after changing .env.local',
    ].join(' ')
  }

  if (message.includes('authentication failed')) {
    return 'MongoDB authentication failed. Check username/password in DATABASE_URL.'
  }

  return message || 'Database connection failed.'
}

async function connectDatabaseInternal(): Promise<Db> {
  const uri = process.env.DATABASE_URL
  if (!uri?.trim()) {
    throw new Error('DATABASE_URL environment variable is not set')
  }

  if (!globalForMongo.mongoClient) {
    globalForMongo.mongoClient = new MongoClient(uri, getMongoOptions())
  }

  if (!globalForMongo.mongoConnectPromise) {
    globalForMongo.mongoConnectPromise = globalForMongo.mongoClient
      .connect()
      .then(async (connectedClient) => {
        await connectedClient.db('admin').command({ ping: 1 })
        const dbName = extractDatabaseName(uri) || 'iyawe'
        globalForMongo.mongoDb = connectedClient.db(dbName)
        return globalForMongo.mongoDb
      })
      .catch((error) => {
        globalForMongo.mongoConnectPromise = null
        globalForMongo.mongoClient = null
        globalForMongo.mongoDb = null
        throw error
      })
  }

  return globalForMongo.mongoConnectPromise
}

export async function connectDatabase(): Promise<Db> {
  if (globalForMongo.mongoDb) {
    return globalForMongo.mongoDb
  }
  return connectDatabaseInternal()
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
  claims: () => getCollection('claims'),
  documentWatchAlerts: () => getCollection('documentWatchAlerts'),
  institutions: () => getCollection('institutions'),
  ads: () => getCollection('ads'),
  notifications: () => getCollection('notifications'),
  auditLogs: () => getCollection('auditLogs'),
}
