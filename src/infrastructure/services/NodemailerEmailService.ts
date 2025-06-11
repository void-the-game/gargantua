import { EmailService } from '@/domain/services/EmailService'
import nodemailer from 'nodemailer'

export class NodeMailerEmailService implements EmailService {
  private transporter

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      service: process.env.EMAIL_SERVICE,
      port: Number(process.env.EMAIL_PORT),
      auth: {
        user: process.env.EMAIL,
        pass: process.env.PASSWORD,
      },
    })
  }

  async sendConfirmationEmail(email: string, token: string) {
    const mailOptions = {
      from: process.env.USER,
      to: email,
      subject: 'Confirme seu e-mail',
      message: `${process.env.APP_URL}/user/verify/${token}`,
    }

    try {
      await this.transporter.sendMail(mailOptions)
      return { success: true }
    } catch (error) {
      console.error('Erro ao enviar o e-mail', error)
      return { success: false }
    }
  }

  sendPasswordResetEmail(
    email: string,
    token: string
  ): Promise<{ success: boolean }> {
    throw new Error('Method not implemented.')
  }
}
