const request = require('supertest')
const { expect } = require('chai')
const { abrirSessao } = require('../helpers/autenticacao')

const baseUrl = process.env.APP_BASE_URL

describe('Jornadas', () => {

    let sessao
    let kmInicial // maior KM registrado antes do teste 

    before(async () => {
        console.log('[Jornadas] Abrindo sessão no Clerk...')
        sessao = await abrirSessao()
    })

    after(async () => {
        if (!sessao) return
        console.log('[Jornadas] Revogando a sessão...')
        await sessao.fecharSessao()
    })

    describe('Fluxo da jornada simplificada', () => {

        const idsCriados = []
        const idsReceitas = [] // lançamentos de receita ligados às jornadas criadas
        let idExcluida // id da jornada excluída, para o teste seguinte

        after(async () => {
            if (!sessao) return // login falhou: não há sessão nem dados para limpar

            // Limpa o que sobrou, se algum teste falhou antes do DELETE.
            // O DELETE da jornada também remove os lançamentos de receita ligados a ela.
            for (const id of idsCriados) {
                const response = await request(baseUrl)
                    .delete(`/api/work-sessions/${id}`)
                    .set('Authorization', `Bearer ${await sessao.getToken()}`)
                    .set('Accept', 'application/json')
                //console.log('[Jornadas] Limpeza do id', id, '| status:', response.status)
            }
        })

        // ---------------------------------------------------------------
        // Fluxo da jornada simplificada
        // ---------------------------------------------------------------

        describe('GET /api/work-sessions/last-km', () => {
            it('consulta o maior KM final registrado', async () => {
                const response = await request(baseUrl)
                    .get('/api/work-sessions/last-km')
                    .set('Authorization', `Bearer ${await sessao.getToken()}`)
                    .set('Accept', 'application/json')
                //console.log('[Jornadas] last-km:', JSON.stringify(response.body)) // descoberta

                const ultimo = response.body.lastKmFinal
                expect(ultimo === null || typeof ultimo === 'number', 'lastKmFinal é número ou null').to.equal(true)
                kmInicial = ultimo ?? 100000 // sem jornada finalizada, começa num odômetro fictício
                console.log('[Jornadas] KM inicial usado:', kmInicial)
            })
        })

        describe('POST /api/work-sessions/simplified', () => {
            it('cria jornada simplificada e retorna 200', async () => {
                const response = await request(baseUrl)
                    .post('/api/work-sessions/simplified')
                    .set('Authorization', `Bearer ${await sessao.getToken()}`)
                    .set('Accept', 'application/json')
                    .send({
                        data: '2026-11-18',
                        kmTotalRodado: 100,
                        kmFinalDia: kmInicial + 100,
                        horaInicio: '09:00',
                        horaFim: '17:00',
                        plataformas: ['Uber'],
                        faturamentosPorPlataforma: [
                            { plataforma: 'Uber', valor: 250, corridas: 12 }
                        ],
                        notas: 'Jornada simplificada - API Teste'
                    })
                expect(response.status, 'criar jornada simplificada').to.equal(200)
                expect(response.body, 'id da jornada').to.have.property('id')
                idsCriados.push(response.body.id)
                idsReceitas.push(...(response.body.transactionIds ?? []))
                expect(idsCriados, 'id guardado para os próximos testes').to.have.lengthOf(1)

                const jornada = response.body
                expect(jornada.status, 'status').to.equal('finalizada')
                expect(jornada.tipo, 'tipo').to.equal('simplificada')
                expect(jornada.kmInicial, 'kmInicial = kmFinalDia - kmTotalRodado').to.equal(kmInicial)
                expect(jornada.kmFinal, 'kmFinal').to.equal(kmInicial + 100)
                expect(jornada.horasTrabalhadas, 'horas trabalhadas').to.equal(8)
                expect(jornada.dataInicio, 'data de início sem Z').to.equal('2026-11-18T09:00:00')
                expect(jornada.faturamentoTotal, 'faturamento total').to.equal(250)
                expect(jornada.faturamentoPorPlataforma, 'faturamento por plataforma').to.deep.equal({ Uber: 250 })
                expect(jornada.corridasTotais, 'corridas totais').to.equal(12)

                expect(jornada.transactionIds, 'um lançamento de receita criado').to.have.lengthOf(1)
                const receita = jornada.transactions[0]
                expect(receita.type, 'tipo do lançamento').to.equal('receita')
                expect(receita.valor, 'valor do lançamento').to.equal(250)
                expect(receita.workSessionId, 'lançamento ligado à jornada').to.equal(jornada.id)
            })
        })

        describe('GET /api/work-sessions/{id}', () => {
            it('consulta a jornada e o lançamento ligado', async () => {
                const id = idsCriados[0]
                const response = await request(baseUrl)
                    .get(`/api/work-sessions/${id}`)
                    .set('Authorization', `Bearer ${await sessao.getToken()}`)
                    .set('Accept', 'application/json')

                expect(response.status, 'consultar jornada por id').to.equal(200)
                expect(response.body.id, 'id da jornada').to.equal(id)
                const idsLigados = response.body.transactions.map((t) => t.id)
                expect(idsLigados, 'lançamento ligado aparece na jornada').to.include.members(idsReceitas)
            })
        })

        describe('GET /api/work-sessions', () => {
            it('lista as jornadas e inclui a criada', async () => {
                const response = await request(baseUrl)
                    .get('/api/work-sessions')
                    .set('Authorization', `Bearer ${await sessao.getToken()}`)
                    .set('Accept', 'application/json')

                expect(response.status, 'listar jornadas').to.equal(200)
                expect(response.body, 'formato da lista').to.be.an('array') // o Swagger diz: array, sem paginação
                const idsNaLista = response.body.map((j) => j.id)
                expect(idsNaLista, 'jornada criada aparece na lista').to.include.members(idsCriados)
            })
        })

        describe('PATCH /api/work-sessions/{id}', () => {
            const alteracao = { notas: 'Jornada simplificada - API Teste (editada)' }

            it('edita as notas da jornada e retorna 200', async () => {
                const id = idsCriados[0]
                const response = await request(baseUrl)
                    .patch(`/api/work-sessions/${id}`)
                    .set('Authorization', `Bearer ${await sessao.getToken()}`)
                    .set('Accept', 'application/json')
                    .send(alteracao)

                expect(response.status, 'editar notas').to.equal(200)
                expect(response.body.notas, 'notas alteradas').to.equal(alteracao.notas)
                expect(response.body.kmFinal, 'KM preservado').to.equal(kmInicial + 100)
                expect(response.body.faturamentoTotal, 'faturamento preservado').to.equal(250)
            })
        })

        describe('DELETE /api/work-sessions/{id}', () => {
            it('exclui a jornada logicamente', async () => {
                const id = idsCriados[0]
                const response = await request(baseUrl)
                    .delete(`/api/work-sessions/${id}`)
                    .set('Authorization', `Bearer ${await sessao.getToken()}`)
                    .set('Accept', 'application/json')

                expect(response.status, 'excluir jornada').to.equal(200)
                expect(response.body.success, 'successo na resposta').to.equal(true)
                idsCriados.shift()
                idExcluida = id // armazena o ID da jornada excluída para o teste seguinte
            })

            it('a jornada excluída não é mais encontrada', async () => {
                const response = await request(baseUrl)
                    .get(`/api/work-sessions/${idExcluida}`)
                    .set('Authorization', `Bearer ${await sessao.getToken()}`)
                    .set('Accept', 'application/json')
                //console.log('[Jornadas] GET depois do DELETE. Status:', response.status, '| corpo:', JSON.stringify(response.body))

                expect(response.status, 'jornada excluída não é encontrada').to.equal(404)
                expect(response.body.error, 'mensagem de jornada excluída').to.equal('Jornada não encontrada')
            })

            it('o lançamento de receita ligado também é removido', async () => {
                const idReceita = idsReceitas[0]
                const response = await request(baseUrl)
                    .get(`/api/transactions/${idReceita}`)
                    .set('Authorization', `Bearer ${await sessao.getToken()}`)
                    .set('Accept', 'application/json')
                //console.log('[Jornadas] GET do lançamento depois do DELETE. Status:', response.status)

                expect(response.status, 'lançamento ligado não existe mais').to.equal(404)
            })
        })
    })

    // ---------------------------------------------------------------
    // Fluxo da jornada completa
    // ---------------------------------------------------------------


    describe('Fluxo da jornada completa', () => {
        const valorFaturado = 300
        let idCompleta // id da jornada iniciada neste fluxo
        let idReceitaCompleta // lançamento de receita criado ao finalizar
        let excluida = false

        // Este before roda depois do before de 'Jornadas': a sessão já existe
        before(async () => {
            const response = await request(baseUrl)
                .get('/api/work-sessions/active')
                .set('Authorization', `Bearer ${await sessao.getToken()}`)
                .set('Accept', 'application/json')
            // Sem jornada em andamento, o app devolve null com status 200
            if (response.body) {
                throw new Error(`Já existe uma jornada em andamento (id ${response.body.id}). Finalize ou exclua antes de rodar.`)
            }
        })

        after(async () => {
            if (!idCompleta || excluida) return

            // A jornada pode ter ficado ativa ou pausada se algum teste falhou: finaliza e exclui
            const finalizada = await request(baseUrl)
                .put(`/api/work-sessions/${idCompleta}/finish`)
                .set('Authorization', `Bearer ${await sessao.getToken()}`)
                .set('Accept', 'application/json')
                .send({ kmFinal: kmInicial + 100, horaFim: '17:00', valorFaturado: 0 })
            console.log('[Jornada completa] Limpeza: finish | status:', finalizada.status)

            const removida = await request(baseUrl)
                .delete(`/api/work-sessions/${idCompleta}`)
                .set('Authorization', `Bearer ${await sessao.getToken()}`)
                .set('Accept', 'application/json')
            console.log('[Jornada completa] Limpeza: delete | status:', removida.status)
        })

        it('inicia jornada completa e retorna 201', async () => {
            const response = await request(baseUrl)
                .post('/api/work-sessions')
                .set('Authorization', `Bearer ${await sessao.getToken()}`)
                .set('Accept', 'application/json')
                .send({ kmInicial, plataformas: ['Uber'], horaInicio: '09:00' })

            expect(response.status, 'iniciar jornada').to.equal(201)
            expect(response.body, 'id da jornada').to.have.property('id')
            idCompleta = response.body.id
            expect(response.body.status, 'status inicial').to.equal('ativa')
            expect(response.body.tipo, 'tipo').to.equal('completa')
            expect(response.body.kmInicial, 'kmInicial').to.equal(kmInicial)
            expect(response.body.plataformasAtivas, 'plataformas iniciais').to.deep.equal(['Uber'])
        })

        it('consulta a jornada ativa', async () => {
            const response = await request(baseUrl)
                .get('/api/work-sessions/active')
                .set('Authorization', `Bearer ${await sessao.getToken()}`)
                .set('Accept', 'application/json')

            expect(response.status, 'consultar jornada ativa').to.equal(200)
            expect(response.body.id, 'a jornada ativa é a iniciada').to.equal(idCompleta)
        })

        it('pausa a jornada', async () => {
            const response = await request(baseUrl)
                .put(`/api/work-sessions/${idCompleta}/pause`)
                .set('Authorization', `Bearer ${await sessao.getToken()}`)
                .set('Accept', 'application/json')
                .send({ motivo: 'Intervalo' })

            expect(response.status, 'pausar jornada').to.equal(200)
            expect(response.body.status, 'status depois da pausa').to.equal('pausada')
        })

        it('retoma a jornada', async () => {
            const response = await request(baseUrl)
                .put(`/api/work-sessions/${idCompleta}/resume`)
                .set('Authorization', `Bearer ${await sessao.getToken()}`)
                .set('Accept', 'application/json')

            expect(response.status, 'retomar jornada').to.equal(200)
            expect(response.body.status, 'status depois de retomar').to.equal('ativa')
            expect(response.body.pausas, 'pausa registrada').to.have.lengthOf(1)
            expect(response.body.pausas[0].motivo, 'motivo da pausa').to.equal('Intervalo')
        })

        it('liga a plataforma 99', async () => {
            const response = await request(baseUrl)
                .put(`/api/work-sessions/${idCompleta}/toggle-platform`)
                .set('Authorization', `Bearer ${await sessao.getToken()}`)
                .set('Accept', 'application/json')
                .send({ plataforma: '99', acao: 'ligar' })

            expect(response.status, 'ligar plataforma').to.equal(200)
            expect(response.body.plataformasAtivas, 'plataformas ativas').to.include.members(['Uber', '99'])
        })

        it('finaliza a jornada e registra a receita', async () => {
            const response = await request(baseUrl)
                .put(`/api/work-sessions/${idCompleta}/finish`)
                .set('Authorization', `Bearer ${await sessao.getToken()}`)
                .set('Accept', 'application/json')
                .send({ kmFinal: kmInicial + 100, horaFim: '17:00', valorFaturado, notas: 'Jornada completa - API Teste' })

            expect(response.status, 'finalizar jornada').to.equal(200)
            expect(response.body.status, 'status final').to.equal('finalizada')
            expect(response.body.kmFinal, 'kmFinal').to.equal(kmInicial + 100)
            expect(response.body.kmRodados, 'km rodados').to.equal(100)
            expect(response.body.faturamentoTotal, 'faturamento total = valor enviado').to.equal(valorFaturado)

            expect(response.body.transactionIds, 'um lançamento de receita criado').to.have.lengthOf(1)
            const receita = response.body.transactions[0]
            expect(receita.valor, 'valor da receita = valor enviado').to.equal(valorFaturado)
            expect(receita.workSessionId, 'receita ligada à jornada').to.equal(idCompleta)
            idReceitaCompleta = response.body.transactionIds[0]

            // Comportamentos observados e fora do escopo deste estudo:
            // - tempoPausado: negativo (-3 para uma pausa de 3 segundos)
            // - horasTrabalhadas: 3, sem relação com 09:00-17:00 nem com o tempo real
            // - dataInicio/dataFim: hora do servidor, não horaInicio/horaFim
            // - faturamentoPorPlataforma: {} vazio, mesmo com faturamento registrado
            // expect(response.body.tempoPausado, 'tempo pausado não negativo').to.be.at.least(0)
        })

        it('exclui a jornada finalizada', async () => {
            const response = await request(baseUrl)
                .delete(`/api/work-sessions/${idCompleta}`)
                .set('Authorization', `Bearer ${await sessao.getToken()}`)
                .set('Accept', 'application/json')

            expect(response.status, 'excluir jornada completa').to.equal(200)
            excluida = true
        })

        it('o lançamento de receita ligado também é removido', async () => {
            const response = await request(baseUrl)
                .get(`/api/transactions/${idReceitaCompleta}`)
                .set('Authorization', `Bearer ${await sessao.getToken()}`)
                .set('Accept', 'application/json')

            expect(response.status, 'receita da jornada completa removida').to.equal(404)
        })
    })
})
