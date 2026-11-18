const { expect } = require('chai')
const { abrirSessao } = require('../helpers/autenticacao')
const { criarApiMetas } = require('../helpers/metas')

describe('Metas', () => {

    let sessao
    let apiMetas
    const idsCriados = []


    // O que o PUT grava; o PATCH confere que isso foi preservado.
    // Corpo completo, igual ao que a tela monta (sem "preencher todos": meses mantidos em 6000).
    const edicaoPut = {
        nome: 'Meta ajustada - API Teste',
        descricao: 'Meta criada pelo teste automatizado',
        valorAlvo: 3500,
        dataInicio: '2026-11-01T03:00:00.000Z',
        dataFim: '2026-12-01T02:59:59.999Z',
        proporcionalizar: true,
        tipoBase: 'mensal',
        anoReferencia: 2026,
        metasMensais: Array.from({ length: 12 }, (_, i) => ({ mes: i + 1, valorAlvo: 6000 }))
    }

    before(async () => {
        console.log('[Metas] Abrindo sessão no Clerk...')
        sessao = await abrirSessao()
        apiMetas = criarApiMetas(sessao) // só pode ser criada depois do login
    })

    after(async () => {
        if (!sessao) return // login falhou: não há sessão nem dados para limpar

        // Limpa o que sobrou, se algum teste falhou antes do DELETE
        for (const id of idsCriados) {
            const response = await apiMetas.excluirPorId(id)
            console.log('[Metas] Limpeza do id', id, '| status:', response.status)
        }

        console.log('[Metas] Revogando a sessão...')
        await sessao.fecharSessao()
    })

    describe('POST /api/goals', () => {
    it('cria meta mensal e retorna 201', async () => {
        const response = await apiMetas.criar({
                nome: 'Meta mensal - API Teste',
                descricao: 'Meta criada pelo teste automatizado',
                valorAlvo: 6000,
                dataInicio: '2026-11-01T03:00:00.000Z',
                dataFim: '2026-12-01T02:59:59.999Z',
                proporcionalizar: true,
                tipoBase: 'mensal',
                anoReferencia: 2026,
                metasMensais: [
                    { mes: 1, valorAlvo: 6000 },
                    { mes: 2, valorAlvo: 6000 },
                    { mes: 3, valorAlvo: 6000 },
                    { mes: 4, valorAlvo: 6000 },
                    { mes: 5, valorAlvo: 6000 },
                    { mes: 6, valorAlvo: 6000 },
                    { mes: 7, valorAlvo: 6000 },
                    { mes: 8, valorAlvo: 6000 },
                    { mes: 9, valorAlvo: 6000 },
                    { mes: 10, valorAlvo: 6000 },
                    { mes: 11, valorAlvo: 6000 },
                    { mes: 12, valorAlvo: 6000 }
                    ]
                })
            
            expect(response.status, 'criar meta').to.equal(201)
            expect(response.body, 'id da meta').to.have.property('id')
            idsCriados.push(response.body.id) // guarda logo, para a limpeza funcionar mesmo se algo abaixo falhar
            expect(idsCriados, 'id da meta guardado para os próximos testes').to.have.lengthOf(1)

            const meses = response.body.metasMensais
            expect(meses, 'quantidade de metas mensais').to.have.lengthOf(12)
            expect(meses.map((m) => m.mes), 'meses gravados de 1 a 12').to.deep.equal([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
            expect(meses.every((m) => m.valorAlvo === 6000 && m.ano === 2026), 'valor e ano de cada mês').to.equal(true)

            expect(response.body.tipoBase, 'tipoBase').to.equal('mensal')
            expect(response.body.valorAlvo, 'valor alvo do período').to.equal(6000)
            expect(response.body.valorMensal, 'valor mensal de uma meta de um mês').to.equal(6000)
            expect(response.body.metaMensal, 'meta mensal').to.equal(6000)
            expect(response.body.metaAnual, 'meta anual').to.equal(72000)
            expect(response.body.dataInicio, 'data de início').to.equal('2026-11-01T03:00:00.000Z')
            expect(response.body.dataFim, 'data de fim').to.equal('2026-12-01T02:59:59.999Z')        
            expect(response.status, 'criar meta mensal').to.equal(201)                                                           
            expect(idsCriados, 'id da meta guardado para os próximos testes').to.have.lengthOf(1)
        })
    }) 

        describe('GET /api/goals', () => {
        it('lista as metas e inclui a criada', async () => {
            const response = await apiMetas.listar()
            expect(response.status, 'listar metas').to.equal(200) // confirme no Swagger
            expect(response.body, 'formato da lista de metas').to.be.an('array')
            const idsNaLista = response.body.map((meta) => meta.id)
            expect(idsNaLista, 'meta criada aparece na lista').to.include.members(idsCriados)
        })
    })

    describe('GET /api/goals/active', () => {
        it('lista as metas ativas e inclui a meta do mês atual', async () => {
            const response = await apiMetas.listarAtivas()
            expect(response.status, 'listar metas ativas').to.equal(200)
            expect(response.body, 'formato da lista de metas ativas').to.be.an('array')
            const idsAtivos = response.body.map((meta) => meta.id)
            expect(idsAtivos, 'meta de novembro está ativa').to.include.members(idsCriados)
        })
    })

    describe('GET /api/goals/{id}', () => {
        it('consulta a meta criada pelo id', async () => {
            const id = idsCriados[0]
            const response = await apiMetas.consultarPorId(id)
            expect(response.status, 'consultar meta por id').to.equal(200)
            expect(response.body.id, 'id da meta consultada').to.equal(id)
            expect(response.body.metasMensais, 'metas mensais gravadas').to.have.lengthOf(12)
        })
    })

    describe('PUT /api/goals/{id}', () => {
        it('edita nome e valor alvo da meta e retorna 200', async () => {
            const id = idsCriados[0]
            const response = await apiMetas.editarPorId(id, edicaoPut)

            expect(response.status, 'editar meta com PUT').to.equal(200)
            expect(response.body.id, 'id da meta editada').to.equal(id)
            expect(response.body.nome, 'nome alterado').to.equal(edicaoPut.nome)
            expect(response.body.valorAlvo, 'valor alvo alterado').to.equal(edicaoPut.valorAlvo)
            expect(response.body.tipoBase, 'tipoBase mantido').to.equal('mensal')
            expect(response.body.dataInicio, 'data de início preservada').to.equal('2026-11-01T03:00:00.000Z')
            expect(response.body.dataFim, 'data de fim preservada').to.equal('2026-12-01T02:59:59.999Z')
            expect(response.body.descricao, 'descrição preservada').to.equal('Meta criada pelo teste automatizado')
            expect(response.body.metaMensal, 'meta mensal recalculada').to.equal(3500)

            const meses = response.body.metasMensais
            expect(meses, 'metas mensais mantidas').to.have.lengthOf(12)
            expect(meses.every((m) => m.valorAlvo === 6000), 'meses preservados sem "preencher todos"').to.equal(true)

            // Comportamento conhecido: o PUT não recalcula o valorMensal (fica com o valor antigo, 6000).
            // O POST calcula certo (valorMensal = valorAlvo numa meta de um mês).
            // Fora do escopo deste estudo; descomente a linha abaixo se o app for corrigido.
            // expect(response.body.valorMensal, 'valor mensal recalculado pelo PUT').to.equal(3500)
        })
    })

    describe('PATCH /api/goals/{id}', () => {
        const progresso = { valorAtual: 250 }

        it('atualiza o progresso da meta e retorna 200', async () => {
            const id = idsCriados[0]
            const response = await apiMetas.atualizarProgresso(id, progresso)

            expect(response.status, 'atualizar progresso').to.equal(200)
            expect(response.body.valorAtual, 'valor atual alterado').to.equal(progresso.valorAtual)
            expect(response.body.nome, 'nome preservado do PUT').to.equal(edicaoPut.nome)
            expect(response.body.valorAlvo, 'valor alvo preservado do PUT').to.equal(edicaoPut.valorAlvo)
        })

        it('o progresso fica gravado na consulta por id', async () => {
            const id = idsCriados[0]
            const response = await apiMetas.consultarPorId(id)

            expect(response.status, 'consultar meta depois do PATCH').to.equal(200)
            expect(response.body.valorAtual, 'valor atual gravado').to.equal(progresso.valorAtual)
            expect(response.body.nome, 'nome gravado').to.equal(edicaoPut.nome)
        })
    })

    // Fica depois do PATCH: se rodasse antes, mudaria o valorAlvo e quebraria as verificações do PATCH
    describe('PUT /api/goals/{id} com "preencher todos"', () => {
        const preencherTodos = {
            ...edicaoPut,
            valorAlvo: 5000,
            metasMensais: Array.from({ length: 12 }, (_, i) => ({ mes: i + 1, valorAlvo: 5000 }))
        }

        it('atualiza o valor do período e os 12 meses e retorna 200', async () => {
            const id = idsCriados[0]
            const response = await apiMetas.editarPorId(id, preencherTodos)

            expect(response.status, 'editar com preencher todos').to.equal(200)
            expect(response.body.valorAlvo, 'valor alvo do período').to.equal(5000)
            expect(response.body.metaMensal, 'meta mensal recalculada').to.equal(5000)

            const meses = response.body.metasMensais
            expect(meses, 'metas mensais').to.have.lengthOf(12)
            expect(meses.every((m) => m.valorAlvo === 5000), 'todos os meses com 5000').to.equal(true)
        })
    })

    describe('DELETE /api/goals/{id}', () => {
        it('exclui as metas criadas', async () => {
            while (idsCriados.length > 0) {
                const id = idsCriados[0]
                const response = await apiMetas.excluirPorId(id)
                    
                expect(response.status, `excluir meta ${id}`).to.equal(200)
                idsCriados.shift()
            }   
        })
    })
})  
       



