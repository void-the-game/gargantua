import 'dotenv/config'
import mongoose from 'mongoose'

// Função para conectar ao MongoDB Atlas usando o mongoose
const dbConnection = () => {
  mongoose
    .connect(process.env.DB_URI_CONNECTION)
    .then(() => console.log('Conectado ao MongoDB Atlas com sucesso!'))
    .catch((err) => console.error('Erro ao conectar ao MongoDB Atlas: ', err))
}

export default dbConnection
