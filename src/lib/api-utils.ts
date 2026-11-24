import { NextResponse } from "next/server";
import { DatabaseConfigError } from "./db";
import { GameError } from "./game-service";

export function handleApiError(err: unknown) {
  if (err instanceof GameError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }

  if (err instanceof DatabaseConfigError) {
    return NextResponse.json(
      {
        error: err.message,
        code: "DATABASE_NOT_CONFIGURED",
      },
      { status: 503 }
    );
  }

  console.error("[API Error]", err);
  return NextResponse.json(
    {
      error: "Erro interno ao comunicar com o servidor ou banco de dados.",
    },
    { status: 500 }
  );
}

export function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}
