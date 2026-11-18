const request = require('supertest')

const baseUrl = process.env.APP_BASE_URL

// Recebe a sessão já aberta e devolve as chamadas da API de metas, autenticadas
function criarApiMetas(sessao) {
    const bearer = async () => `Bearer ${await sessao.getToken()}`

    return {
        criar: async (meta) => {
            return await request(baseUrl)
                .post('/api/goals')
                .set('Authorization', await bearer())
                .set('Accept', 'application/json')
                .send(meta)
        },
        listar: async () => {
            return await request(baseUrl)
                .get('/api/goals')
                .set('Authorization', await bearer())
                .set('Accept', 'application/json')
        },    

        listarAtivas: async () => {
            return await request(baseUrl)
                .get('/api/goals/active')
                .set('Authorization', await bearer())
                .set('Accept', 'application/json')
        },
        consultarPorId: async (id) => {
            return await request(baseUrl)
                .get(`/api/goals/${id}`)
                .set('Authorization', await bearer())
                .set('Accept', 'application/json')
        },
        editarPorId: async (id, meta) => {
            return await request(baseUrl)
                .put(`/api/goals/${id}`)
                .set('Authorization', await bearer())
                .set('Accept', 'application/json')  
                .send(meta)
        },
        atualizarProgresso: async (id, progresso) => {
            return await request(baseUrl)
                .patch(`/api/goals/${id}`)
                .set('Authorization', await bearer())
                .set('Accept', 'application/json')
                .send(progresso)
        },
        excluirPorId: async (id) => {
            return await request(baseUrl)
                .delete(`/api/goals/${id}`)
                .set('Authorization', await bearer())
                .set('Accept', 'application/json')
        }
    }
}

module.exports = { criarApiMetas }