import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-utils";
import { getGeneralRanking, getRankingByLevel } from "@/lib/game-service";
import { isValidLevel } from "@/lib/game-config";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const nivelParam = url.searchParams.get("nivel") ?? "geral";

    if (nivelParam === "geral") {
      const entries = await getGeneralRanking();
      return NextResponse.json({ tipo: "geral", entries });
    }

    const num = Number(nivelParam);
    if (!isValidLevel(num)) {
      return NextResponse.json(
        { error: "Parâmetro 'nivel' inválido. Use geral, 1, 2 ou 3." },
        { status: 400 }
      );
    }

    const entries = await getRankingByLevel(num);
    return NextResponse.json({ tipo: String(num), entries });
  } catch (err) {
    return handleApiError(err);
  }
}
