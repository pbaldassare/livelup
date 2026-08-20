import { sendCredentialsWelcomeEmail } from './emailCopy.ts'
import type { MailResult } from './resendMail.ts'

export const DEFAULT_ATHLETE_PASSWORD = 'Leone123!'

export type WelcomeEmailPayload = {
  to: string
  firstName: string
  lastName: string
  ptName: string
  temporaryPassword: string
}

export type WelcomeEmailResult = MailResult

export async function sendAthleteWelcomeEmail(
  payload: WelcomeEmailPayload,
): Promise<WelcomeEmailResult> {
  return sendCredentialsWelcomeEmail({
    to: payload.to,
    firstName: payload.firstName,
    lastName: payload.lastName,
    role: 'atleta',
    temporaryPassword: payload.temporaryPassword,
    kind: 'athlete_by_pt',
    ptName: payload.ptName,
  })
}
