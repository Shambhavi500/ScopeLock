import type { Metadata } from "next";
import { Figtree, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const figtree = Figtree({ subsets: ["latin"], weight: ["900"], variable: "--font-figtree" });
const inter = Inter({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-inter" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["500"], variable: "--font-jetbrains-mono" });

export const metadata: Metadata = {
  title: "ScopeLock",
  description:
    "Turn a client's change request into a priced PayPal invoice, lock work until it's paid, then pay the team.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${figtree.variable} ${inter.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
