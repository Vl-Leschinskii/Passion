"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LangSwitch } from "./LangSwitch";
import {
  AXES_KEYS,
  BFI_META,
  GROUP_META,
  translations,
  type Locale,
} from "@/i18n/dict";
import {
  heroKey,
  isFullBfi,
  isHeroAnswerComplete,
  type BfiAnswers,
  type GumilevGroup,
} from "@/lib/quiz";
import { apiUrl } from "@/lib/base-path";

export type ApiHero = {
  id: string;
  nameRu: string;
  nameEn: string;
  subRu: string;
  subEn: string;
  group: GumilevGroup;
  descRu: string;
  descEn: string;
  scores: number[];
};

export type ApiBook = {
  id: string;
  slug: string;
  titleRu: string;
  titleEn: string;
  heroes: ApiHero[];
};

export type InitialProgress = {
  guesses: Record<string, GumilevGroup>;
  bfiAnswers: Record<string, BfiAnswers>;
};

const STORAGE_KEY = "passion_quiz_progress_v2";

type Progress = {
  guesses: Record<string, GumilevGroup>;
  bfiAnswers: Record<string, Partial<BfiAnswers>>;
  aiRevealed: Record<string, boolean>;
};

function loadLocalProgress(): Progress {
  if (typeof window === "undefined") {
    return { guesses: {}, bfiAnswers: {}, aiRevealed: {} };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { guesses: {}, bfiAnswers: {}, aiRevealed: {} };
    return JSON.parse(raw) as Progress;
  } catch {
    return { guesses: {}, bfiAnswers: {}, aiRevealed: {} };
  }
}

function mergeProgress(server: InitialProgress | undefined, local: Progress): Progress {
  return {
    guesses: { ...local.guesses, ...(server?.guesses || {}) },
    bfiAnswers: { ...local.bfiAnswers, ...(server?.bfiAnswers || {}) },
    aiRevealed: local.aiRevealed,
  };
}

function drawRadar(
  canvas: HTMLCanvasElement,
  scores: number[],
  labels: string[],
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2;
  const R = Math.min(w, h) * 0.36;
  const N = labels.length;
  const step = (Math.PI * 2) / N;

  ctx.clearRect(0, 0, w, h);

  for (let ring = 1; ring <= 3; ring++) {
    const r = (R * ring) / 3;
    ctx.beginPath();
    for (let i = 0; i <= N; i++) {
      const a = -Math.PI / 2 + i * step;
      const x = cx + r * Math.cos(a);
      const y = cy + r * Math.sin(a);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.5, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255,255,255,0.3)";
  ctx.setLineDash([4, 5]);
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.font = '600 14px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let i = 0; i < N; i++) {
    const a = -Math.PI / 2 + i * step;
    const x = cx + R * Math.cos(a);
    const y = cy + R * Math.sin(a);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(x, y);
    ctx.strokeStyle = "rgba(255,255,255,0.14)";
    ctx.lineWidth = 1.3;
    ctx.stroke();

    const lx = cx + R * 1.15 * Math.cos(a);
    const ly = cy + R * 1.15 * Math.sin(a);
    ctx.fillStyle = "#b6d0e8";
    ctx.fillText(labels[i], lx, ly);
  }

  ctx.beginPath();
  for (let i = 0; i < N; i++) {
    const v = Math.max(-1, Math.min(1, scores[i] ?? 0));
    const r = R * ((v + 1) / 2);
    const a = -Math.PI / 2 + i * step;
    const x = cx + r * Math.cos(a);
    const y = cy + r * Math.sin(a);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = "rgba(63,142,208,0.3)";
  ctx.fill();
  ctx.strokeStyle = "#7bb3f0";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.font = 'bold 12px "Segoe UI", sans-serif';
  for (let i = 0; i < N; i++) {
    const v = Math.max(-1, Math.min(1, scores[i] ?? 0));
    const r = R * ((v + 1) / 2);
    const a = -Math.PI / 2 + i * step;
    const x = cx + r * Math.cos(a);
    const y = cy + r * Math.sin(a);
    ctx.beginPath();
    ctx.arc(x, y, 5.5, 0, Math.PI * 2);
    ctx.fillStyle = "#eaf4ff";
    ctx.fill();
    ctx.fillStyle = "#eaf2fa";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(v.toFixed(1), x, y - 9);
  }
}

function Radar({ scores, labels }: { scores: number[]; labels: string[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (ref.current) drawRadar(ref.current, scores, labels);
  }, [scores, labels]);
  return <canvas ref={ref} className="radar-mini" width={640} height={640} />;
}

function isHeroDone(
  bookSlug: string,
  heroId: string,
  guesses: Progress["guesses"],
  bfiAnswers: Progress["bfiAnswers"],
) {
  const key = heroKey(bookSlug, heroId);
  return isHeroAnswerComplete(guesses[key], bfiAnswers[key]);
}

export function QuizApp({
  books,
  locale,
  onLocaleChange,
  initialProgress,
}: {
  books: ApiBook[];
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
  initialProgress?: InitialProgress;
}) {
  const t = translations[locale];
  const [currentBook, setCurrentBook] = useState(0);
  const [currentHero, setCurrentHero] = useState(-1);
  const [progress, setProgress] = useState<Progress>({
    guesses: {},
    bfiAnswers: {},
    aiRevealed: {},
  });
  const [hydrated, setHydrated] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState("");
  const [completed, setCompleted] = useState(false);
  const [savedKeys, setSavedKeys] = useState<Set<string>>(() => new Set());
  const [pendingConfirm, setPendingConfirm] = useState<{
    bookSlug: string;
    heroId: string;
    heroName: string;
    snapshot: Progress;
  } | null>(null);
  const [savedModal, setSavedModal] = useState<{
    heroName: string;
    answered: Array<{ bookTitle: string; heroName: string }>;
  } | null>(null);
  const aiSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const local = loadLocalProgress();
    const merged = mergeProgress(initialProgress, local);
    setProgress(merged);
    const initialSaved = new Set<string>();
    if (initialProgress) {
      for (const key of Object.keys(initialProgress.guesses)) {
        if (
          isHeroAnswerComplete(
            initialProgress.guesses[key],
            initialProgress.bfiAnswers[key],
          )
        ) {
          initialSaved.add(key);
        }
      }
    }
    setSavedKeys(initialSaved);
    setHydrated(true);
  }, [initialProgress]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }, [progress, hydrated]);

  const book = books[currentBook];
  const allHeroes = useMemo(
    () => books.flatMap((b) => b.heroes.map((h) => ({ bookSlug: b.slug, hero: h }))),
    [books],
  );

  const totalDone = allHeroes.filter(({ bookSlug, hero }) =>
    savedKeys.has(heroKey(bookSlug, hero.id)),
  ).length;

  const bookDoneCount = book
    ? book.heroes.filter((h) => savedKeys.has(heroKey(book.slug, h.id))).length
    : 0;
  const bookTotal = book?.heroes.length ?? 0;
  const bookPct = bookTotal ? (bookDoneCount / bookTotal) * 100 : 0;
  const revealed = book ? !!progress.aiRevealed[book.slug] : false;

  function answeredList(keys: Set<string>) {
    return allHeroes
      .filter(({ bookSlug, hero }) => keys.has(heroKey(bookSlug, hero.id)))
      .map(({ bookSlug, hero }) => {
        const b = books.find((x) => x.slug === bookSlug)!;
        return {
          bookTitle: locale === "ru" ? b.titleRu : b.titleEn,
          heroName: locale === "ru" ? hero.nameRu : hero.nameEn,
        };
      });
  }

  async function persistHero(
    bookSlug: string,
    heroId: string,
    heroName: string,
    next: Progress,
  ) {
    const key = heroKey(bookSlug, heroId);
    const guess = next.guesses[key];
    const bfi = next.bfiAnswers[key];
    if (!isHeroAnswerComplete(guess, bfi) || !isFullBfi(bfi)) return;
    if (savedKeys.has(key)) return;

    setSaveState("saving");
    setSaveError("");
    try {
      const res = await fetch(apiUrl("/api/responses"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookSlug,
          heroId,
          guess,
          bfi: {
            O: bfi.O,
            C: bfi.C,
            E: bfi.E,
            A: bfi.A,
            N: bfi.N,
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaveState("error");
        setSaveError(data.error || t.saveError);
        return;
      }
      const nextSaved = new Set(savedKeys);
      nextSaved.add(key);
      setSavedKeys(nextSaved);
      setSaveState("saved");
      setSavedModal({
        heroName,
        answered: answeredList(nextSaved),
      });
      if (data.completed) {
        localStorage.removeItem(STORAGE_KEY);
        setCompleted(true);
      }
    } catch {
      setSaveState("error");
      setSaveError(t.saveError);
    }
  }

  function requestSave(bookSlug: string, heroId: string, next: Progress) {
    const key = heroKey(bookSlug, heroId);
    if (savedKeys.has(key)) return;
    if (!isHeroDone(bookSlug, heroId, next.guesses, next.bfiAnswers)) return;
    const b = books.find((x) => x.slug === bookSlug);
    const h = b?.heroes.find((x) => x.id === heroId);
    if (!b || !h) return;
    setPendingConfirm({
      bookSlug,
      heroId,
      heroName: locale === "ru" ? h.nameRu : h.nameEn,
      snapshot: next,
    });
  }

  function updateProgress(
    bookSlug: string,
    heroId: string,
    updater: (prev: Progress) => Progress,
  ) {
    const key = heroKey(bookSlug, heroId);
    if (savedKeys.has(key)) return;
    setProgress((prev) => {
      const next = updater(prev);
      const wasDone = isHeroDone(bookSlug, heroId, prev.guesses, prev.bfiAnswers);
      const nowDone = isHeroDone(bookSlug, heroId, next.guesses, next.bfiAnswers);
      if (nowDone && !wasDone) {
        queueMicrotask(() => requestSave(bookSlug, heroId, next));
      }
      return next;
    });
  }

  function setGuess(bookSlug: string, heroId: string, group: GumilevGroup) {
    updateProgress(bookSlug, heroId, (p) => ({
      ...p,
      guesses: { ...p.guesses, [heroKey(bookSlug, heroId)]: group },
    }));
  }

  function setBfi(
    bookSlug: string,
    heroId: string,
    axis: keyof BfiAnswers,
    value: boolean,
  ) {
    const key = heroKey(bookSlug, heroId);
    updateProgress(bookSlug, heroId, (p) => ({
      ...p,
      bfiAnswers: {
        ...p.bfiAnswers,
        [key]: { ...(p.bfiAnswers[key] || {}), [axis]: value },
      },
    }));
  }

  if (completed) {
    return (
      <div className="app">
        <div className="top-bar">
          <div />
          <LangSwitch locale={locale} onChange={onLocaleChange} />
        </div>
        <div className="already-card">
          <h1>{t.thanks}</h1>
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="app">
        <div className="empty">{t.loading}</div>
      </div>
    );
  }

  const hero = currentHero >= 0 ? book.heroes[currentHero] : null;
  const key = hero ? heroKey(book.slug, hero.id) : "";
  const guess = key ? progress.guesses[key] : undefined;
  const bfi = key ? progress.bfiAnswers[key] || {} : {};
  const bfiDone = isFullBfi(bfi);
  const axisLabels = AXES_KEYS.map((k) => t[k]);
  const heroLocked = Boolean(key && savedKeys.has(key));
  // For AI reveal, book is complete when all heroes are saved
  const bookFullySaved =
    book.heroes.length > 0 &&
    book.heroes.every((h) => savedKeys.has(heroKey(book.slug, h.id)));
  const bookRevealReady = bookFullySaved || bookDoneCount === bookTotal;

  return (
    <div className="app">
      <div className="top-bar">
        <div className="brand">
          <h1>{t.brandTitle}</h1>
          <p>{t.brandSubtitle}</p>
        </div>
        <LangSwitch locale={locale} onChange={onLocaleChange} />
      </div>

      <p className="autosave-note">
        {t.progressSaved}
        {` · ${t.answeredCount}: ${totalDone}/${allHeroes.length}`}
        {saveState === "saving" ? ` · ${t.saving}` : ""}
      </p>
      {saveError && <p className="interest-msg error">{saveError}</p>}

      <div className="book-tabs">
        {books.map((b, i) => (
          <button
            key={b.id}
            type="button"
            className={i === currentBook ? "active" : ""}
            onClick={() => {
              setCurrentBook(i);
              setCurrentHero(-1);
            }}
          >
            {locale === "ru" ? b.titleRu : b.titleEn}
          </button>
        ))}
      </div>

      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${bookPct}%` }} />
        <div className="progress-label">
          {bookDoneCount} / {bookTotal}
        </div>
      </div>

      <div className="hero-grid">
        {book.heroes.map((h, i) => {
          const locked = savedKeys.has(heroKey(book.slug, h.id));
          const done = locked || isHeroDone(book.slug, h.id, progress.guesses, progress.bfiAnswers);
          return (
            <button
              key={h.id}
              type="button"
              className={`hero-chip${i === currentHero ? " active" : ""}${done ? " done" : ""}${locked ? " locked" : ""}`}
              onClick={() => setCurrentHero(i)}
              title={locked ? t.lockedHero : undefined}
            >
              {(locale === "ru" ? h.nameRu : h.nameEn) + (locked ? " ✓" : done ? " ·" : "")}
            </button>
          );
        })}
      </div>

      <div className="workspace">
        {!hero ? (
          <div className="empty">{t.pickHero}</div>
        ) : (
          <>
            <div className="hero-title">{locale === "ru" ? hero.nameRu : hero.nameEn}</div>
            <div className="hero-subtitle">
              {locale === "ru" ? book.titleRu : book.titleEn}
            </div>
            {heroLocked && <p className="locked-banner">{t.lockedHero}</p>}

            <div className="question">{t.step1}</div>
            <div className="choice-row">
              {(["passi", "garm", "sub"] as const).map((gid) => (
                <button
                  key={gid}
                  type="button"
                  className={`choice-btn${guess === gid ? " picked" : ""}`}
                  data-group={gid}
                  disabled={heroLocked}
                  onClick={() => setGuess(book.slug, hero.id, gid)}
                >
                  <span>
                    {GROUP_META[gid].emoji} {t[gid]}
                  </span>
                  <span className="hint">{t[`${gid}Hint`]}</span>
                </button>
              ))}
            </div>

            <div className="types-block">
              <h3>{t.typesTitle}</h3>
              <p className="sub">{t.typesSub}</p>
              <div className="type-info">
                {(["passi", "garm", "sub"] as const).map((gid) => (
                  <div key={gid} className="type-card">
                    <b>
                      {GROUP_META[gid].emoji} {t[gid]}
                    </b>
                    {locale === "ru" ? GROUP_META[gid].fullRu : GROUP_META[gid].fullEn}
                    <span className="ex">
                      {locale === "ru" ? GROUP_META[gid].exRu : GROUP_META[gid].exEn}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bfi-block">
              <h3>{t.step2}</h3>
              <p className="bfi-note">{t.step2Note}</p>
              {BFI_META.map((qq) => (
                <div key={qq.id} className="bfi-row">
                  <div className="bfi-label">
                    {t[qq.labelKey]}
                    <small>{locale === "ru" ? qq.hintRu : qq.hintEn}</small>
                  </div>
                  <div className="bfi-actions">
                    <button
                      type="button"
                      className={`bfi-btn yes${bfi[qq.id] === true ? " on" : ""}`}
                      disabled={heroLocked}
                      onClick={() => setBfi(book.slug, hero.id, qq.id, true)}
                    >
                      {t.yes}
                    </button>
                    <button
                      type="button"
                      className={`bfi-btn no${bfi[qq.id] === false ? " on" : ""}`}
                      disabled={heroLocked}
                      onClick={() => setBfi(book.slug, hero.id, qq.id, false)}
                    >
                      {t.no}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="bfi-scales">
              <h3>{t.bfiScalesTitle}</h3>
              <p className="sub">{t.bfiScalesSub}</p>
              <div className="bfi-scale-grid">
                {BFI_META.map((s) => (
                  <div key={s.id} className="bfi-scale-card">
                    <h4>{t[s.labelKey]}</h4>
                    <div className="pole">
                      <b>{t.high}:</b> {locale === "ru" ? s.highDescRu : s.highDescEn}
                    </div>
                    <div className="pole">
                      <b>{t.low}:</b> {locale === "ru" ? s.lowDescRu : s.lowDescEn}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {guess && bfiDone ? (
              <div className="verdict">
                {heroLocked ? (
                  t.lockedHero
                ) : (
                  <>
                    {t.ready}
                    <div style={{ marginTop: 12 }}>
                      <button
                        type="button"
                        className="submit-btn"
                        onClick={() => requestSave(book.slug, hero.id, progress)}
                      >
                        {t.confirmSaveYes}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : guess && !bfiDone ? (
              <div className="verdict warn">
                {t.bfiLeft}: {5 - Object.keys(bfi).length} {t.of} 5
              </div>
            ) : null}
          </>
        )}
      </div>

      <div className="bottom-action">
        <button
          type="button"
          className="reveal-btn"
          disabled={!bookRevealReady}
          onClick={() => {
            if (!bookRevealReady) return;
            setProgress((p) => ({
              ...p,
              aiRevealed: { ...p.aiRevealed, [book.slug]: !revealed },
            }));
            if (!revealed) {
              setTimeout(
                () => aiSectionRef.current?.scrollIntoView({ behavior: "smooth" }),
                50,
              );
            }
          }}
        >
          {!bookRevealReady
            ? `${t.revealLocked} ${bookTotal - bookDoneCount})`
            : revealed
              ? t.hide
              : t.reveal}
        </button>
      </div>

      <div ref={aiSectionRef} className={`ai-section${revealed ? " open" : ""}`}>
        {revealed && (
          <>
            <h2>
              {t.aiTitle} · {locale === "ru" ? book.titleRu : book.titleEn}
            </h2>
            <p className="note">{t.aiNote}</p>
            {book.heroes.map((h) => {
              const hk = heroKey(book.slug, h.id);
              const userGuess = progress.guesses[hk];
              let userMark = "";
              if (userGuess && userGuess !== h.group) {
                userMark = ` · ${t.yourChoice}: ${GROUP_META[userGuess].emoji}`;
              } else if (userGuess) {
                userMark = ` · ${t.matched} ✓`;
              }
              const meta = GROUP_META[h.group as keyof typeof GROUP_META];
              const high: string[] = [];
              const low: string[] = [];
              axisLabels.forEach((ax, i) => {
                const v = h.scores[i] ?? 0;
                if (v > 0.3) high.push(ax.toLowerCase());
                else if (v < -0.3) low.push(ax.toLowerCase());
              });
              return (
                <details key={h.id} className="ai-card">
                  <summary className="ai-card-head">
                    <div className="ai-card-name">
                      {(locale === "ru" ? h.nameRu : h.nameEn) + userMark}
                    </div>
                    <div className={`ai-card-tag ${h.group}`}>
                      {meta.emoji} {t[h.group as keyof typeof t]}
                    </div>
                  </summary>
                  <div className="ai-card-body">
                    <div className="ai-card-grid">
                      <div>
                        <div className="ai-desc">
                          {locale === "ru" ? h.descRu : h.descEn}
                        </div>
                        <div className="ai-axis-list">
                          {axisLabels.map((axis, i) => {
                            const v = h.scores[i] ?? 0;
                            const color =
                              v > 0.3 ? "#f7cd84" : v < -0.3 ? "#d6a8c4" : "#8fdccf";
                            return (
                              <div key={axis} className="ai-axis-row">
                                <span>{axis}</span>
                                <b style={{ color }}>{v.toFixed(1)}</b>
                              </div>
                            );
                          })}
                        </div>
                        <div className="ai-pole">
                          <b>{t.profile}:</b>{" "}
                          {high.length ? `${t.expressed} — ${high.join(", ")}.` : ""}{" "}
                          {low.length ? `${t.reduced} — ${low.join(", ")}.` : ""}
                        </div>
                      </div>
                      <div>
                        <Radar scores={h.scores} labels={axisLabels} />
                      </div>
                    </div>
                  </div>
                </details>
              );
            })}
          </>
        )}
      </div>

      <div className="footer">{t.footer}</div>

      {pendingConfirm && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card">
            <h2>{t.confirmSaveTitle}</h2>
            <p>
              <b>{pendingConfirm.heroName}</b>
              <br />
              {t.confirmSaveBody}
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="ghost"
                onClick={() => setPendingConfirm(null)}
              >
                {t.confirmSaveNo}
              </button>
              <button
                type="button"
                className="primary"
                disabled={saveState === "saving"}
                onClick={() => {
                  const pending = pendingConfirm;
                  setPendingConfirm(null);
                  void persistHero(
                    pending.bookSlug,
                    pending.heroId,
                    pending.heroName,
                    pending.snapshot,
                  );
                }}
              >
                {saveState === "saving" ? t.saving : t.confirmSaveYes}
              </button>
            </div>
          </div>
        </div>
      )}

      {savedModal && !completed && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card">
            <h2>{t.answerSavedTitle}</h2>
            <p>
              <b>{savedModal.heroName}</b>
              <br />
              {t.answerSavedBody}
            </p>
            <ul className="modal-hero-list">
              {savedModal.answered.map((item) => (
                <li key={`${item.bookTitle}-${item.heroName}`}>
                  <span>✓ {item.heroName}</span>
                  <span className="book">{item.bookTitle}</span>
                </li>
              ))}
            </ul>
            <div className="modal-actions">
              <button
                type="button"
                className="primary"
                onClick={() => setSavedModal(null)}
              >
                {t.continueBtn}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
