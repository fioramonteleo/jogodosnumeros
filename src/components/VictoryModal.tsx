"use client";

import { Award, Clock, Hash, RotateCcw, Sparkles, Layers } from "lucide-react";
import { formatDuration, getLevelConfig, type ActiveGameView } from "@/lib/game-config";

interface VictoryModalProps {
  game: ActiveGameView;
  onPlayAgain: () => void;
  onChooseLevel: () => void;
  loading?: boolean;
}

export function VictoryModal({
  game,
  onPlayAgain,
  onChooseLevel,
  loading = false,
}: VictoryModalProps) {
  const cfg = getLevelConfig(game.nivel);
  const perf = game.performance;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="victory-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#38251B]/70 p-4 backdrop-blur-xs"
    >
      <div className="paper-card relative w-full max-w-lg overflow-hidden rounded-3xl border-2 border-[#68452F] p-6 sm:p-8">
        {/* Confetes leves em tons rústicos */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-around overflow-hidden">
          {["#A8794D", "#69734A", "#68452F", "#C89B54", "#69734A"].map((color, idx) => (
            <span
              key={idx}
              className="confetti-piece h-3 w-2 rounded-xs"
              style={{
                backgroundColor: color,
                animationDelay: `${idx * 0.35}s`,
              }}
            />
          ))}
        </div>

        <div className="relative text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-[#A8794D] bg-[#69734A] text-[#F4EBDD] shadow-md">
            <Award className="h-9 w-9" />
          </div>

          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#69734A]">
            Nível {cfg.nivel} — {cfg.nome}
          </p>
          <h2
            id="victory-title"
            className="mt-1 font-[family-name:var(--font-display)] text-3xl font-extrabold text-[#38251B] sm:text-4xl"
          >
            VOCÊ CONSEGUIU!
          </h2>

          {/* Número Secreto em destaque */}
          <div className="wood-plaque mx-auto mt-5 inline-flex flex-col items-center rounded-2xl px-8 py-4 text-[#F4EBDD]">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-[#E8D8B9]">
              Número Secreto
            </span>
            <span className="mt-0.5 font-[family-name:var(--font-mono)] text-4xl font-extrabold">
              {game.numeroSecreto}
            </span>
          </div>

          {/* Estatísticas */}
          <div className="mt-5 grid grid-cols-2 gap-3 text-left">
            <div className="rounded-xl border border-[#C5A882] bg-[#F4EBDD] p-3.5">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-[#68452F]">
                <Hash className="h-4 w-4 text-[#A8794D]" /> Quantidade de Chutes
              </p>
              <p className="mt-1 font-[family-name:var(--font-mono)] text-2xl font-bold text-[#38251B]">
                {game.tentativasCount}
              </p>
            </div>

            <div className="rounded-xl border border-[#C5A882] bg-[#F4EBDD] p-3.5">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-[#68452F]">
                <Clock className="h-4 w-4 text-[#A8794D]" /> Tempo Gasto
              </p>
              <p className="mt-1 font-[family-name:var(--font-mono)] text-2xl font-bold text-[#38251B]">
                {formatDuration(game.tempoSegundos)}
              </p>
            </div>
          </div>

          {/* Desempenho */}
          {perf && (
            <div
              className={`mt-4 rounded-xl border p-4 text-left ${
                perf.isIdeal
                  ? "border-[#69734A] bg-[#69734A]/15"
                  : "border-[#A8794D] bg-[#E8D8B9]/65"
              }`}
            >
              <p className="flex items-center gap-2 font-[family-name:var(--font-display)] text-base font-bold text-[#38251B]">
                <Sparkles className="h-4 w-4 text-[#69734A]" />
                {perf.titulo}
              </p>
              <p className="mt-1 text-sm text-[#38251B]/90">{perf.descricao}</p>
              <p className="mt-1.5 text-xs font-semibold text-[#68452F]">
                Referência de busca binária ideal para o Nível {cfg.nivel}: até{" "}
                {perf.idealTentativas} tentativas.
              </p>
            </div>
          )}

          {/* Ações */}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              disabled={loading}
              onClick={onPlayAgain}
              className="olive-btn flex flex-1 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold tracking-wide"
            >
              <RotateCcw className="h-4 w-4" />
              JOGAR NOVAMENTE
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={onChooseLevel}
              className="wood-btn flex flex-1 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold tracking-wide"
            >
              <Layers className="h-4 w-4" />
              ESCOLHER OUTRO NÍVEL
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
