"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronRight, History, RefreshCw, X } from "lucide-react";
import {
  formatDuration,
  getLevelConfig,
  type ActiveGameView,
  type HistoryMatchSummary,
} from "@/lib/game-config";

interface HistorySectionProps {
  playerId: string | null;
  refreshTrigger: number;
}

export function HistorySection({ playerId, refreshTrigger }: HistorySectionProps) {
  const [matches, setMatches] = useState<HistoryMatchSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<ActiveGameView | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const loadHistory = useCallback(async () => {
    if (!playerId) {
      setMatches([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/history", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Não foi possível carregar o histórico.");
        return;
      }
      setMatches(data.matches ?? []);
    } catch {
      setError("Erro de conexão ao buscar histórico.");
    } finally {
      setLoading(false);
    }
  }, [playerId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory, refreshTrigger]);

  async function openDetails(matchId: string) {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/games/${matchId}`, { cache: "no-store" });
      const data = await res.json();
      if (res.ok && data.game) {
        setSelectedMatch(data.game);
      }
    } finally {
      setLoadingDetail(false);
    }
  }

  if (!playerId) {
    return (
      <section className="paper-card rounded-3xl p-8 text-center">
        <History className="mx-auto h-10 w-10 text-[#68452F]" />
        <h2 className="mt-3 font-[family-name:var(--font-display)] text-2xl font-bold text-[#38251B]">
          MEU HISTÓRICO
        </h2>
        <p className="mt-1 text-sm text-[#68452F]">
          Informe seu nome na aba Jogar para registrar e consultar suas partidas.
        </p>
      </section>
    );
  }

  return (
    <section className="paper-card rounded-3xl p-5 sm:p-7">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="wood-plaque flex h-11 w-11 items-center justify-center rounded-xl text-[#F4EBDD]">
            <History className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[#38251B]">
              MEU HISTÓRICO
            </h2>
            <p className="text-xs text-[#68452F]">
              Clique em uma partida para revisar cada chute e resposta
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadHistory}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[#A8794D] bg-[#F4EBDD] px-3 py-2 text-xs font-semibold text-[#38251B] transition hover:bg-[#E8D8B9]"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-[#8B3A2B]/40 bg-[#8B3A2B]/10 p-4 text-sm text-[#6B261A]">
          {error}
        </div>
      ) : loading ? (
        <div className="py-10 text-center text-sm text-[#68452F]">
          Carregando suas partidas...
        </div>
      ) : matches.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#A8794D] bg-[#F4EBDD]/60 py-10 text-center">
          <p className="font-[family-name:var(--font-display)] text-lg font-bold text-[#38251B]">
            Você ainda não jogou nenhuma partida
          </p>
          <p className="mt-1 text-sm text-[#68452F]">
            Escolha um nível na aba Jogar para começar!
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {matches.map((m) => {
            const cfg = getLevelConfig(m.nivel);
            const dateStr = new Date(m.dataPartida).toLocaleString("pt-BR", {
              dateStyle: "short",
              timeStyle: "short",
            });
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => openDetails(m.id)}
                className="flex w-full flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#C5A882] bg-[#F4EBDD]/85 px-4 py-3.5 text-left transition hover:border-[#68452F] hover:bg-[#E8D8B9]/65"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
                      m.acertou
                        ? "bg-[#69734A] text-[#F4EBDD]"
                        : "bg-[#A8794D]/30 text-[#38251B]"
                    }`}
                  >
                    {m.acertou ? "Vitória" : "Em andamento"}
                  </span>
                  <div>
                    <p className="font-bold text-[#38251B]">
                      Nível {cfg.nivel} — {cfg.nome}
                    </p>
                    <p className="text-xs text-[#68452F]">{dateStr}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 font-[family-name:var(--font-mono)] text-xs sm:text-sm">
                  <div className="text-right">
                    <span className="block text-[10px] uppercase text-[#68452F]">
                      Chutes
                    </span>
                    <span className="font-bold text-[#38251B]">{m.tentativas}</span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[10px] uppercase text-[#68452F]">
                      Tempo
                    </span>
                    <span className="font-bold text-[#38251B]">
                      {formatDuration(m.tempoSegundos)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[10px] uppercase text-[#68452F]">
                      Secreto
                    </span>
                    <span className="font-bold text-[#38251B]">
                      {m.acertou && m.numeroSecreto !== null ? m.numeroSecreto : "???"}
                    </span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[#68452F]" />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Modal de Detalhes da Partida */}
      {(selectedMatch || loadingDetail) && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#38251B]/65 p-4 backdrop-blur-xs"
        >
          <div className="paper-card max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-3xl border-2 border-[#68452F] p-6">
            {loadingDetail || !selectedMatch ? (
              <p className="py-8 text-center text-sm text-[#68452F]">
                Carregando detalhes da partida...
              </p>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-[#69734A]">
                      Detalhes da Partida
                    </p>
                    <h3 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[#38251B]">
                      Nível {selectedMatch.nivel} —{" "}
                      {getLevelConfig(selectedMatch.nivel).nome}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedMatch(null)}
                    className="rounded-lg border border-[#C5A882] bg-[#F4EBDD] p-1.5 text-[#38251B] hover:bg-[#E8D8B9]"
                    aria-label="Fechar detalhes"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2.5 text-center font-[family-name:var(--font-mono)]">
                  <div className="rounded-xl border border-[#C5A882] bg-[#F4EBDD] p-2.5">
                    <span className="block text-[10px] uppercase text-[#68452F]">
                      Chutes
                    </span>
                    <span className="text-lg font-bold text-[#38251B]">
                      {selectedMatch.tentativasCount}
                    </span>
                  </div>
                  <div className="rounded-xl border border-[#C5A882] bg-[#F4EBDD] p-2.5">
                    <span className="block text-[10px] uppercase text-[#68452F]">
                      Tempo
                    </span>
                    <span className="text-lg font-bold text-[#38251B]">
                      {formatDuration(selectedMatch.tempoSegundos)}
                    </span>
                  </div>
                  <div className="rounded-xl border border-[#C5A882] bg-[#F4EBDD] p-2.5">
                    <span className="block text-[10px] uppercase text-[#68452F]">
                      Secreto
                    </span>
                    <span className="text-lg font-bold text-[#38251B]">
                      {selectedMatch.acertou ? selectedMatch.numeroSecreto : "???"}
                    </span>
                  </div>
                </div>

                <h4 className="mt-5 mb-2 text-xs font-bold uppercase tracking-wider text-[#68452F]">
                  Sequência de Tentativas
                </h4>

                {selectedMatch.attempts.length === 0 ? (
                  <p className="text-sm text-[#68452F]">
                    Nenhum chute registrado nesta partida.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedMatch.attempts.map((att) => (
                      <div
                        key={att.id}
                        className="flex items-center justify-between rounded-xl border border-[#C5A882] bg-[#F4EBDD]/80 px-3.5 py-2 text-sm"
                      >
                        <span className="font-[family-name:var(--font-mono)] text-xs text-[#68452F]">
                          #{att.numero_tentativa}
                        </span>
                        <span className="font-[family-name:var(--font-mono)] text-base font-bold text-[#38251B]">
                          {att.numero_chutado}
                        </span>
                        <span
                          className={`rounded-md px-2.5 py-0.5 text-xs font-bold ${
                            att.resultado === "ACERTOU"
                              ? "bg-[#69734A] text-[#F4EBDD]"
                              : att.resultado === "MAIOR"
                                ? "bg-[#A8794D]/25 text-[#38251B]"
                                : "bg-[#68452F]/20 text-[#38251B]"
                          }`}
                        >
                          {att.resultado}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
