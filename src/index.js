import app from './app.js'
import dbConnection from '../config/connection.js'

// Chamar a conexão com o banco de dados quando o servidor iniciar
dbConnection()

app.listen(3000, () => {
  console.log(`listening on port 3000`)
})
