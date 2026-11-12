const request = require('supertest')
const { expect } = require('chai')

const clerkKey = process.env.CLERK_TEST_SECRET_KEY
const userId = process.env.TEST_USER_ID
const baseUrl = process.env.APP_BASE_URL
const loginClerkUrl = process.env.APP_LOGIN_CLERK_URL

// Mostra só o começo do token, para não expor a credencial inteira
const mascarar = (valor) =>
    valor ? `${valor.slice(0, 10)}... (${valor.length} caracteres)` : 'ausente'

describe('Login pelo Clerk Tests', () => {

    let sessionId
    let jwt

    before(async () => {
        // 1) cria a sessão do usuário de testes
        console.log('[1/4] Criando a sessão no Clerk...')
        const sessao = await request(loginClerkUrl)
            .post('/v1/sessions')
            .set('Authorization', `Bearer ${clerkKey}`)
            .send({
                user_id: userId,
                session_duration_minutes: 60
            })
        console.log('[1/4] Resposta do Clerk. Status:', sessao.status)
        expect(sessao.status, 'criar sessão').to.be.within(200, 299)
        sessionId = sessao.body.id
        console.log('[1/4] Sessão criada. sessionId:', sessionId)

        // 2) gera o JWT, que vale cerca de 1 minuto
        console.log('[2/4] Gerando o JWT...')
        const token = await request(loginClerkUrl)
            .post(`/v1/sessions/${sessionId}/tokens`)
            .set('Authorization', `Bearer ${clerkKey}`)
            .send({})
        console.log('[2/4] Resposta do Clerk. Status:', token.status)
        expect(token.status, 'gerar token').to.be.within(200, 299)
        jwt = token.body.jwt
        console.log('[2/4] JWT gerado:', mascarar(jwt))
    })

    after(async () => {
        // 4) revoga a sessão, se ela chegou a ser criada
        if (!sessionId) {
            console.log('[4/4] Nada a revogar: a sessão não foi criada.')
            return
        }
        console.log('[4/4] Revogando a sessão...')
        const revogada = await request(loginClerkUrl)
            .post(`/v1/sessions/${sessionId}/revoke`)
            .set('Authorization', `Bearer ${clerkKey}`)
            .send({})
        console.log('[4/4] Sessão revogada. Status:', revogada.status, '| sessionId:', sessionId)
    })

    it('plan-details responde 200 com token válido', async () => {
        // 3) chama o RodoApp com o token
        console.log('[3/4] Chamando o RodoApp com o token...')
        const response = await request(baseUrl)
            .get('/api/user/plan-details')
            .set('Authorization', `Bearer ${jwt}`)
            .set('Accept', 'application/json')
        console.log('[3/4] Resposta do RodoApp. Status:', response.status)
        expect(response.headers['content-type']).to.match(/json/)
        expect(response.status).to.equal(200)
        expect(response.body).to.have.property('planoPro') // confira o nome no Swagger
    })
})