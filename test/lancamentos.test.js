const request = require('supertest')
const { expect } = require('chai')
const { abrirSessao } = require('../helpers/autenticacao')

const baseUrl = process.env.APP_BASE_URL

describe('Lançamentos', () => {
    
    let sessao
    let idsCriados = []

    // Função auxiliar: todo POST de lançamento passa por aqui
    const criarLancamento = async (corpo) =>
        request(baseUrl)
            .post('/api/transactions')
            .set('Authorization', `Bearer ${await sessao.getToken()}`)
            .set('Accept', 'application/json')
            .send(corpo)

    // Função auxiliar: exclui um lançamento pelo id
    const excluirLancamento = async (id) =>
        request(baseUrl)
            .delete(`/api/transactions/${id}`)
            .set('Authorization', `Bearer ${await sessao.getToken()}`)
            .set('Accept', 'application/json')
    
            
    before(async () => {
        console.log('[Lançamentos] Abrindo sessão no Clerk...')
        sessao = await abrirSessao()
    })

    after(async () => {
        if (!sessao) 
            return // login falhou: não há sessão nem dados para limpar

        // Limpa o que sobrou, se algum teste falhou antes do DELETE
        for (const id of idsCriados) {
            const response = await excluirLancamento(id)
            console.log('[Lançamentos] Limpeza do id', id, '| status:', response.status)
        }

        console.log('[Lançamentos] Revogando a sessão...')
        await sessao.fecharSessao()
    })

    describe('POST /api/transactions', () => {
        it('cria despesa de alimentação e retorna 201', async () => {
            const response = await criarLancamento({
                type: 'despesa',
                category: 'Alimentação',
                value: 22.50,
                description: 'Almoço no restaurante - API Teste',
                date: '2026-11-12T12:30:00',
                hora: '12:30'
            })
            //console.log('Resposta do RodoApp. Status:', response.status)
            //console.log('Resposta do RodoApp. Body:', response.body)
        expect(response.status, 'criar despesa de alimentação').to.equal(201)
        expect(response.body, 'id da despesa de alimentação').to.have.property('id')
        idsCriados.push(response.body.id)
        })
    
        it('cria despesa de combustível e retorna 201', async () => {
            const response = await criarLancamento({
                type: 'despesa',
                category: 'Combustível',
                value: 336.85,
                description: 'Abastecimento do veículo - API Teste',
                date: '2026-11-11T09:15:00',
                hora: '10:02', // a data diz 09:15: confira qual horário você quer
                litros: 48.89,
                precoLitro: 6.89,
                kmRodados: 430,
                odometro: 39633,
                postoNome: 'shell',
                tanqueCheio: true,
                subcategoriaCombustivel: 'Gasolina Aditivada',
                mediaKmLitro: 8.80
            })
            //console.log('Resposta do RodoApp. Status:', response.status)
            //console.log('Resposta do RodoApp. Body:', response.body)
            expect(response.status, 'criar despesa de combustível').to.equal(201)
            expect(response.body, 'id da despesa de combustível').to.have.property('id')
            idsCriados.push(response.body.id)
        })

        it('cria receita de Uber e retorna 201', async () => {
            const response = await criarLancamento({
                type: 'receita',
                category: 'Uber',
                value: 17.75,
                description: 'Lançamento de receita manual - API Teste',
                date: '2026-11-12T11:10:00',
                hora: '11:10'
            })
            expect(response.status, 'criar receita de Uber').to.equal(201)
            expect(response.body, 'id da receita de Uber').to.have.property('id')
            idsCriados.push(response.body.id)
        })
    })
    
    describe('GET /api/transactions', () => {
        it('lista os lançamentos e inclui os criados', async () => {
            const response = await request(baseUrl)
                .get('/api/transactions')
                .set('Authorization', `Bearer ${await sessao.getToken()}`)
                .set('Accept', 'application/json')
            expect(response.status, 'listar lançamentos').to.equal(200)
            expect(response.body, 'formato da lista').to.be.an('array')
            const idsNaLista = response.body.map((lancamento) => lancamento.id)
            expect(idsNaLista, 'lançamentos criados aparecem na lista').to.include.members(idsCriados)
        })
    })

    describe('GET /api/transactions/{id}', () => {
        it('consulta um lançamento criado pelo id', async () => {
            const id = idsCriados[0] // a despesa de alimentação, criada primeiro
            const response = await request(baseUrl)
                .get(`/api/transactions/${id}`)
                .set('Authorization', `Bearer ${await sessao.getToken()}`)
                .set('Accept', 'application/json')
            expect(response.status, 'consultar lançamento por id').to.equal(200)
            expect(response.body.id, 'id do lançamento consultado').to.equal(id)
        })
    })

    describe('DELETE /api/transactions/{id}', () => {
        it('exclui os lançamentos criados', async () => {
            while (idsCriados.length > 0) {
                const id = idsCriados[0]
                const response = await excluirLancamento(id)
                expect(response.status, `excluir lançamento ${id}`).to.equal(200)
                idsCriados.shift() // tira da lista só depois de confirmar a exclusão
            }
        })
    })

    describe('DELETE /api/transactions/{id} bloqueado por integridade', () => {
        const idProtegido = 'cmwe1hazq0009o39shgmpk9og' // abastecimento com um posterior, na base de testes

        it('recusa excluir abastecimento que não é o último e retorna 400', async () => {
            const response = await excluirLancamento(idProtegido)
            expect(response.status, 'status da exclusão bloqueada').to.equal(400)
            expect(response.body.error, 'error da exclusão bloqueada').to.equal('Exclusão bloqueada')
            expect(response.body.message, 'message da exclusão bloqueada').to.include('último lançamento de combustível')
        })
    })
})