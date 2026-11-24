"use client";

import { useState } from "react";
import { Compass, Eye, EyeOff, Ruler } from "lucide-react";
import type { RulerState } from "@/lib/game-config";

interface WoodenRulerProps {
  minTotal: number;
  maxTotal: number;
  tentativasCount: number;
  ruler: RulerState;
  acertou: boolean;
  onUseSuggestion?: (value: number) => void;
}

export function WoodenRuler({
  minTotal,
  maxTotal,
  tentativasCount,
  ruler,
  acertou,
  onUseSuggestion,
}: WoodenRulerProps) {
  const [showSuggestion, setShowSuggestion] = useState(true);

  const totalSpan = Math.max(1, maxTotal - minTotal);
  const leftPct = ((ruler.minPossivel - minTotal) / totalSpan) * 100;
  const rightPct = ((maxTotal - ruler.maxPossivel) / totalSpan) * 100;
  const activeWidthPct = Math.max(2, 100 - leftPct - rightPct);

  const lastGuessPct =
    ruler.lastGuess !== null
      ? Math.min(100, Math.max(0, ((ruler.lastGuess - minTotal) / totalSpan) * 100))
      : null;

  return (
    <section
      aria-label="Régua interativa de busca binária"
      className="paper-card rounded-2xl p-5 sm:p-6"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#68452F] text-[#F4EBDD] shadow-sm">
            <Ruler className="h-5 w-5" />
          </span>
          <div>
            <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-[#38251B]">
              Régua de Possibilidades
            </h3>
            <p className="text-xs text-[#68452F]">
              O espaço de busca se estreita a cada tentativa
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowSuggestion((prev) => !prev)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#A8794D]/60 bg-[#E8D8B9]/70 px-3 py-1.5 text-xs font-semibold text-[#38251B] transition hover:bg-[#E8D8B9]"
        >
          {showSuggestion ? (
            <>
              <EyeOff className="h-3.5 w-3.5" /> Ocultar sugestão
            </>
          ) : (
            <>
              <Eye className="h-3.5 w-3.5" /> Mostrar sugestão
            </>
          )}
        </button>
      </div>

      {/* Limites atuais da régua */}
      <div className="mb-2 flex items-end justify-between font-[family-name:var(--font-mono)]">
        <div className="flex flex-col items-start">
          <span className="text-[11px] uppercase tracking-wider text-[#68452F]">
            Menor limite
          </span>
          <span className="rounded-md border border-[#A8794D] bg-[#F4EBDD] px-2.5 py-0.5 text-base font-bold text-[#38251B] shadow-xs">
            {ruler.minPossivel}
          </span>
        </div>

        {ruler.lastGuess !== null && (
          <div className="flex flex-col items-center">
            <span className="text-[11px] uppercase tracking-wider text-[#68452F]">
              Último chute
            </span>
            <span
              className={`rounded-md px-2.5 py-0.5 text-sm font-bold text-[#F4EBDD] shadow-xs ${
                ruler.lastResult === "ACERTOU" ? "bg-[#69734A]" : "bg-[#68452F]"
              }`}
            >
              {ruler.lastGuess}
            </span>
          </div>
        )}

        <div className="flex flex-col items-end">
          <span className="text-[11px] uppercase tracking-wider text-[#68452F]">
            Maior limite
          </span>
          <span className="rounded-md border border-[#A8794D] bg-[#F4EBDD] px-2.5 py-0.5 text-base font-bold text-[#38251B] shadow-xs">
            {ruler.maxPossivel}
          </span>
        </div>
      </div>

      {/* Barra visual de régua de madeira */}
      <div className="relative py-4">
        <div className="wooden-ruler-track relative h-9 w-full overflow-hidden rounded-xl">
          {/* Áreas descartadas à esquerda e à direita */}
          <div
            className="absolute inset-y-0 left-0 bg-[#38251B]/55 transition-all duration-500 ease-out"
            style={{ width: `${leftPct}%` }}
          />
          <div
            className="absolute inset-y-0 right-0 bg-[#38251B]/55 transition-all duration-500 ease-out"
            style={{ width: `${rightPct}%` }}
          />

          {/* Faixa ativa do intervalo possível */}
          <div
            className="absolute inset-y-1 rounded-md border-2 border-[#F4EBDD]/80 bg-[#69734A]/65 shadow-[0_0_12px_rgba(105,115,74,0.45)] transition-all duration-500 ease-out"
            style={{
              left: `${leftPct}%`,
              width: `${activeWidthPct}%`,
            }}
          />

          {/* Marcador do último chute */}
          {lastGuessPct !== null && (
            <div
              className="absolute top-0 bottom-0 z-10 w-1 -translate-x-1/2 bg-[#F4EBDD] shadow-[0_0_6px_rgba(56,37,27,0.8)] transition-all duration-500 ease-out"
              style={{ left: `${lastGuessPct}%` }}
              title={`Último chute: ${ruler.lastGuess}`}
            >
              <div className="absolute -top-1 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border border-[#38251B] bg-[#F4EBDD]" />
            </div>
          )}
        </div>

        {/* Escala total */}
        <div className="mt-1.5 flex justify-between font-[family-name:var(--font-mono)] text-[11px] text-[#68452F]/80">
          <span>{minTotal}</span>
          <span>{Math.floor((minTotal + maxTotal) / 2)}</span>
          <span>{maxTotal}</span>
        </div>
      </div>

      {/* Métricas e Sugestão */}
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-[#C5A882] bg-[#F4EBDD]/80 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#68452F]">
            Tentativas
          </p>
          <p className="mt-0.5 font-[family-name:var(--font-mono)] text-xl font-bold text-[#38251B]">
            {tentativasCount}
          </p>
        </div>

        <div className="rounded-xl border border-[#C5A882] bg-[#F4EBDD]/80 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#68452F]">
            Restantes
          </p>
          <p className="mt-0.5 font-[family-name:var(--font-mono)] text-xl font-bold text-[#38251B]">
            {ruler.remainingCount}
          </p>
        </div>

        <div className="rounded-xl border border-[#C5A882] bg-[#F4EBDD]/80 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#68452F]">
            Intervalo Atual
          </p>
          <p className="mt-0.5 font-[family-name:var(--font-mono)] text-base font-bold text-[#38251B] sm:text-lg">
            {ruler.minPossivel} — {ruler.maxPossivel}
          </p>
        </div>

        <div className="rounded-xl border border-[#C5A882] bg-[#F4EBDD]/80 p-3">
          <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-[#69734A]">
            <Compass className="h-3.5 w-3.5" /> Melhor Chute
          </p>
          {showSuggestion && !acertou ? (
            <div className="mt-0.5 flex items-center justify-between gap-2">
              <span className="font-[family-name:var(--font-mono)] text-xl font-bold text-[#69734A]">
                {ruler.suggestedNext}
              </span>
              {onUseSuggestion && (
                <button
                  type="button"
                  onClick={() => onUseSuggestion(ruler.suggestedNext)}
                  className="rounded-md border border-[#69734A]/50 bg-[#69734A]/15 px-2 py-0.5 text-[11px] font-semibold text-[#38251B] transition hover:bg-[#69734A]/25"
                >
                  Usar
                </button>
              )}
            </div>
          ) : (
            <p className="mt-1 text-xs font-medium text-[#68452F]">
              {acertou ? "Encontrado!" : "Oculto"}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
