"use client";

import { useCallback, useEffect, useState } from "react";
import { Medal, RefreshCw, Trophy } from "lucide-react";
import { formatDuration, type RankingEntry } from "@/lib/game-config";

type RankingTab = "geral" | "1" | "2" | "3";

interface RankingSectionProps {
  currentPlayerId?: string | null;
  refreshTrigger: number;
}

const TABS: { id: RankingTab; label: string }[] = [
  { id: "geral", label: "Ranking Geral" },
  { id: "1", label: "Nível 1 (1–10)" },
  { id: "2", label: "Nível 2 (1–100)" },
  { id: "3", label: "Nível 3 (1–1000)" },
];

function MedalBadge({ pos }: { pos: number }) {
  if (pos === 1) {
    return (
      <span
        title="1º Lugar — Ouro"
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#B8860B] bg-[#F5D061] text-[#5C3C00] shadow-xs"
      >
        <Medal className="h-4 w-4" />
      </span>
    );
  }
  if (pos === 2) {
    return (
      <span
        title="2º Lugar — Prata"
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#8C9298] bg-[#E2E6EA] text-[#3B4045] shadow-xs"
      >
        <Medal className="h-4 w-4" />
      </span>
    );
  }
  if (pos === 3) {
    return (
      <span
        title="3º Lugar — Bronze"
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#8D5524] bg-[#D99B66] text-[#4A2506] shadow-xs"
      >
        <Medal className="h-4 w-4" />
      </span>
    );
  }
  return (
    <span className="inline-flex h-8 w-8 items-center justify-center font-[family-name:var(--font-mono)] text-sm font-bold text-[#68452F]">
      #{pos}
    </span>
  );
}

export function RankingSection({
  currentPlayerId,
  refreshTrigger,
}: RankingSectionProps) {
  const [activeTab, setActiveTab] = useState<RankingTab>("geral");
  const [entries, setEntries] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRanking = useCallback(async (tab: RankingTab) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ranking?nivel=${tab}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Não foi possível carregar o ranking.");
        setEntries([]);
        return;
      }
      setEntries(data.entries ?? []);
    } catch {
      setError("Erro de conexão ao buscar o ranking.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRanking(activeTab);
  }, [activeTab, refreshTrigger, loadRanking]);

  return (
    <section className="paper-card rounded-3xl p-5 sm:p-7">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="wood-plaque flex h-11 w-11 items-center justify-center rounded-xl text-[#F4EBDD]">
            <Trophy className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[#38251B]">
              RANKING DO LEO
            </h2>
            <p className="text-xs text-[#68452F]">
              Quem acertar com menos chutes conquista o topo. Empates são decididos pelo menor tempo.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => loadRanking(activeTab)}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[#A8794D] bg-[#F4EBDD] px-3 py-2 text-xs font-semibold text-[#38251B] transition hover:bg-[#E8D8B9]"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </button>
      </div>

      {/* Abas dos 4 rankings */}
      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition sm:text-sm ${
                active
                  ? "wood-plaque text-[#F4EBDD]"
                  : "border border-[#C5A882] bg-[#F4EBDD]/80 text-[#38251B] hover:bg-[#E8D8B9]"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "geral" && (
        <p className="mb-4 rounded-xl border border-[#C5A882]/80 bg-[#F4EBDD]/70 px-3.5 py-2.5 text-xs text-[#68452F]">
          No <strong>Ranking Geral</strong>, cada jogador soma sua pontuação normalizada de acordo com a dificuldade (Nível 1, 2 e 3), considerando seu melhor resultado em cada nível.
        </p>
      )}

      {error ? (
        <div className="rounded-xl border border-[#8B3A2B]/40 bg-[#8B3A2B]/10 p-4 text-sm text-[#6B261A]">
          {error}
        </div>
      ) : loading ? (
        <div className="py-10 text-center text-sm text-[#68452F]">
          Carregando classificação...
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#A8794D] bg-[#F4EBDD]/60 py-10 text-center">
          <p className="font-[family-name:var(--font-display)] text-lg font-bold text-[#38251B]">
            Nenhuma vitória registrada ainda
          </p>
          <p className="mt-1 text-sm text-[#68452F]">
            Seja o primeiro a vencer nesta categoria para inaugurar o quadro!
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b-2 border-[#A8794D]/60 text-xs uppercase tracking-wider text-[#68452F]">
                <th className="py-3 pr-3">Posição</th>
                <th className="px-3 py-3">Jogador</th>
                {activeTab === "geral" && <th className="px-3 py-3 text-right">Pontos</th>}
                <th className="px-3 py-3 text-right">
                  {activeTab === "geral" ? "Chutes (Soma)" : "Melhor Chutes"}
                </th>
                <th className="px-3 py-3 text-right">Tempo</th>
                <th className="px-3 py-3 text-right">Partidas</th>
                <th className="py-3 pl-3 text-right">Vitórias</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#C5A882]/60">
              {entries.map((entry) => {
                const isMe = currentPlayerId && entry.jogadorId === currentPlayerId;
                return (
                  <tr
                    key={entry.jogadorId}
                    className={`transition ${
                      isMe
                        ? "bg-[#69734A]/15 font-semibold"
                        : "hover:bg-[#E8D8B9]/40"
                    }`}
                  >
                    <td className="py-3 pr-3">
                      <MedalBadge pos={entry.posicao} />
                    </td>
                    <td className="px-3 py-3 text-[#38251B]">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{entry.nome}</span>
                        {isMe && (
                          <span className="rounded-md bg-[#69734A] px-2 py-0.5 text-[10px] font-bold uppercase text-[#F4EBDD]">
                            Você
                          </span>
                        )}
                      </div>
                    </td>
                    {activeTab === "geral" && (
                      <td className="px-3 py-3 text-right font-[family-name:var(--font-mono)] font-bold text-[#69734A]">
                        {entry.pontuacaoNormalizada ?? 0}
                      </td>
                    )}
                    <td className="px-3 py-3 text-right font-[family-name:var(--font-mono)] font-bold text-[#38251B]">
                      {entry.tentativas}
                    </td>
                    <td className="px-3 py-3 text-right font-[family-name:var(--font-mono)] text-[#68452F]">
                      {formatDuration(entry.tempoSegundos)}
                    </td>
                    <td className="px-3 py-3 text-right font-[family-name:var(--font-mono)] text-[#68452F]">
                      {entry.partidasRealizadas}
                    </td>
                    <td className="py-3 pl-3 text-right font-[family-name:var(--font-mono)] font-semibold text-[#38251B]">
                      {entry.vitorias}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
