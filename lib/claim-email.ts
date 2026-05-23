import { isEmailConfigured, sendEmail } from './email'
import type { StationInfo } from './station-info'

type ClaimEmailParams = {
  to: string
  claimantName: string
  documentTypeLabel: string
  documentNumber?: string | null
  station: StationInfo
  foundLocation?: string | null
}

export async function sendClaimConfirmationEmail(params: ClaimEmailParams): Promise<boolean> {
  if (!isEmailConfigured()) {
    console.warn('SMTP not configured — claim confirmation email skipped')
    return false
  }

  const stationLines = [
    params.station.name,
    params.station.address,
    params.station.phone ? `Phone: ${params.station.phone}` : null,
    params.foundLocation ? `Location: ${params.foundLocation}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  const docRef = params.documentNumber
    ? `${params.documentTypeLabel} (${params.documentNumber})`
    : params.documentTypeLabel

  const subject = 'Subizwa: Your document claim was received'

  const text = `Hello ${params.claimantName},

Thank you for claiming your document on Subizwa.

Document: ${docRef}

We have recorded your claim. Please visit the station below with valid ID to collect your document:

${stationLines}

Bring the same contact details you used when claiming. Station staff will verify your identity before handover.

— Subizwa`

  const html = `
    <p>Hello ${params.claimantName},</p>
    <p>Thank you for claiming your document on <strong>Subizwa</strong>.</p>
    <p><strong>Document:</strong> ${docRef}</p>
    <p>Please visit the station below with valid ID to collect your document:</p>
    <ul>
      <li><strong>${params.station.name}</strong></li>
      ${params.station.address ? `<li>${params.station.address}</li>` : ''}
      ${params.station.phone ? `<li>Phone: ${params.station.phone}</li>` : ''}
      ${params.foundLocation ? `<li>Found at: ${params.foundLocation}</li>` : ''}
    </ul>
    <p>Bring the same contact details you used when claiming.</p>
    <p>— Subizwa</p>
  `

  try {
    await sendEmail({ to: params.to, subject, text, html })
    return true
  } catch (error) {
    console.error('Failed to send claim confirmation email:', error)
    return false
  }
}
