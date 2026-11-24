# JOGO DOS NÚMEROS DO LEO

Aplicação web completa de adivinhação numérica com estética rústica, estratégia de busca binária, régua interativa, histórico de partidas e ranking competitivo, construída com **Next.js (App Router)**, **Neon PostgreSQL (`@neondatabase/serverless`)** e pronta para hospedagem na **Vercel**.

---

## Funcionalidades

- **Identidade Visual Rústica:** tons terrosos (`#38251B`, `#68452F`, `#A8794D`, `#E8D8B9`, `#F4EBDD`, `#69734A`), placas de madeira, cartões em papel antigo e botões artesanais.
- **Três Níveis de Dificuldade:**
  - **Nível 1 — Iniciante:** `1` a `10` (busca binária ideal: até 4 tentativas)
  - **Nível 2 — Intermediário:** `1` a `100` (busca binária ideal: até 7 tentativas)
  - **Nível 3 — Avançado:** `1` a `1000` (busca binária ideal: até 10 tentativas)
- **Régua Interativa:** mostra menor limite, maior limite, último chute, números restantes, intervalo atual e sugestão opcional de próximo chute (ponto médio).
- **Segurança no Backend:** número secreto gerado no servidor (`crypto.randomInt`), nunca enviado ao frontend antes da vitória, validação estrita de chutes, transações no banco e sessão assinada via cookie `HttpOnly` (HMAC-SHA256).
- **Ranking do Leo:** Ranking Geral (pontuação normalizada por dificuldade) e Rankings por Nível (1, 2 e 3), com medalhas para o pódio e desempate por menor tempo e data de conclusão.
- **Meu Histórico:** lista de partidas do jogador com visualização detalhada de todas as tentativas e respostas.

---

## Estrutura do Banco de Dados (Neon PostgreSQL)

As tabelas e índices estão definidos em [`db/migrations/001_init.sql`](db/migrations/001_init.sql):

- `jogadores` (`id`, `nome`, `criado_em`)
- `partidas` (`id`, `jogador_id`, `nivel`, `numero_secreto`, `tentativas`, `acertou`, `tempo_segundos`, `data_partida`, `finalizada_em`)
- `tentativas` (`id`, `partida_id`, `numero_chutado`, `resultado`, `numero_tentativa`, `data_tentativa`)

---

## Como Configurar Neon PostgreSQL + Vercel

### 1. Desenvolvimento Local

1. Copie `.env.example` para `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
2. No painel do **Neon** (<https://console.neon.tech>), crie um projeto PostgreSQL e copie a **Connection String** (com `?sslmode=require`).
3. Preencha `.env.local`:
   ```env
   DATABASE_URL=postgresql://usuario:senha@ep-xxxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   SESSION_SECRET=sua_chave_aleatoria_segura_com_pelo_menos_32_caracteres
   ```
4. Execute as migrações para criar as tabelas e índices no Neon:
   ```bash
   npm run db:migrate
   ```
5. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

### 2. Deploy na Vercel com Integração Neon

1. Publique o repositório no GitHub/GitLab/Bitbucket (sem os arquivos `.env` ou `.env.local`).
2. No painel da **Vercel**, importe o projeto.
3. Conecte o **Neon** diretamente ao projeto na Vercel:
   - Pelo **Vercel Marketplace -> Neon** (integração oficial), ou
   - Adicionando manualmente em **Project Settings -> Environment Variables**:
     - `DATABASE_URL` (marcar **Development**, **Preview** e **Production**)
     - `SESSION_SECRET` (string aleatória longa, marcar **Development**, **Preview** e **Production**)
4. Execute a migração no banco de produção (uma única vez, localmente apontando `DATABASE_URL` para o Neon ou via `vercel env pull .env.local && npm run db:migrate`).
5. Faça o deploy e teste `GET /api/health` para confirmar a conexão ativa com o Neon.
