export type NivelId = 1 | 2 | 3;

export type GuessResult = "MAIOR" | "MENOR" | "ACERTOU";

export interface LevelConfig {
  nivel: NivelId;
  nome: string;
  subtitulo: string;
  min: number;
  max: number;
  idealTentativas: number;
  pesoRanking: number;
}

export const LEVELS: Record<NivelId, LevelConfig> = {
  1: {
    nivel: 1,
    nome: "Iniciante",
    subtitulo: "Números de 1 a 10",
    min: 1,
    max: 10,
    idealTentativas: 4,
    pesoRanking: 100,
  },
  2: {
    nivel: 2,
    nome: "Intermediário",
    subtitulo: "Números de 1 a 100",
    min: 1,
    max: 100,
    idealTentativas: 7,
    pesoRanking: 250,
  },
  3: {
    nivel: 3,
    nome: "Avançado",
    subtitulo: "Números de 1 a 1000",
    min: 1,
    max: 1000,
    idealTentativas: 10,
    pesoRanking: 500,
  },
};

export function isValidLevel(value: unknown): value is NivelId {
  return value === 1 || value === 2 || value === 3;
}

export function getLevelConfig(nivel: NivelId): LevelConfig {
  return LEVELS[nivel];
}

export interface GuessValidation {
  valid: boolean;
  value?: number;
  error?: string;
}

export function validateGuessInput(
  raw: unknown,
  min: number,
  max: number,
  usedNumbers: Iterable<number>
): GuessValidation {
  if (raw === null || raw === undefined) {
    return { valid: false, error: "Informe um número antes de chutar." };
  }

  const str = String(raw).trim();
  if (str.length === 0) {
    return { valid: false, error: "O campo não pode ficar vazio." };
  }

  if (!/^-?\d+$/.test(str)) {
    return {
      valid: false,
      error: "Digite apenas números inteiros (sem decimais ou letras).",
    };
  }

  const num = Number(str);
  if (!Number.isSafeInteger(num)) {
    return { valid: false, error: "Número inválido." };
  }

  if (num < min || num > max) {
    return {
      valid: false,
      error: `O número deve estar entre ${min} e ${max}.`,
    };
  }

  const usedSet = usedNumbers instanceof Set ? usedNumbers : new Set(usedNumbers);
  if (usedSet.has(num)) {
    return {
      valid: false,
      error: `Você já chutou o número ${num} nesta partida.`,
    };
  }

  return { valid: true, value: num };
}

export interface RulerState {
  minPossivel: number;
  maxPossivel: number;
  lastGuess: number | null;
  lastResult: GuessResult | null;
  remainingCount: number;
  suggestedNext: number;
}

export interface AttemptSummary {
  numero_chutado: number;
  resultado: GuessResult;
  numero_tentativa: number;
}

export interface AttemptRecord extends AttemptSummary {
  id: string;
  data_tentativa: string;
}

export interface ActiveGameView {
  id: string;
  nivel: NivelId;
  tentativasCount: number;
  acertou: boolean;
  tempoSegundos: number;
  dataPartida: string;
  finalizadaEm: string | null;
  numeroSecreto: number | null;
  attempts: AttemptRecord[];
  ruler: RulerState;
  performance: PerformanceEvaluation | null;
}

export interface RankingEntry {
  posicao: number;
  jogadorId: string;
  nome: string;
  tentativas: number;
  tempoSegundos: number;
  partidasRealizadas: number;
  vitorias: number;
  pontuacaoNormalizada?: number;
  niveisVencidos?: number[];
  finalizadaEm: string;
}

export interface HistoryMatchSummary {
  id: string;
  nivel: NivelId;
  tentativas: number;
  acertou: boolean;
  tempoSegundos: number;
  numeroSecreto: number | null;
  dataPartida: string;
  finalizadaEm: string | null;
}

export function computeRulerState(
  nivel: NivelId,
  attempts: AttemptSummary[]
): RulerState {
  const cfg = LEVELS[nivel];
  let minPossivel = cfg.min;
  let maxPossivel = cfg.max;
  let lastGuess: number | null = null;
  let lastResult: GuessResult | null = null;

  for (const att of attempts) {
    lastGuess = att.numero_chutado;
    lastResult = att.resultado;
    if (att.resultado === "MAIOR") {
      minPossivel = Math.max(minPossivel, att.numero_chutado + 1);
    } else if (att.resultado === "MENOR") {
      maxPossivel = Math.min(maxPossivel, att.numero_chutado - 1);
    } else if (att.resultado === "ACERTOU") {
      minPossivel = att.numero_chutado;
      maxPossivel = att.numero_chutado;
    }
  }

  if (minPossivel > maxPossivel) {
    minPossivel = cfg.min;
    maxPossivel = cfg.max;
  }

  const remainingCount = maxPossivel - minPossivel + 1;
  const suggestedNext = Math.floor((minPossivel + maxPossivel) / 2);

  return {
    minPossivel,
    maxPossivel,
    lastGuess,
    lastResult,
    remainingCount,
    suggestedNext,
  };
}

export interface PerformanceEvaluation {
  titulo: string;
  descricao: string;
  isIdeal: boolean;
  idealTentativas: number;
}

export function evaluatePerformance(
  nivel: NivelId,
  tentativas: number
): PerformanceEvaluation {
  const { idealTentativas } = LEVELS[nivel];

  if (tentativas <= Math.max(1, Math.floor(idealTentativas / 2))) {
    return {
      titulo: "Instinto Extraordinário!",
      descricao: `Você superou até mesmo o limite da busca binária ideal (${idealTentativas} tentativas).`,
      isIdeal: true,
      idealTentativas,
    };
  }

  if (tentativas <= idealTentativas) {
    return {
      titulo: "Mestre da Busca Binária!",
      descricao: `Excelente estratégia! Você acertou dentro do limite ideal de ${idealTentativas} tentativas.`,
      isIdeal: true,
      idealTentativas,
    };
  }

  if (tentativas <= idealTentativas + 3) {
    return {
      titulo: "Ótimo Desempenho!",
      descricao: `Muito perto da busca binária ideal (${idealTentativas} tentativas).`,
      isIdeal: false,
      idealTentativas,
    };
  }

  return {
    titulo: "Vitória Conquistada!",
    descricao: `Dica: dividir o intervalo ao meio ajuda a chegar em até ${idealTentativas} tentativas.`,
    isIdeal: false,
    idealTentativas,
  };
}

export function computeNormalizedLevelScore(
  nivel: NivelId,
  bestTentativas: number
): number {
  const cfg = LEVELS[nivel];
  if (bestTentativas <= 0) return 0;
  const efficiency = Math.min(2, cfg.idealTentativas / bestTentativas);
  return Math.round(cfg.pesoRanking * efficiency);
}

export function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  if (safe < 60) {
    return `${safe}s`;
  }
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  if (mins < 60) {
    return secs === 0 ? `${mins}m` : `${mins}m ${secs}s`;
  }
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hours}h ${remMins}m`;
}
