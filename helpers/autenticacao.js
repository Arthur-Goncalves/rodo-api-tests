const request = require('supertest')
const clerkKey = process.env.CLERK_TEST_SECRET_KEY
const userId = process.env.TEST_USER_ID
const baseUrl = process.env.APP_BASE_URL
const loginClerkUrl = process.env.APP_LOGIN_CLERK_URL

const chamarClerk = async (caminho, corpo = {}) =>
    request(loginClerkUrl)
        .post(caminho)
        .set('Authorization', `Bearer ${clerkKey}`)
        .send(corpo)

async function abrirSessao() {
    const sessao = await chamarClerk('/v1/sessions', { user_id: userId, })
    if (sessao.status < 200 || sessao.status > 299) {
        throw new Error(`Erro ao criar sessão no Clerk. Status: ${sessao.status}`)
    }
    const sessionId = sessao.body.id
    let jwt = null
    let expiraEm = 0

    // Gera um token novo só quando faltam menos de 10 segundos para expirar
async function getToken() {
    if (!jwt || Date.now() >= expiraEm - 10000) {
        const token = await chamarClerk(`/v1/sessions/${sessionId}/tokens`)
        if (token.status < 200 || token.status > 299) {
            throw new Error(`Erro ao gerar token no Clerk. Status: ${token.status}`)
        }
        jwt = token.body.jwt
        expiraEm = Date.now() + 60000 // 1 minuto
    }
    return jwt
}

const fecharSessao = async () => chamarClerk(`/v1/sessions/${sessionId}/revoke`)

return { getToken, fecharSessao }
}

module.exports = { 
    abrirSessao 
}
