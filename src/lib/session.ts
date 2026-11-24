import crypto from "node:crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE_NAME = "leo_numero_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 dias

export interface PlayerSession {
  jogadorId: string;
  nome: string;
  iat: number;
}

function getSessionSecret(): string {
  const envSecret = process.env.SESSION_SECRET?.trim();
  if (envSecret && envSecret.length >= 16) {
    return envSecret;
  }
  // Fallback determinístico em desenvolvimento ou se SESSION_SECRET ainda não foi definido
  const dbFallback = process.env.DATABASE_URL ?? "leo-jogo-dos-numeros-dev-secret";
  return crypto
    .createHash("sha256")
    .update(`leo-session-key:${dbFallback}`)
    .digest("hex");
}

function base64UrlEncode(input: string | Buffer): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(input: string): string {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const padLen = (4 - (padded.length % 4)) % 4;
  return Buffer.from(padded + "=".repeat(padLen), "base64").toString("utf8");
}

function signPayload(payloadB64: string): string {
  const hmac = crypto.createHmac("sha256", getSessionSecret());
  hmac.update(payloadB64);
  return base64UrlEncode(hmac.digest());
}

export function createSessionToken(jogadorId: string, nome: string): string {
  const payload: PlayerSession = {
    jogadorId,
    nome,
    iat: Math.floor(Date.now() / 1000),
  };
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const signature = signPayload(payloadB64);
  return `${payloadB64}.${signature}`;
}

export function verifySessionToken(token: string | undefined | null): PlayerSession | null {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [payloadB64, providedSig] = parts;
  if (!payloadB64 || !providedSig) return null;

  const expectedSig = signPayload(payloadB64);
  const a = Buffer.from(providedSig, "utf8");
  const b = Buffer.from(expectedSig, "utf8");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return null;
  }

  try {
    const parsed = JSON.parse(base64UrlDecode(payloadB64)) as PlayerSession;
    if (
      !parsed ||
      typeof parsed.jogadorId !== "string" ||
      typeof parsed.nome !== "string" ||
      !parsed.jogadorId ||
      !parsed.nome
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function getServerSession(): Promise<PlayerSession | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return verifySessionToken(raw);
}

export function buildSessionCookieOptions() {
  return {
    name: SESSION_COOKIE_NAME,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}
