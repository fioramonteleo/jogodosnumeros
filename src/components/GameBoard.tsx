"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Clock,
  Compass,
  Database,
  Gamepad2,
  History,
  LogOut,
  Play,
  Send,
  Trophy,
  User,
} from "lucide-react";
import {
  formatDuration,
  getLevelConfig,
  LEVELS,
  validateGuessInput,
  type ActiveGameView,
  type GuessResult,
  type NivelId,
} from "@/lib/game-config";
import { HistorySection } from "./HistorySection";
import { RankingSection } from "./RankingSection";
import { VictoryModal } from "./VictoryModal";
import { WoodenRuler } from "./WoodenRuler";

type MainTab = "jogar" | "ranking" | "historico";

interface PlayerInfo {
  id: string;
  nome: string;
}

const ACTIVE_GAME_STORAGE_KEY = "leo_active_game_id";

export function GameBoard() {
  const [activeTab, setActiveTab] = useState<MainTab>("jogar");
  const [player, setPlayer] = useState<PlayerInfo | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [nameInput, setNameInput] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [dbMissing, setDbMissing] = useState(false);

  const [game, setGame] = useState<ActiveGameView | null>(null);
  const [startingLevel, setStartingLevel] = useState<NivelId | null>(null);
  const [guessInput, setGuessInput] = useState("");
  const [guessError, setGuessError] = useState<string | null>(null);
  const [submittingGuess, setSubmittingGuess] = useState(false);
  const [feedback, setFeedback] = useState<{
    resultado: GuessResult;
    mensagem: string;
  } | null>(null);

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const guessInputRef = useRef<HTMLInputElement>(null);

  // Carregar sessão e partida ativa ao abrir/atualizar a página
  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      setAuthLoading(true);
      try {
        const res = await fetch("/api/auth/session", { cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;

        if (res.status === 503 && data.code === "DATABASE_NOT_CONFIGURED") {
          setDbMissing(true);
          setAuthLoading(false);
          return;
        }

        if (res.ok && data.player) {
          setPlayer(data.player);
          const savedGameId = window.sessionStorage.getItem(ACTIVE_GAME_STORAGE_KEY);
          if (savedGameId) {
            const gameRes = await fetch(`/api/games/${savedGameId}`, {
              cache: "no-store",
            });
            if (gameRes.ok) {
              const gameData = await gameRes.json();
              if (!cancelled && gameData.game) {
                setGame(gameData.game);
                setElapsedSeconds(gameData.game.tempoSegundos ?? 0);
                if (gameData.game.attempts.length > 0) {
                  const last =
                    gameData.game.attempts[gameData.game.attempts.length - 1];
                  setFeedback({
                    resultado: last.resultado,
                    mensagem:
                      last.resultado === "MAIOR"
                        ? "O NÚMERO É MAIOR!"
                        : last.resultado === "MENOR"
                          ? "O NÚMERO É MENOR!"
                          : "PARABÉNS! VOCÊ ACERTOU!",
                  });
                }
              }
            } else {
              window.sessionStorage.removeItem(ACTIVE_GAME_STORAGE_KEY);
            }
          }
        }
      } catch {
        // Ignora erro silencioso na inicialização
      } finally {
        if (!cancelled) setAuthLoading(false);
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  // Cronômetro ao vivo durante a partida
  useEffect(() => {
    if (!game || game.acertou) return;
    setElapsedSeconds(game.tempoSegundos);
    const interval = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [game]);

  const usedNumbers = useMemo(() => {
    if (!game) return new Set<number>();
    return new Set(game.attempts.map((a) => a.numero_chutado));
  }, [game]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setAuthError(null);
    const trimmed = nameInput.trim();
    if (trimmed.length < 2 || trimmed.length > 40) {
      setAuthError("Digite um nome com pelo menos 2 letras (máximo 40).");
      return;
    }

    setAuthLoading(true);
    try {
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === "DATABASE_NOT_CONFIGURED") {
          setDbMissing(true);
        }
        setAuthError(data.error ?? "Não foi possível entrar.");
        return;
      }
      setPlayer(data.player);
      setNameInput("");
    } catch {
      setAuthError("Erro de conexão ao registrar jogador.");
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/session", { method: "DELETE" });
    window.sessionStorage.removeItem(ACTIVE_GAME_STORAGE_KEY);
    setPlayer(null);
    setGame(null);
    setFeedback(null);
    setGuessInput("");
    setGuessError(null);
    setActiveTab("jogar");
  }

  async function handleStartGame(nivel: NivelId) {
    setStartingLevel(nivel);
    setGuessError(null);
    setFeedback(null);
    setGuessInput("");

    try {
      const res = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nivel }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === "DATABASE_NOT_CONFIGURED") {
          setDbMissing(true);
        }
        setGuessError(data.error ?? "Não foi possível iniciar a partida.");
        return;
      }

      setGame(data.game);
      setElapsedSeconds(0);
      window.sessionStorage.setItem(ACTIVE_GAME_STORAGE_KEY, data.game.id);
      setActiveTab("jogar");
      setTimeout(() => guessInputRef.current?.focus(), 60);
    } catch {
      setGuessError("Erro de conexão ao iniciar partida.");
    } finally {
      setStartingLevel(null);
    }
  }

  async function handleSubmitGuess(e: React.FormEvent) {
    e.preventDefault();
    if (!game || game.acertou || submittingGuess) return;

    const cfg = getLevelConfig(game.nivel);
    const localValidation = validateGuessInput(
      guessInput,
      cfg.min,
      cfg.max,
      usedNumbers
    );
    if (!localValidation.valid) {
      setGuessError(localValidation.error ?? "Número inválido.");
      return;
    }

    setGuessError(null);
    setSubmittingGuess(true);

    try {
      const res = await fetch(`/api/games/${game.id}/guess`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numero: localValidation.value }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGuessError(data.error ?? "Não foi possível registrar o chute.");
        return;
      }

      setGame(data.game);
      setFeedback({
        resultado: data.resultado,
        mensagem: data.mensagem,
      });
      setGuessInput("");

      if (data.game.acertou) {
        window.sessionStorage.removeItem(ACTIVE_GAME_STORAGE_KEY);
        setRefreshTrigger((n) => n + 1);
      } else {
        setTimeout(() => guessInputRef.current?.focus(), 40);
      }
    } catch {
      setGuessError("Erro de conexão ao enviar chute.");
    } finally {
      setSubmittingGuess(false);
    }
  }

  function handleChooseOtherLevel() {
    window.sessionStorage.removeItem(ACTIVE_GAME_STORAGE_KEY);
    setGame(null);
    setFeedback(null);
    setGuessInput("");
    setGuessError(null);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-9">
      {/* Cabeçalho Rústico — Placa de Madeira */}
      <header className="wood-plaque mb-6 rounded-3xl px-5 py-5 text-[#F4EBDD] sm:px-8 sm:py-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#E8D8B9]/85">
              Desafio de Lógica &amp; Busca Binária
            </p>
            <h1 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-extrabold tracking-tight text-[#F4EBDD] sm:text-4xl">
              JOGO DOS NÚMEROS DO LEO
            </h1>
          </div>

          {player && (
            <div className="flex items-center gap-2.5 rounded-2xl border border-[#A8794D]/60 bg-[#38251B]/70 px-3.5 py-2">
              <User className="h-4 w-4 text-[#E8D8B9]" />
              <span className="text-sm font-semibold text-[#F4EBDD]">
                {player.nome}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                title="Trocar de jogador"
                className="ml-1 inline-flex items-center gap-1 rounded-lg border border-[#A8794D]/50 bg-[#68452F] px-2 py-1 text-[11px] font-semibold text-[#F4EBDD] transition hover:bg-[#A8794D]"
              >
                <LogOut className="h-3 w-3" />
                Trocar
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Aviso caso DATABASE_URL ainda não esteja configurada */}
      {dbMissing && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border-2 border-[#A8794D] bg-[#E8D8B9] p-4 text-[#38251B]">
          <Database className="mt-0.5 h-5 w-5 shrink-0 text-[#68452F]" />
          <div className="text-sm">
            <p className="font-bold">Banco de dados Neon PostgreSQL não configurado</p>
            <p className="mt-0.5 text-[#38251B]/90">
              Configure a variável <code className="rounded bg-[#38251B]/10 px-1.5 py-0.5 font-mono text-xs">DATABASE_URL</code> no arquivo <code className="rounded bg-[#38251B]/10 px-1.5 py-0.5 font-mono text-xs">.env.local</code> (ou nas Environment Variables da Vercel) e execute <code className="rounded bg-[#38251B]/10 px-1.5 py-0.5 font-mono text-xs">npm run db:migrate</code>.
            </p>
          </div>
        </div>
      )}

      {/* Navegação Principal */}
      <nav
        aria-label="Navegação principal"
        className="mb-6 grid grid-cols-3 gap-2.5 sm:inline-flex"
      >
        <button
          type="button"
          onClick={() => setActiveTab("jogar")}
          className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition ${
            activeTab === "jogar"
              ? "wood-plaque text-[#F4EBDD]"
              : "paper-card text-[#38251B] hover:bg-[#E8D8B9]"
          }`}
        >
          <Gamepad2 className="h-4 w-4" />
          <span>Jogar</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("ranking")}
          className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition ${
            activeTab === "ranking"
              ? "wood-plaque text-[#F4EBDD]"
              : "paper-card text-[#38251B] hover:bg-[#E8D8B9]"
          }`}
        >
          <Trophy className="h-4 w-4" />
          <span>Ranking do Leo</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("historico")}
          className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition ${
            activeTab === "historico"
              ? "wood-plaque text-[#F4EBDD]"
              : "paper-card text-[#38251B] hover:bg-[#E8D8B9]"
          }`}
        >
          <History className="h-4 w-4" />
          <span>Meu Histórico</span>
        </button>
      </nav>

      {/* Conteúdo da Aba Ativa */}
      {activeTab === "ranking" ? (
        <RankingSection
          currentPlayerId={player?.id}
          refreshTrigger={refreshTrigger}
        />
      ) : activeTab === "historico" ? (
        <HistorySection
          playerId={player?.id ?? null}
          refreshTrigger={refreshTrigger}
        />
      ) : authLoading ? (
        <div className="paper-card rounded-3xl p-10 text-center text-sm text-[#68452F]">
          Preparando a mesa de jogo...
        </div>
      ) : !player ? (
        /* Tela de Identificação do Jogador */
        <section className="paper-card mx-auto max-w-xl rounded-3xl p-6 sm:p-8">
          <div className="text-center">
            <div className="wood-plaque mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl text-[#F4EBDD]">
              <User className="h-7 w-7" />
            </div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[#38251B] sm:text-3xl">
              Quem vai jogar?
            </h2>
            <p className="mt-1.5 font-[family-name:var(--font-serif)] text-sm text-[#68452F]">
              Informe seu nome para registrar suas partidas, acompanhar seu histórico e disputar o Ranking do Leo.
            </p>
          </div>

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="player-name"
                className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#68452F]"
              >
                Nome do Jogador
              </label>
              <input
                id="player-name"
                type="text"
                maxLength={40}
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Ex.: Leo, Maria, João..."
                className="w-full rounded-xl border-2 border-[#A8794D] bg-[#F4EBDD] px-4 py-3 text-base font-semibold text-[#38251B] placeholder:text-[#68452F]/50 focus:border-[#68452F] focus:outline-hidden"
              />
            </div>

            {authError && (
              <p className="rounded-xl border border-[#8B3A2B]/40 bg-[#8B3A2B]/10 px-3.5 py-2.5 text-sm font-medium text-[#6B261A]">
                {authError}
              </p>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="wood-btn flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-base font-bold tracking-wide"
            >
              <Play className="h-4 w-4" />
              ENTRAR NA MESA
            </button>
          </form>
        </section>
      ) : !game ? (
        /* Seleção de Níveis */
        <section className="space-y-6">
          <div className="paper-card rounded-3xl p-6 sm:p-7">
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[#38251B]">
              Escolha o Nível de Desafio
            </h2>
            <p className="mt-1 font-[family-name:var(--font-serif)] text-sm text-[#68452F]">
              O sistema sorteará um número secreto. Use a estratégia da busca binária para encontrá-lo com o menor número de chutes!
            </p>

            {guessError && (
              <p className="mt-3 rounded-xl border border-[#8B3A2B]/40 bg-[#8B3A2B]/10 px-3.5 py-2.5 text-sm font-medium text-[#6B261A]">
                {guessError}
              </p>
            )}

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {([1, 2, 3] as NivelId[]).map((nivel) => {
                const cfg = LEVELS[nivel];
                const isStarting = startingLevel === nivel;
                return (
                  <div
                    key={nivel}
                    className="flex flex-col justify-between rounded-2xl border-2 border-[#C5A882] bg-[#F4EBDD]/90 p-5 transition hover:border-[#68452F]"
                  >
                    <div>
                      <span className="inline-block rounded-lg bg-[#A8794D]/25 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-[#68452F]">
                        Nível {cfg.nivel}
                      </span>
                      <h3 className="mt-2.5 font-[family-name:var(--font-display)] text-2xl font-bold text-[#38251B]">
                        {cfg.nome}
                      </h3>
                      <p className="mt-1 font-[family-name:var(--font-mono)] text-sm font-bold text-[#69734A]">
                        {cfg.subtitulo}
                      </p>
                      <p className="mt-2 text-xs text-[#68452F]">
                        Busca binária ideal: até{" "}
                        <strong>{cfg.idealTentativas} tentativas</strong>.
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={startingLevel !== null}
                      onClick={() => handleStartGame(nivel)}
                      className="wood-btn mt-5 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold tracking-wide"
                    >
                      <Play className="h-4 w-4" />
                      {isStarting ? "SORTEANDO..." : "INICIAR PARTIDA"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      ) : (
        /* Mesa de Jogo Ativa */
        <div className="space-y-5">
          {/* Barra superior da partida */}
          <section className="paper-card rounded-3xl p-5 sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#C5A882]/70 pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-[#69734A]">
                  Nível {game.nivel} — {getLevelConfig(game.nivel).nome}
                </span>
                <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[#38251B]">
                  Descubra o Número Secreto ({getLevelConfig(game.nivel).min} a{" "}
                  {getLevelConfig(game.nivel).max})
                </h2>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 rounded-xl border border-[#C5A882] bg-[#F4EBDD] px-3 py-1.5 font-[family-name:var(--font-mono)] text-sm font-bold text-[#38251B]">
                  <Clock className="h-4 w-4 text-[#A8794D]" />
                  {formatDuration(elapsedSeconds)}
                </div>

                <button
                  type="button"
                  onClick={handleChooseOtherLevel}
                  className="rounded-xl border border-[#A8794D] bg-[#F4EBDD] px-3 py-1.5 text-xs font-bold text-[#38251B] transition hover:bg-[#E8D8B9]"
                >
                  Trocar Nível
                </button>
              </div>
            </div>

            {/* Formulário de Chute */}
            <form
              onSubmit={handleSubmitGuess}
              className="mt-5 flex flex-col gap-3 sm:flex-row"
            >
              <div className="flex-1">
                <label htmlFor="guess-input" className="sr-only">
                  Seu chute
                </label>
                <input
                  ref={guessInputRef}
                  id="guess-input"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  disabled={game.acertou || submittingGuess}
                  value={guessInput}
                  onChange={(e) => {
                    setGuessInput(e.target.value);
                    if (guessError) setGuessError(null);
                  }}
                  placeholder={`Digite um número entre ${getLevelConfig(game.nivel).min} e ${getLevelConfig(game.nivel).max}...`}
                  className="w-full rounded-xl border-2 border-[#A8794D] bg-[#F4EBDD] px-4 py-3.5 font-[family-name:var(--font-mono)] text-lg font-bold text-[#38251B] placeholder:font-[family-name:var(--font-sans)] placeholder:text-sm placeholder:font-normal placeholder:text-[#68452F]/60 focus:border-[#68452F] focus:outline-hidden"
                />
              </div>

              <button
                type="submit"
                disabled={game.acertou || submittingGuess}
                className="olive-btn flex items-center justify-center gap-2 rounded-xl px-7 py-3.5 text-base font-extrabold tracking-wider"
              >
                <Send className="h-4 w-4" />
                {submittingGuess ? "ENVIANDO..." : "CHUTAR"}
              </button>
            </form>

            {guessError && (
              <p
                role="alert"
                className="mt-3 rounded-xl border border-[#8B3A2B]/40 bg-[#8B3A2B]/10 px-4 py-2.5 text-sm font-semibold text-[#6B261A]"
              >
                {guessError}
              </p>
            )}

            {/* Banner de Feedback */}
            {feedback && (
              <div
                role="status"
                className={`mt-4 flex items-center gap-3 rounded-2xl border-2 px-4 py-3.5 ${
                  feedback.resultado === "ACERTOU"
                    ? "border-[#69734A] bg-[#69734A]/20 text-[#38251B]"
                    : feedback.resultado === "MAIOR"
                      ? "border-[#A8794D] bg-[#A8794D]/20 text-[#38251B]"
                      : "border-[#68452F] bg-[#68452F]/15 text-[#38251B]"
                }`}
              >
                {feedback.resultado === "MAIOR" ? (
                  <ArrowUp className="h-6 w-6 shrink-0 text-[#69734A]" />
                ) : feedback.resultado === "MENOR" ? (
                  <ArrowDown className="h-6 w-6 shrink-0 text-[#68452F]" />
                ) : (
                  <CheckCircle2 className="h-6 w-6 shrink-0 text-[#69734A]" />
                )}
                <div>
                  <p className="font-[family-name:var(--font-display)] text-lg font-extrabold tracking-wide">
                    {feedback.mensagem}
                  </p>
                  {feedback.resultado !== "ACERTOU" && game.ruler.lastGuess !== null && (
                    <p className="text-xs text-[#68452F]">
                      {feedback.resultado === "MAIOR"
                        ? `O número secreto é maior que ${game.ruler.lastGuess}.`
                        : `O número secreto é menor que ${game.ruler.lastGuess}.`}
                    </p>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* Régua Interativa */}
          <WoodenRuler
            minTotal={getLevelConfig(game.nivel).min}
            maxTotal={getLevelConfig(game.nivel).max}
            tentativasCount={game.tentativasCount}
            ruler={game.ruler}
            acertou={game.acertou}
            onUseSuggestion={(val) => {
              setGuessInput(String(val));
              setGuessError(null);
              guessInputRef.current?.focus();
            }}
          />

          {/* Histórico de chutes da partida atual */}
          {game.attempts.length > 0 && (
            <section className="paper-card rounded-2xl p-5">
              <h3 className="mb-3 flex items-center gap-2 font-[family-name:var(--font-display)] text-base font-bold text-[#38251B]">
                <Compass className="h-4 w-4 text-[#A8794D]" />
                Tentativas desta Partida ({game.attempts.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {[...game.attempts].reverse().map((att) => (
                  <div
                    key={att.id}
                    className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 font-[family-name:var(--font-mono)] text-xs font-bold ${
                      att.resultado === "ACERTOU"
                        ? "border-[#69734A] bg-[#69734A] text-[#F4EBDD]"
                        : "border-[#C5A882] bg-[#F4EBDD] text-[#38251B]"
                    }`}
                  >
                    <span className="opacity-65">#{att.numero_tentativa}</span>
                    <span className="text-sm">{att.numero_chutado}</span>
                    <span className="rounded bg-[#38251B]/10 px-1.5 py-0.5 text-[10px]">
                      {att.resultado}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Modal de Vitória */}
      {game && game.acertou && (
        <VictoryModal
          game={game}
          onPlayAgain={() => handleStartGame(game.nivel)}
          onChooseLevel={handleChooseOtherLevel}
          loading={startingLevel !== null}
        />
      )}
    </div>
  );
}
