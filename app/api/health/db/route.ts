import { NextResponse } from 'next/server'
import { connectDatabase, getMongoConnectionHelp } from '@/lib/mongodb'

/** GET /api/health/db — quick MongoDB connectivity check */
export async function GET() {
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json(
      {
        ok: false,
        error: 'DATABASE_URL is not set in .env.local',
        help: getMongoConnectionHelp(),
      },
      { status: 503 }
    )
  }

  try {
    const db = await connectDatabase()
    await db.command({ ping: 1 })
    return NextResponse.json({
      ok: true,
      database: db.databaseName,
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: 'MongoDB connection failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        help: getMongoConnectionHelp(error),
      },
      { status: 503 }
    )
  }
}
