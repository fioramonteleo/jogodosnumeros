import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-utils";
import { getPlayerHistory } from "@/lib/game-service";
import { getServerSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: "Identifique-se para consultar seu histórico." },
        { status: 401 }
      );
    }

    const matches = await getPlayerHistory(session.jogadorId);
    return NextResponse.json({ matches });
  } catch (err) {
    return handleApiError(err);
  }
}
