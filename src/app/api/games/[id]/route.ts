import { NextResponse } from "next/server";
import { handleApiError, isValidUuid } from "@/lib/api-utils";
import { getGameForPlayer } from "@/lib/game-service";
import { getServerSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
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

    const game = await getGameForPlayer(id, session.jogadorId);
    return NextResponse.json({ game });
  } catch (err) {
    return handleApiError(err);
  }
}
