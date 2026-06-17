import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CSSBuy Calculator",
  description: "Calculadora profesional para importadores que compran en China vía CSSBuy y venden en Argentina.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-background text-foreground">{children}</body>
    </html>
  );
}
