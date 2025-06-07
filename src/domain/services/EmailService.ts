export interface EmailService {
  sendConfirmationEmail(
    email: string,
    token: string
  ): Promise<{ success: boolean }>
  sendPasswordResetEmail(
    email: string,
    token: string
  ): Promise<{ success: boolean }>
}
