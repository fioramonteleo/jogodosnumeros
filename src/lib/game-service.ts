import crypto from "node:crypto";
import { getPool, withTransaction } from "./db";
import {
  computeNormalizedLevelScore,
  computeRulerState,
  evaluatePerformance,
  getLevelConfig,
  isValidLevel,
  validateGuessInput,
  type ActiveGameView,
  type AttemptRecord,
  type GuessResult,
  type HistoryMatchSummary,
  type NivelId,
  type RankingEntry,
} from "./game-config";

export class GameError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "GameError";
    this.status = status;
  }
}

export interface PlayerRecord {
  id: string;
  nome: string;
  criado_em: string;
}

export type {
  ActiveGameView,
  AttemptRecord,
  HistoryMatchSummary,
  RankingEntry,
};

export async function createPlayer(nomeRaw: string): Promise<PlayerRecord> {
  const nome = nomeRaw.trim().replace(/\s+/g, " ");
  if (nome.length < 2 || nome.length > 40) {
    throw new GameError("O nome do jogador deve ter entre 2 e 40 caracteres.", 400);
  }

  const pool = getPool();
  const res = await pool.query<PlayerRecord>(
    `INSERT INTO jogadores (nome)
     VALUES ($1)
     RETURNING id, nome, criado_em`,
    [nome]
  );

  return res.rows[0];
}

export async function getPlayerById(jogadorId: string): Promise<PlayerRecord | null> {
  const pool = getPool();
  const res = await pool.query<PlayerRecord>(
    `SELECT id, nome, criado_em FROM jogadores WHERE id = $1`,
    [jogadorId]
  );
  return res.rows[0] ?? null;
}

export async function startGame(
  jogadorId: string,
  nivelRaw: unknown
): Promise<ActiveGameView> {
  if (!isValidLevel(nivelRaw)) {
    throw new GameError("Nível inválido. Escolha 1, 2 ou 3.", 400);
  }

  const cfg = getLevelConfig(nivelRaw);
  const numeroSecreto = crypto.randomInt(cfg.min, cfg.max + 1);
  const pool = getPool();

  const res = await pool.query<{
    id: string;
    nivel: NivelId;
    tentativas: number;
    acertou: boolean;
    tempo_segundos: number;
    data_partida: string;
    finalizada_em: string | null;
  }>(
    `INSERT INTO partidas (jogador_id, nivel, numero_secreto, tentativas, acertou, tempo_segundos)
     VALUES ($1, $2, $3, 0, FALSE, 0)
     RETURNING id, nivel, tentativas, acertou, tempo_segundos, data_partida, finalizada_em`,
    [jogadorId, nivelRaw, numeroSecreto]
  );

  const row = res.rows[0];
  return {
    id: row.id,
    nivel: row.nivel,
    tentativasCount: row.tentativas,
    acertou: row.acertou,
    tempoSegundos: row.tempo_segundos,
    dataPartida: row.data_partida,
    finalizadaEm: row.finalizada_em,
    numeroSecreto: null,
    attempts: [],
    ruler: computeRulerState(row.nivel, []),
    performance: null,
  };
}

export async function getGameForPlayer(
  partidaId: string,
  jogadorId: string
): Promise<ActiveGameView> {
  const pool = getPool();
  const matchRes = await pool.query<{
    id: string;
    jogador_id: string;
    nivel: NivelId;
    numero_secreto: number;
    tentativas: number;
    acertou: boolean;
    tempo_segundos: number;
    data_partida: string;
    finalizada_em: string | null;
    elapsed_seconds: number;
  }>(
    `SELECT id, jogador_id, nivel, numero_secreto, tentativas, acertou, tempo_segundos,
            data_partida, finalizada_em,
            GREATEST(0, EXTRACT(EPOCH FROM (NOW() - data_partida))::int) AS elapsed_seconds
     FROM partidas
     WHERE id = $1`,
    [partidaId]
  );

  const match = matchRes.rows[0];
  if (!match) {
    throw new GameError("Partida não encontrada.", 404);
  }
  if (match.jogador_id !== jogadorId) {
    throw new GameError("Você não tem permissão para acessar esta partida.", 403);
  }

  const attemptsRes = await pool.query<AttemptRecord>(
    `SELECT id, numero_chutado, resultado, numero_tentativa, data_tentativa
     FROM tentativas
     WHERE partida_id = $1
     ORDER BY numero_tentativa ASC`,
    [partidaId]
  );

  const attempts = attemptsRes.rows;
  const tempoSegundos = match.acertou ? match.tempo_segundos : match.elapsed_seconds;

  return {
    id: match.id,
    nivel: match.nivel,
    tentativasCount: match.tentativas,
    acertou: match.acertou,
    tempoSegundos,
    dataPartida: match.data_partida,
    finalizadaEm: match.finalizada_em,
    numeroSecreto: match.acertou ? match.numero_secreto : null,
    attempts,
    ruler: computeRulerState(match.nivel, attempts),
    performance: match.acertou
      ? evaluatePerformance(match.nivel, match.tentativas)
      : null,
  };
}

export async function submitGuess(
  partidaId: string,
  jogadorId: string,
  rawGuess: unknown
): Promise<{
  resultado: GuessResult;
  mensagem: string;
  game: ActiveGameView;
}> {
  return withTransaction(async (client) => {
    const matchRes = await client.query<{
      id: string;
      jogador_id: string;
      nivel: NivelId;
      numero_secreto: number;
      tentativas: number;
      acertou: boolean;
      tempo_segundos: number;
      data_partida: string;
      finalizada_em: string | null;
      elapsed_seconds: number;
    }>(
      `SELECT id, jogador_id, nivel, numero_secreto, tentativas, acertou, tempo_segundos,
              data_partida, finalizada_em,
              GREATEST(1, EXTRACT(EPOCH FROM (NOW() - data_partida))::int) AS elapsed_seconds
       FROM partidas
       WHERE id = $1
       FOR UPDATE`,
      [partidaId]
    );

    const match = matchRes.rows[0];
    if (!match) {
      throw new GameError("Partida não encontrada.", 404);
    }
    if (match.jogador_id !== jogadorId) {
      throw new GameError("Você não tem permissão para alterar esta partida.", 403);
    }
    if (match.acertou) {
      throw new GameError("Esta partida já foi finalizada.", 400);
    }

    const attemptsRes = await client.query<AttemptRecord>(
      `SELECT id, numero_chutado, resultado, numero_tentativa, data_tentativa
       FROM tentativas
       WHERE partida_id = $1
       ORDER BY numero_tentativa ASC`,
      [partidaId]
    );

    const existingAttempts = attemptsRes.rows;
    const usedNumbers = new Set(existingAttempts.map((a) => a.numero_chutado));
    const cfg = getLevelConfig(match.nivel);

    const validation = validateGuessInput(rawGuess, cfg.min, cfg.max, usedNumbers);
    if (!validation.valid || validation.value === undefined) {
      throw new GameError(validation.error ?? "Chute inválido.", 400);
    }

    const guess = validation.value;
    let resultado: GuessResult;
    let mensagem: string;

    if (guess < match.numero_secreto) {
      resultado = "MAIOR";
      mensagem = "O NÚMERO É MAIOR!";
    } else if (guess > match.numero_secreto) {
      resultado = "MENOR";
      mensagem = "O NÚMERO É MENOR!";
    } else {
      resultado = "ACERTOU";
      mensagem = "PARABÉNS! VOCÊ ACERTOU!";
    }

    const nextAttemptNumber = existingAttempts.length + 1;

    const insertedAttempt = await client.query<AttemptRecord>(
      `INSERT INTO tentativas (partida_id, numero_chutado, resultado, numero_tentativa)
       VALUES ($1, $2, $3, $4)
       RETURNING id, numero_chutado, resultado, numero_tentativa, data_tentativa`,
      [partidaId, guess, resultado, nextAttemptNumber]
    );

    const allAttempts = [...existingAttempts, insertedAttempt.rows[0]];
    const won = resultado === "ACERTOU";
    const finalTempo = won ? match.elapsed_seconds : match.elapsed_seconds;

    let finalizadaEm: string | null = match.finalizada_em;
    if (won) {
      const updated = await client.query<{ finalizada_em: string }>(
        `UPDATE partidas
         SET tentativas = $1, acertou = TRUE, tempo_segundos = $2, finalizada_em = NOW()
         WHERE id = $3
         RETURNING finalizada_em`,
        [nextAttemptNumber, finalTempo, partidaId]
      );
      finalizadaEm = updated.rows[0].finalizada_em;
    } else {
      await client.query(
        `UPDATE partidas SET tentativas = $1 WHERE id = $2`,
        [nextAttemptNumber, partidaId]
      );
    }

    return {
      resultado,
      mensagem,
      game: {
        id: match.id,
        nivel: match.nivel,
        tentativasCount: nextAttemptNumber,
        acertou: won,
        tempoSegundos: finalTempo,
        dataPartida: match.data_partida,
        finalizadaEm,
        numeroSecreto: won ? match.numero_secreto : null,
        attempts: allAttempts,
        ruler: computeRulerState(match.nivel, allAttempts),
        performance: won ? evaluatePerformance(match.nivel, nextAttemptNumber) : null,
      },
    };
  });
}

export async function getRankingByLevel(nivel: NivelId): Promise<RankingEntry[]> {
  const pool = getPool();
  const res = await pool.query<{
    jogador_id: string;
    nome: string;
    tentativas: number;
    tempo_segundos: number;
    finalizada_em: string;
    partidas_realizadas: string;
    vitorias: string;
  }>(
    `WITH melhores AS (
       SELECT DISTINCT ON (p.jogador_id)
         p.jogador_id,
         p.tentativas,
         p.tempo_segundos,
         p.finalizada_em
       FROM partidas p
       WHERE p.nivel = $1 AND p.acertou = TRUE
       ORDER BY p.jogador_id, p.tentativas ASC, p.tempo_segundos ASC, p.finalizada_em ASC
     ),
     stats AS (
       SELECT
         jogador_id,
         COUNT(*) AS partidas_realizadas,
         COUNT(*) FILTER (WHERE acertou = TRUE) AS vitorias
       FROM partidas
       WHERE nivel = $1
       GROUP BY jogador_id
     )
     SELECT
       m.jogador_id,
       j.nome,
       m.tentativas,
       m.tempo_segundos,
       m.finalizada_em,
       s.partidas_realizadas,
       s.vitorias
     FROM melhores m
     JOIN jogadores j ON j.id = m.jogador_id
     JOIN stats s ON s.jogador_id = m.jogador_id
     ORDER BY m.tentativas ASC, m.tempo_segundos ASC, m.finalizada_em ASC
     LIMIT 100`,
    [nivel]
  );

  return res.rows.map((r, idx) => ({
    posicao: idx + 1,
    jogadorId: r.jogador_id,
    nome: r.nome,
    tentativas: Number(r.tentativas),
    tempoSegundos: Number(r.tempo_segundos),
    partidasRealizadas: Number(r.partidas_realizadas),
    vitorias: Number(r.vitorias),
    finalizadaEm: r.finalizada_em,
  }));
}

export async function getGeneralRanking(): Promise<RankingEntry[]> {
  const pool = getPool();
  const res = await pool.query<{
    jogador_id: string;
    nome: string;
    nivel: NivelId;
    best_tentativas: number;
    best_tempo: number;
    best_finalizada_em: string;
    total_partidas: string;
    total_vitorias: string;
  }>(
    `WITH melhores_por_nivel AS (
       SELECT DISTINCT ON (p.jogador_id, p.nivel)
         p.jogador_id,
         p.nivel,
         p.tentativas AS best_tentativas,
         p.tempo_segundos AS best_tempo,
         p.finalizada_em AS best_finalizada_em
       FROM partidas p
       WHERE p.acertou = TRUE
       ORDER BY p.jogador_id, p.nivel, p.tentativas ASC, p.tempo_segundos ASC, p.finalizada_em ASC
     ),
     stats_gerais AS (
       SELECT
         jogador_id,
         COUNT(*) AS total_partidas,
         COUNT(*) FILTER (WHERE acertou = TRUE) AS total_vitorias
       FROM partidas
       GROUP BY jogador_id
     )
     SELECT
       m.jogador_id,
       j.nome,
       m.nivel,
       m.best_tentativas,
       m.best_tempo,
       m.best_finalizada_em,
       s.total_partidas,
       s.total_vitorias
     FROM melhores_por_nivel m
     JOIN jogadores j ON j.id = m.jogador_id
     JOIN stats_gerais s ON s.jogador_id = m.jogador_id`
  );

  const byPlayer = new Map<
    string,
    {
      jogadorId: string;
      nome: string;
      pontuacaoNormalizada: number;
      tentativasSum: number;
      tempoSum: number;
      partidasRealizadas: number;
      vitorias: number;
      niveisVencidos: number[];
      earliestFinish: string;
    }
  >();

  for (const row of res.rows) {
    const score = computeNormalizedLevelScore(row.nivel, Number(row.best_tentativas));
    const existing = byPlayer.get(row.jogador_id);
    if (!existing) {
      byPlayer.set(row.jogador_id, {
        jogadorId: row.jogador_id,
        nome: row.nome,
        pontuacaoNormalizada: score,
        tentativasSum: Number(row.best_tentativas),
        tempoSum: Number(row.best_tempo),
        partidasRealizadas: Number(row.total_partidas),
        vitorias: Number(row.total_vitorias),
        niveisVencidos: [row.nivel],
        earliestFinish: row.best_finalizada_em,
      });
    } else {
      existing.pontuacaoNormalizada += score;
      existing.tentativasSum += Number(row.best_tentativas);
      existing.tempoSum += Number(row.best_tempo);
      existing.niveisVencidos.push(row.nivel);
      if (new Date(row.best_finalizada_em) < new Date(existing.earliestFinish)) {
        existing.earliestFinish = row.best_finalizada_em;
      }
    }
  }

  const sorted = Array.from(byPlayer.values()).sort((a, b) => {
    if (b.pontuacaoNormalizada !== a.pontuacaoNormalizada) {
      return b.pontuacaoNormalizada - a.pontuacaoNormalizada;
    }
    if (a.tentativasSum !== b.tentativasSum) {
      return a.tentativasSum - b.tentativasSum;
    }
    if (a.tempoSum !== b.tempoSum) {
      return a.tempoSum - b.tempoSum;
    }
    return new Date(a.earliestFinish).getTime() - new Date(b.earliestFinish).getTime();
  });

  return sorted.slice(0, 100).map((entry, idx) => ({
    posicao: idx + 1,
    jogadorId: entry.jogadorId,
    nome: entry.nome,
    tentativas: entry.tentativasSum,
    tempoSegundos: entry.tempoSum,
    partidasRealizadas: entry.partidasRealizadas,
    vitorias: entry.vitorias,
    pontuacaoNormalizada: entry.pontuacaoNormalizada,
    niveisVencidos: entry.niveisVencidos.sort((a, b) => a - b),
    finalizadaEm: entry.earliestFinish,
  }));
}

export async function getPlayerHistory(
  jogadorId: string
): Promise<HistoryMatchSummary[]> {
  const pool = getPool();
  const res = await pool.query<{
    id: string;
    nivel: NivelId;
    tentativas: number;
    acertou: boolean;
    tempo_segundos: number;
    numero_secreto: number;
    data_partida: string;
    finalizada_em: string | null;
  }>(
    `SELECT id, nivel, tentativas, acertou, tempo_segundos, numero_secreto, data_partida, finalizada_em
     FROM partidas
     WHERE jogador_id = $1
     ORDER BY data_partida DESC
     LIMIT 100`,
    [jogadorId]
  );

  return res.rows.map((r) => ({
    id: r.id,
    nivel: r.nivel,
    tentativas: Number(r.tentativas),
    acertou: r.acertou,
    tempoSegundos: Number(r.tempo_segundos),
    numeroSecreto: r.acertou ? Number(r.numero_secreto) : null,
    dataPartida: r.data_partida,
    finalizadaEm: r.finalizada_em,
  }));
}
