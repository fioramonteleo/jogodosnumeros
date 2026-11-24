import { NextResponse } from "next/server";
import { handleApiError, isValidUuid } from "@/lib/api-utils";
import { submitGuess } from "@/lib/game-service";
import { getServerSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: "Sessão expirada ou inexistente. Informe seu nome." },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    if (!isValidUuid(id)) {
      return NextResponse.json({ error: "Identificador de partida inválido." }, { status: 400 });
    }

    const body = (await req.json().catch(() => null)) as { numero?: unknown } | null;
    if (!body || body.numero === undefined) {
      return NextResponse.json(
        { error: "Informe um número antes de chutar." },
        { status: 400 }
      );
    }

    const result = await submitGuess(id, session.jogadorId, body.numero);
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
