import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Passion · Hero quiz",
  description: "Anonymous Gumilev + Big Five literary hero survey",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          background: "#081420",
          color: "#e6f0fa",
          fontFamily: "Segoe UI, Roboto, system-ui, sans-serif",
        }}
      >
        {children}
      </body>
    </html>
  );
}
