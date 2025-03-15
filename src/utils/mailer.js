import dotenv from 'dotenv'
import nodemailer from 'nodemailer'

dotenv.config()

export const sendEmail = async (email, subject, text) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      service: process.env.EMAIL_SERVICE,
      port: 465,
      secure: false,
      auth: {
        user: process.env.EMAIL,
        pass: process.env.PASSWORD,
      },
      tls: {
        rejectUnauthorized: true,
      },
    })

    await transporter.sendMail({
      from: process.env.USER,
      to: email,
      subject: subject,
      text: text,
    })

    return {
      success: true,
      message: 'An email sent to your account please verify',
    }
  } catch (error) {
    console.error(`email not send: ${error}`)
    return {
      success: false,
      message: 'An error occurred while sending email',
    }
  }
}
