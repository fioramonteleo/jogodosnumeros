import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  computeNormalizedLevelScore,
  computeRulerState,
  evaluatePerformance,
  LEVELS,
  validateGuessInput,
} from "../game-config";
import { createSessionToken, verifySessionToken } from "../session";

describe("Regras do Jogo e Busca Binária", () => {
  it("configura corretamente os três níveis", () => {
    expect(LEVELS[1]).toMatchObject({ min: 1, max: 10, idealTentativas: 4 });
    expect(LEVELS[2]).toMatchObject({ min: 1, max: 100, idealTentativas: 7 });
    expect(LEVELS[3]).toMatchObject({ min: 1, max: 1000, idealTentativas: 10 });
  });

  it("rejeita campos vazios, decimais, letras, fora do intervalo e números repetidos", () => {
    const used = new Set([50, 75]);

    expect(validateGuessInput("", 1, 100, used).valid).toBe(false);
    expect(validateGuessInput("   ", 1, 100, used).valid).toBe(false);
    expect(validateGuessInput("50.5", 1, 100, used).valid).toBe(false);
    expect(validateGuessInput("abc", 1, 100, used).valid).toBe(false);
    expect(validateGuessInput("0", 1, 100, used).valid).toBe(false);
    expect(validateGuessInput("101", 1, 100, used).valid).toBe(false);
    expect(validateGuessInput("50", 1, 100, used).valid).toBe(false);

    const ok = validateGuessInput("62", 1, 100, used);
    expect(ok).toEqual({ valid: true, value: 62 });
  });

  it("atualiza a régua interativa corretamente após MAIOR e MENOR", () => {
    const inicio = computeRulerState(2, []);
    expect(inicio).toEqual({
      minPossivel: 1,
      maxPossivel: 100,
      lastGuess: null,
      lastResult: null,
      remainingCount: 100,
      suggestedNext: 50,
    });

    const aposMaior = computeRulerState(2, [
      { numero_chutado: 50, resultado: "MAIOR", numero_tentativa: 1 },
    ]);
    expect(aposMaior).toEqual({
      minPossivel: 51,
      maxPossivel: 100,
      lastGuess: 50,
      lastResult: "MAIOR",
      remainingCount: 50,
      suggestedNext: 75,
    });

    const aposMenor = computeRulerState(2, [
      { numero_chutado: 50, resultado: "MAIOR", numero_tentativa: 1 },
      { numero_chutado: 75, resultado: "MENOR", numero_tentativa: 2 },
    ]);
    expect(aposMenor).toEqual({
      minPossivel: 51,
      maxPossivel: 74,
      lastGuess: 75,
      lastResult: "MENOR",
      remainingCount: 24,
      suggestedNext: 62,
    });
  });

  it("avalia desempenho conforme busca binária ideal", () => {
    expect(evaluatePerformance(1, 4).isIdeal).toBe(true);
    expect(evaluatePerformance(2, 7).isIdeal).toBe(true);
    expect(evaluatePerformance(2, 8).isIdeal).toBe(false);
    expect(evaluatePerformance(3, 10).isIdeal).toBe(true);
  });

  it("normaliza pontuação do Ranking Geral priorizando menos chutes e maior dificuldade", () => {
    const scoreN1Ideal = computeNormalizedLevelScore(1, 4);
    const scoreN2Ideal = computeNormalizedLevelScore(2, 7);
    const scoreN3Ideal = computeNormalizedLevelScore(3, 10);

    expect(scoreN3Ideal).toBeGreaterThan(scoreN2Ideal);
    expect(scoreN2Ideal).toBeGreaterThan(scoreN1Ideal);
    expect(computeNormalizedLevelScore(2, 5)).toBeGreaterThan(scoreN2Ideal);
  });
});

describe("Segurança da Sessão", () => {
  it("assina e valida tokens de sessão e rejeita adulterações", () => {
    const token = createSessionToken("11111111-1111-4111-8111-111111111111", "Leo");
    const parsed = verifySessionToken(token);
    expect(parsed).not.toBeNull();
    expect(parsed?.jogadorId).toBe("11111111-1111-4111-8111-111111111111");
    expect(parsed?.nome).toBe("Leo");

    // Adulterar assinatura
    const [payload, sig] = token.split(".");
    const tampered = `${payload}.${sig.slice(0, -1)}X`;
    expect(verifySessionToken(tampered)).toBeNull();
    expect(verifySessionToken("invalido")).toBeNull();
  });
});

describe("Serviço de Partidas e Segurança do Número Secreto", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("nunca expõe numeroSecreto antes da vitória e bloqueia acesso de outro jogador", async () => {
    const fakeMatch = {
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      jogador_id: "11111111-1111-4111-8111-111111111111",
      nivel: 2,
      numero_secreto: 73,
      tentativas: 0,
      acertou: false,
      tempo_segundos: 0,
      data_partida: new Date().toISOString(),
      finalizada_em: null as string | null,
      elapsed_seconds: 12,
    };
    const fakeAttempts: Array<{
      id: string;
      numero_chutado: number;
      resultado: "MAIOR" | "MENOR" | "ACERTOU";
      numero_tentativa: number;
      data_tentativa: string;
    }> = [];

    const mockClient = {
      query: vi.fn(async (sql: string, params?: unknown[]) => {
        if (sql.includes("BEGIN") || sql.includes("COMMIT") || sql.includes("ROLLBACK")) {
          return { rows: [], rowCount: 0 };
        }
        if (sql.includes("FROM partidas") && sql.includes("FOR UPDATE")) {
          return { rows: [{ ...fakeMatch }], rowCount: 1 };
        }
        if (sql.includes("FROM tentativas")) {
          return { rows: [...fakeAttempts], rowCount: fakeAttempts.length };
        }
        if (sql.includes("INSERT INTO tentativas")) {
          const att = {
            id: `att-${fakeAttempts.length + 1}`,
            numero_chutado: Number(params?.[1]),
            resultado: params?.[2] as "MAIOR" | "MENOR" | "ACERTOU",
            numero_tentativa: Number(params?.[3]),
            data_tentativa: new Date().toISOString(),
          };
          fakeAttempts.push(att);
          return { rows: [att], rowCount: 1 };
        }
        if (sql.includes("UPDATE partidas") && sql.includes("acertou = TRUE")) {
          fakeMatch.acertou = true;
          fakeMatch.tentativas = Number(params?.[0]);
          fakeMatch.finalizada_em = new Date().toISOString();
          return { rows: [{ finalizada_em: fakeMatch.finalizada_em }], rowCount: 1 };
        }
        if (sql.includes("UPDATE partidas")) {
          fakeMatch.tentativas = Number(params?.[0]);
          return { rows: [], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      }),
      release: vi.fn(),
    };

    const mockPool = {
      connect: vi.fn(async () => mockClient),
      query: mockClient.query,
    };

    vi.doMock("../db", () => ({
      getPool: () => mockPool,
      withTransaction: async <T>(fn: (c: typeof mockClient) => Promise<T>) => fn(mockClient),
    }));

    const { submitGuess } = await import("../game-service");

    // Outro jogador tenta chutar -> 403
    await expect(
      submitGuess(fakeMatch.id, "22222222-2222-4222-8222-222222222222", 50)
    ).rejects.toMatchObject({ status: 403 });

    // Jogador dono chuta 50 -> MAIOR, numeroSecreto ainda null
    const res1 = await submitGuess(fakeMatch.id, fakeMatch.jogador_id, 50);
    expect(res1.resultado).toBe("MAIOR");
    expect(res1.mensagem).toBe("O NÚMERO É MAIOR!");
    expect(res1.game.numeroSecreto).toBeNull();
    expect(res1.game.ruler.minPossivel).toBe(51);

    // Chutar 50 novamente -> erro 400
    await expect(
      submitGuess(fakeMatch.id, fakeMatch.jogador_id, 50)
    ).rejects.toMatchObject({ status: 400 });

    // Chutar 85 -> MENOR, numeroSecreto ainda null
    const res2 = await submitGuess(fakeMatch.id, fakeMatch.jogador_id, 85);
    expect(res2.resultado).toBe("MENOR");
    expect(res2.game.numeroSecreto).toBeNull();
    expect(res2.game.ruler.maxPossivel).toBe(84);

    // Chutar 73 -> ACERTOU, revela numeroSecreto
    const res3 = await submitGuess(fakeMatch.id, fakeMatch.jogador_id, 73);
    expect(res3.resultado).toBe("ACERTOU");
    expect(res3.mensagem).toBe("PARABÉNS! VOCÊ ACERTOU!");
    expect(res3.game.acertou).toBe(true);
    expect(res3.game.numeroSecreto).toBe(73);
    expect(res3.game.tentativasCount).toBe(3);
  });
});
