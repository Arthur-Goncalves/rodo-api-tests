# rodo-api-tests

Testes automatizados de API (Mocha, Supertest e Chai) de um aplicativo privado, rodando em ambiente local.

## Pré-requisitos
- Node 22 ou mais novo
- O aplicativo rodando em `http://localhost:5000` (repositório privado, não incluído aqui)
- Um usuário de testes no Clerk de desenvolvimento

## Configuração
1. `npm install`
2. Copie `.env.example` para `.env` e preencha os valores
3. `npm test`

O `.env` não é versionado.
