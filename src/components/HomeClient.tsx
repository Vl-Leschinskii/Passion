"use client";

import { useEffect, useState } from "react";
import { AlreadyAnswered } from "@/components/AlreadyAnswered";
import {
  QuizApp,
  type ApiBook,
  type InitialProgress,
} from "@/components/QuizApp";
import { translations, type Locale } from "@/i18n/dict";
import type { BfiAnswers, GumilevGroup } from "@/lib/quiz";
import { apiUrl } from "@/lib/base-path";

type MeStatus = "new" | "in_progress" | "completed";

export type BootstrapPayload = {
  status: MeStatus;
  needsCookie: boolean;
  completedAt: string | null;
  books: ApiBook[];
  progress: {
    guesses: Record<string, GumilevGroup>;
    bfiAnswers: Record<string, BfiAnswers>;
  };
};

const LOCALE_KEY = "passion_locale";

export function HomeClient({ bootstrap }: { bootstrap: BootstrapPayload }) {
  const [locale, setLocale] = useState<Locale>("ru");
  const [status, setStatus] = useState<MeStatus>(
    bootstrap.status === "new" ? "in_progress" : bootstrap.status,
  );
  const [books] = useState<ApiBook[]>(bootstrap.books);
  const [initialProgress, setInitialProgress] = useState<InitialProgress | undefined>(
    Object.keys(bootstrap.progress.guesses).length > 0
      ? {
          guesses: bootstrap.progress.guesses,
          bfiAnswers: bootstrap.progress.bfiAnswers,
        }
      : undefined,
  );

  useEffect(() => {
    const saved = localStorage.getItem(LOCALE_KEY) as Locale | null;
    if (saved === "ru" || saved === "en") setLocale(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem(LOCALE_KEY, locale);
    document.documentElement.lang = locale;
  }, [locale]);

  // Ensure anonymous cookie exists without blocking first paint.
  useEffect(() => {
    if (!bootstrap.needsCookie && status === "completed") return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(apiUrl("/api/me"), { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const me = (await res.json()) as {
          status: MeStatus;
          progress?: {
            guesses: Record<string, GumilevGroup>;
            bfiAnswers: Record<string, BfiAnswers>;
          };
        };
        if (cancelled) return;
        if (me.status === "completed") {
          setStatus("completed");
          return;
        }
        if (me.progress && Object.keys(me.progress.guesses || {}).length > 0) {
          setInitialProgress({
            guesses: me.progress.guesses || {},
            bfiAnswers: me.progress.bfiAnswers || {},
          });
        }
      } catch {
        // Non-blocking: quiz UI is already visible from SSR books.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bootstrap.needsCookie, status]);

  if (!books.length) {
    return (
      <div className="app">
        <div className="already-card">
          <p className="interest-msg error">{translations[locale].error}</p>
        </div>
      </div>
    );
  }

  if (status === "completed") {
    return <AlreadyAnswered locale={locale} onLocaleChange={setLocale} />;
  }

  return (
    <QuizApp
      books={books}
      locale={locale}
      onLocaleChange={setLocale}
      initialProgress={initialProgress}
    />
  );
}
