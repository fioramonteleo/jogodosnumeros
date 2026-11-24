import { NextResponse } from "next/server";
import { getPool, isDatabaseConfigured } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        databaseConfigured: false,
        message: "DATABASE_URL não configurada.",
      },
      { status: 503 }
    );
  }

  try {
    const pool = getPool();
    await pool.query("SELECT 1");
    return NextResponse.json({
      ok: true,
      databaseConfigured: true,
      message: "Conexão com Neon PostgreSQL ativa.",
    });
  } catch (err) {
    console.error("[Health Check Error]", err);
    return NextResponse.json(
      {
        ok: false,
        databaseConfigured: true,
        message: "Falha ao conectar ao banco Neon PostgreSQL.",
      },
      { status: 503 }
    );
  }
}
