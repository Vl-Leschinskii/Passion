import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Passion · Hero quiz",
  description: "Anonymous Gumilev + Big Five literary hero survey",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
