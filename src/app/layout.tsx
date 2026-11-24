import type { Metadata } from "next";
import { JetBrains_Mono, Lora, Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-display",
});

const lora = Lora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-serif",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Jogo dos Números do Leo",
  description:
    "Desafio rústico de adivinhação numérica com estratégia de busca binária, régua interativa e ranking competitivo.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${playfair.variable} ${lora.variable} ${jakarta.variable} ${mono.variable}`}
    >
      <body className="font-[family-name:var(--font-sans)] antialiased selection:bg-[#A8794D]/30 selection:text-[#38251B]">
        {children}
      </body>
    </html>
  );
}
