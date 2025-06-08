import app from './app'
import { dbConnection } from '@/config/connection'
import { port } from './config/vars'

// Chamar a conexão com o banco de dados quando o servidor iniciar
dbConnection()

app.listen(port, () => {
  console.log(`listening on port ${port}`)
})
