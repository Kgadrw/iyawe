import { NextResponse } from 'next/server'

/** Public self-registration is disabled — staff accounts are created by admins. */
export async function POST() {
  return NextResponse.json(
    {
      error:
        'Self-registration is not available. Ask your administrator to create a staff account.',
    },
    { status: 403 }
  )
}
