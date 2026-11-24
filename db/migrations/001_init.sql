-- Migração inicial — JOGO DOS NÚMEROS DO LEO
-- Compatível com Neon PostgreSQL

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS jogadores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(60) NOT NULL,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS partidas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    jogador_id UUID NOT NULL REFERENCES jogadores(id) ON DELETE CASCADE,
    nivel INTEGER NOT NULL CHECK (nivel IN (1, 2, 3)),
    numero_secreto INTEGER NOT NULL,
    tentativas INTEGER NOT NULL DEFAULT 0 CHECK (tentativas >= 0),
    acertou BOOLEAN NOT NULL DEFAULT FALSE,
    tempo_segundos INTEGER NOT NULL DEFAULT 0 CHECK (tempo_segundos >= 0),
    data_partida TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finalizada_em TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS tentativas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partida_id UUID NOT NULL REFERENCES partidas(id) ON DELETE CASCADE,
    numero_chutado INTEGER NOT NULL,
    resultado VARCHAR(16) NOT NULL CHECK (resultado IN ('MAIOR', 'MENOR', 'ACERTOU')),
    numero_tentativa INTEGER NOT NULL CHECK (numero_tentativa >= 1),
    data_tentativa TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para consultas de ranking e histórico
CREATE INDEX IF NOT EXISTS idx_partidas_jogador_data
    ON partidas (jogador_id, data_partida DESC);

CREATE INDEX IF NOT EXISTS idx_partidas_ranking_nivel
    ON partidas (nivel, acertou, tentativas ASC, tempo_segundos ASC, finalizada_em ASC)
    WHERE acertou = TRUE;

CREATE INDEX IF NOT EXISTS idx_tentativas_partida_num
    ON tentativas (partida_id, numero_tentativa ASC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tentativas_unique_guess
    ON tentativas (partida_id, numero_chutado);
