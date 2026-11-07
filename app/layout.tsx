import type { Metadata } from "next";
import { Press_Start_2P } from "next/font/google";
import "./globals.css";
import { PlayerGate } from "@/components/PlayerGate";

const pixel = Press_Start_2P({ weight: "400", subsets: ["latin"], variable: "--font-pixel" });

export const metadata: Metadata = { title: "Games", description: "Pedro & Chloe play" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={pixel.variable}>
      <body>
        <PlayerGate>{children}</PlayerGate>
      </body>
    </html>
  );
}
