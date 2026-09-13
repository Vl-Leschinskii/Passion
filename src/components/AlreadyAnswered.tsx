"use client";

import { useState } from "react";
import { LangSwitch } from "./LangSwitch";
import { translations, type Locale } from "@/i18n/dict";

export function AlreadyAnswered({
  locale,
  onLocaleChange,
}: {
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
}) {
  const t = translations[locale];
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setStatus("error");
        setMessage(data.error === "Invalid email" ? t.emailInvalid : t.error);
        return;
      }
      setStatus("ok");
      setMessage(t.emailSent);
    } catch {
      setStatus("error");
      setMessage(t.error);
    }
  }

  return (
    <div className="app">
      <div className="top-bar">
        <div />
        <LangSwitch locale={locale} onChange={onLocaleChange} />
      </div>
      <div className="already-card">
        <h1>{t.alreadyTitle}</h1>
        <p>{t.alreadyBody}</p>
        <form onSubmit={submit} className="interest-form">
          <input
            type="email"
            required
            placeholder={t.emailPlaceholder}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={status === "ok"}
          />
          <button type="submit" disabled={status === "loading" || status === "ok"}>
            {status === "loading" ? "…" : t.emailSend}
          </button>
        </form>
        {message && <p className={`interest-msg ${status}`}>{message}</p>}
      </div>
    </div>
  );
}
