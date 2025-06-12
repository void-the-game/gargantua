import nodemailer from 'nodemailer'
import { NodeMailerEmailService } from './NodemailerEmailService'

jest.mock('nodemailer')

const mockSendMail = jest.fn()
const mockCreateTransport = nodemailer.createTransport as jest.Mock

describe('NodeMailerEmailService', () => {
  const OLD_ENV = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = {
      ...OLD_ENV,
      EMAIL_HOST: 'smtp.test.com',
      EMAIL_SERVICE: 'email',
      EMAIL_PORT: '465',
      EMAIL: 'test@test.com',
      PASSWORD: 'password',
      USER: 'noreply@test.com',
      APP_URL: 'http://localhost:3000',
    }
    mockCreateTransport.mockReturnValue({ sendMail: mockSendMail })
  })

  afterAll(() => {
    process.env = OLD_ENV
  })

  it('should create transporter with defined config', () => {
    new NodeMailerEmailService()
    expect(mockCreateTransport).toHaveBeenCalledWith({
      host: 'smtp.test.com',
      service: 'email',
      port: 465,
      auth: {
        user: 'test@test.com',
        pass: 'password',
      },
    })
  })

  it('should send confirmation email successfully', async () => {
    mockSendMail.mockResolvedValueOnce({})
    const service = new NodeMailerEmailService()
    const result = await service.sendConfirmationEmail('user@email.com', 'token123')

    expect(mockSendMail).toHaveBeenCalledWith({
      from: 'noreply@test.com',
      to: 'user@email.com',
      subject: 'Confirme seu e-mail',
      message: 'http://localhost:3000/user/verify/token123',
    })
    expect(result).toEqual({ success: true })
  })

  it('should return false if sendMail throws an error', async () => {
    mockSendMail.mockRejectedValueOnce(new Error('fail'))
    const service = new NodeMailerEmailService()
    const result = await service.sendConfirmationEmail('user@email.com', 'token123')

    expect(result).toEqual({ success: false })
  })
})