import 'dotenv/config'

export const port = process.env.PORT || 3000
export const socketCorsOrigin = process.env.SOCKET_CORS_ORIGIN || '*'
export const jwtSecret = process.env.JWT_SECRET || 'your-default-secret'
