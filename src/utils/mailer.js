import dotenv from 'dotenv'
import nodemailer from 'nodemailer'
import { google } from 'googleapis'

dotenv.config()

const OAuth2 = google.auth.OAuth2

const oAuth2Client = new OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.CLIENT_URI
)

oAuth2Client.setCredentials({
  refresh_token: process.env.REFRESH_TOKEN,
})

const accessToken = await oAuth2Client.getAccessToken()

export const sendEmail = async (email, subject, text) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      service: process.env.EMAIL_SERVICE,
      port: 465,
      secure: true,
      auth: {
        type: 'OAuth2',
        user: process.env.EMAIL,
        pass: process.env.PASSWORD,
        clientId: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        refreshToken: process.env.REFRESH_TOKEN,
        accessToken,
      },
      tls: {
        rejectUnauthorized: false,
      }
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
