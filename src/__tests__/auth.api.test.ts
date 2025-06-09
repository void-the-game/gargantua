import axios from 'axios';

const baseURL = 'http://localhost:3000/api'; // Altere se sua API estiver em outra porta

describe('Segurança de autenticação - API externa', () => {

  it('Deve autenticar usuário válido e retornar token', async () => {
    const response = await axios.post(`${baseURL}/user/login`, {
      email: 'juks@email.com', //Substitua por um usuário real do seu banco
      password: 'Juks@123',
    });

    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('accessToken');
  });

});
