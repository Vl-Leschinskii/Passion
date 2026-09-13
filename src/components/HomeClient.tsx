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

const LOCALE_KEY = "passion_locale";

export function HomeClient() {
  const [locale, setLocale] = useState<Locale>("ru");
  const [status, setStatus] = useState<MeStatus | null>(null);
  const [books, setBooks] = useState<ApiBook[]>([]);
  const [initialProgress, setInitialProgress] = useState<InitialProgress | undefined>();
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(LOCALE_KEY) as Locale | null;
    if (saved === "ru" || saved === "en") setLocale(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem(LOCALE_KEY, locale);
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [meRes, booksRes] = await Promise.all([
          fetch(apiUrl("/api/me")),
          fetch(apiUrl("/api/books")),
        ]);
        if (!meRes.ok || !booksRes.ok) throw new Error("Failed to load");
        const me = (await meRes.json()) as {
          status: MeStatus;
          progress?: {
            guesses: Record<string, GumilevGroup>;
            bfiAnswers: Record<string, BfiAnswers>;
          };
        };
        const booksData = (await booksRes.json()) as { books: ApiBook[] };
        if (cancelled) return;
        setStatus(me.status === "new" ? "in_progress" : me.status);
        setBooks(booksData.books);
        if (me.progress) {
          setInitialProgress({
            guesses: me.progress.guesses || {},
            bfiAnswers: me.progress.bfiAnswers || {},
          });
        }
      } catch {
        if (!cancelled) setError(translations[locale].error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [locale]);

  if (error) {
    return (
      <div className="app">
        <div className="already-card">
          <p className="interest-msg error">{error}</p>
        </div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="app">
        <div className="empty">{translations[locale].loading}</div>
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
