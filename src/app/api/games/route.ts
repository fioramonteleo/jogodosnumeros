import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-utils";
import { startGame } from "@/lib/game-service";
import { getServerSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: "Identifique-se com seu nome antes de jogar." },
        { status: 401 }
      );
    }

    const body = (await req.json().catch(() => null)) as { nivel?: unknown } | null;
    const nivel = body ? Number(body.nivel) : NaN;
    const game = await startGame(session.jogadorId, nivel);

    return NextResponse.json({ game }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
