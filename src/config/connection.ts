import 'dotenv/config'
import mongoose, { Error, ConnectOptions } from 'mongoose'

const DB_URI = process.env.DB_URI_CONNECTION

if (!DB_URI) {
  throw new Error('DB_URI_CONNECTION is not defined')
}

const connectionOptions: ConnectOptions = {
  connectTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  serverSelectionTimeoutMS: 50000,
  retryReads: true,
  retryWrites: true,
  maxPoolSize: 10,
}

// Função para conectar ao MongoDB Atlas usando o mongoose
export const dbConnection = async () => {
  try {
    await mongoose.connect(DB_URI, connectionOptions)
    console.log('Database connected successfully!')
  } catch (error) {
    console.log(error)
    throw new Error('Failed to connect to the database')
  }
}
