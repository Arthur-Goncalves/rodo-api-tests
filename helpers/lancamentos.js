const request = require('supertest')

const baseUrl = process.env.APP_BASE_URL

// Recebe a sessão já aberta e devolve as chamadas da API de lançamentos, autenticadas
function criarApiLancamentos(sessao) {
    const bearer = async () => `Bearer ${await sessao.getToken()}`

    return {
        criar: async (corpo) =>
            request(baseUrl)
                .post('/api/transactions')
                .set('Authorization', await bearer())
                .set('Accept', 'application/json')
                .send(corpo),

        listar: async () =>
            request(baseUrl)
                .get('/api/transactions')
                .set('Authorization', await bearer())
                .set('Accept', 'application/json'),

        consultar: async (id) =>
            request(baseUrl)
                .get(`/api/transactions/${id}`)
                .set('Authorization', await bearer())
                .set('Accept', 'application/json'),

        editar: async (id, corpo) =>
            request(baseUrl)
                .patch(`/api/transactions/${id}`)
                .set('Authorization', await bearer())
                .set('Accept', 'application/json')
                .send(corpo),

        excluir: async (id) =>
            request(baseUrl)
                .delete(`/api/transactions/${id}`)
                .set('Authorization', await bearer())
                .set('Accept', 'application/json')
    }
}

module.exports = { criarApiLancamentos }