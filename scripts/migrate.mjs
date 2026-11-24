import fs from "node:fs";
import path from "node:path";
import { Pool } from "@neondatabase/serverless";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIdx = line.indexOf("=");
    if (eqIdx === -1) continue;
    const key = line.slice(0, eqIdx).trim();
    let val = line.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = val;
    }
  }
}

async function main() {
  loadEnvFile(path.resolve(process.cwd(), ".env.local"));
  loadEnvFile(path.resolve(process.cwd(), ".env"));

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("ERRO: A variável de ambiente DATABASE_URL não está definida.");
    console.error("Configure DATABASE_URL no arquivo .env.local ou no painel da Vercel.");
    process.exit(1);
  }

  const migrationsDir = path.resolve(process.cwd(), "db", "migrations");
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    for (const file of files) {
      const already = await pool.query(
        "SELECT 1 FROM schema_migrations WHERE filename = $1",
        [file]
      );
      if (already.rowCount && already.rowCount > 0) {
        console.log(`[skip] ${file} já aplicada.`);
        continue;
      }

      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
      console.log(`[apply] Aplicando ${file}...`);
      await pool.query("BEGIN");
      try {
        await pool.query(sql);
        await pool.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [file]);
        await pool.query("COMMIT");
        console.log(`[ok] ${file} aplicada com sucesso.`);
      } catch (err) {
        await pool.query("ROLLBACK");
        throw err;
      }
    }

    console.log("Todas as migrações foram verificadas/aplicadas.");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Falha ao executar migrações:", err);
  process.exit(1);
});
