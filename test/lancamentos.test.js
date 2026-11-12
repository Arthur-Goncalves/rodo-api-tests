const request = require('supertest')
const { expect } = require('chai')
const { abrirSessao } = require('../helpers/autenticacao')

describe('Lançamentos', () => {
    let getToken
    let fecharSessao

    before(async () => {
        const { getToken: tokenGetter, fecharSessao: sessionCloser } = await abrirSessao()
        getToken = tokenGetter
        fecharSessao = sessionCloser
    })

    after(async () => {
        await fecharSessao()
    })

    describe('GET /api/transactions', () => {
        it('Deve retornar sucesso com 200 quando existirem lançamentos', async () => {
            const response = await request(process.env.APP_BASE_URL)
                .get('/api/transactions')
                .set('Authorization', `Bearer ${await getToken()}`)
                console.log('Resposta do RodoApp. Status:', response.status)
                console.log('Resposta do RodoApp. Body:', response.body)   
            expect(response.status).to.equal(200)
            expect(response.body).to.be.an('array')
        })
    })
})