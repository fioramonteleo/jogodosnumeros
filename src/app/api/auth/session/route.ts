import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-utils";
import { createPlayer, getPlayerById } from "@/lib/game-service";
import {
  buildSessionCookieOptions,
  createSessionToken,
  getServerSession,
  SESSION_COOKIE_NAME,
} from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ player: null });
    }

    const player = await getPlayerById(session.jogadorId);
    if (!player) {
      const res = NextResponse.json({ player: null });
      res.cookies.delete(SESSION_COOKIE_NAME);
      return res;
    }

    return NextResponse.json({
      player: {
        id: player.id,
        nome: player.nome,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as { nome?: unknown } | null;
    if (!body || typeof body.nome !== "string") {
      return NextResponse.json(
        { error: "Informe o nome do jogador." },
        { status: 400 }
      );
    }

    const player = await createPlayer(body.nome);
    const token = createSessionToken(player.id, player.nome);
    const res = NextResponse.json(
      {
        player: {
          id: player.id,
          nome: player.nome,
        },
      },
      { status: 201 }
    );

    res.cookies.set({
      ...buildSessionCookieOptions(),
      value: token,
    });

    return res;
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE_NAME);
  return res;
}
