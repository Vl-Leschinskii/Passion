"use client";

import type { Locale } from "@/i18n/dict";

export function LangSwitch({
  locale,
  onChange,
}: {
  locale: Locale;
  onChange: (locale: Locale) => void;
}) {
  return (
    <div className="lang-switch" role="group" aria-label="Language">
      <button
        type="button"
        className={locale === "ru" ? "active" : ""}
        onClick={() => onChange("ru")}
      >
        RU
      </button>
      <button
        type="button"
        className={locale === "en" ? "active" : ""}
        onClick={() => onChange("en")}
      >
        EN
      </button>
    </div>
  );
}
