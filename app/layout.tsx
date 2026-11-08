import type { Metadata, Viewport } from "next";
import { Press_Start_2P } from "next/font/google";
import "./globals.css";
import { PlayerGate } from "@/components/PlayerGate";

const pixel = Press_Start_2P({ weight: "400", subsets: ["latin"], variable: "--font-pixel" });

export const metadata: Metadata = {
  title: "Games",
  description: "Pedro & Chloe play",
  appleWebApp: { capable: true, title: "Games", statusBarStyle: "black-translucent" },
};
export const viewport: Viewport = { themeColor: "#0b2a1b", viewportFit: "cover" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={pixel.variable}>
      <body>
        <PlayerGate>{children}</PlayerGate>
      </body>
    </html>
  );
}
