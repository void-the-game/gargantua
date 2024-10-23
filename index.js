import app from './app.js'
import dbConnection from './config/connection.js'

const PORT = process.env.PORT || 3000

// Chamar a conexão com o banco de dados quando o servidor iniciar
dbConnection()

app.listen(PORT, () => {
  console.log(`listening on port ${PORT}`)
})
