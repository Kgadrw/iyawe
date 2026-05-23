import { isEmailConfigured, sendEmail } from './email'
import type { StationInfo } from './station-info'

type WatchFoundEmailParams = {
  to: string
  contactName: string
  documentTypeLabel: string
  documentNumber?: string | null
  station: StationInfo
  foundLocation?: string | null
  appUrl?: string
}

export async function sendWatchFoundNotificationEmail(
  params: WatchFoundEmailParams
): Promise<boolean> {
  if (!isEmailConfigured()) {
    console.warn('SMTP not configured — watch alert email skipped')
    return false
  }

  const appUrl =
    params.appUrl ||
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://localhost:3000'

  const docRef = params.documentNumber
    ? `${params.documentTypeLabel} (${params.documentNumber})`
    : params.documentTypeLabel

  const stationLines = [
    params.station.name,
    params.station.address,
    params.station.phone ? `Phone: ${params.station.phone}` : null,
    params.foundLocation ? `Found at: ${params.foundLocation}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  const subject = 'Subizwa: Your document may have been found'

  const text = `Hello ${params.contactName},

Good news — a document matching the details you registered on Subizwa has been listed at a station.

Document: ${docRef}

Station:
${stationLines}

Search on Subizwa and submit a claim to start collection:
${appUrl}

Bring valid ID when you visit the station.

— Subizwa`

  const html = `
    <p>Hello ${params.contactName},</p>
    <p><strong>Good news</strong> — a document matching the details you registered has been listed on Subizwa.</p>
    <p><strong>Document:</strong> ${docRef}</p>
    <p><strong>Station:</strong></p>
    <ul>
      <li><strong>${params.station.name}</strong></li>
      ${params.station.address ? `<li>${params.station.address}</li>` : ''}
      ${params.station.phone ? `<li>Phone: ${params.station.phone}</li>` : ''}
      ${params.foundLocation ? `<li>Found at: ${params.foundLocation}</li>` : ''}
    </ul>
    <p><a href="${appUrl}">Open Subizwa</a> to search and claim your document.</p>
    <p>Bring valid ID when you visit the station.</p>
    <p>— Subizwa</p>
  `

  try {
    await sendEmail({ to: params.to, subject, text, html })
    return true
  } catch (error) {
    console.error('Failed to send watch found notification email:', error)
    return false
  }
}
