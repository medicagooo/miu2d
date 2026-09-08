import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { GAMES } from "./games";
import "./game-hero.css";

const STORAGE_KEY = "miu2d.landing.game";
function initialGame() {
  try {
    return Math.max(
      0,
      GAMES.findIndex((game) => game.slug === sessionStorage.getItem(STORAGE_KEY))
    );
  } catch {
    return 0;
  }
}
export function Hero() {
  const { t } = useTranslation();
  const [selected, setSelected] = useState(initialGame);
  const [requested, setRequested] = useState(selected);
  const [ready, setReady] = useState<Set<number>>(() => new Set());
  const [failed, setFailed] = useState<Set<number>>(() => new Set());
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  const game = GAMES[selected];
  // Each layer remains mounted for interruptible CSS crossfades. Decode before revealing it.
  useEffect(() => {
    let cancelled = false;
    GAMES.forEach((entry, index) => {
      const image = new Image();
      image.src = entry.screenshot;
      image
        .decode()
        .then(() => {
          if (!cancelled) setReady((previous) => new Set(previous).add(index));
        })
        .catch(() => {
          if (!cancelled) setFailed((previous) => new Set(previous).add(index));
        });
    });
    return () => {
      cancelled = true;
      clearTimeout(timer.current);
    };
  }, []);
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, game.slug);
    } catch {
      /* Optional storage. */
    }
  }, [game.slug]);
  useEffect(() => {
    // Keep the previous picture, title and destination together until the newest
    // requested image is decoded. A failed image still has a usable game entry.
    if (ready.has(requested) || failed.has(requested)) setSelected(requested);
  }, [requested, ready, failed]);
  function select(index: number) {
    clearTimeout(timer.current);
    setRequested(index);
  }
  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % GAMES.length;
    else if (event.key === "ArrowLeft") next = (index + GAMES.length - 1) % GAMES.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = GAMES.length - 1;
    else return;
    event.preventDefault();
    select(next);
    buttons.current[next]?.focus();
  }
  return (
    <section
      id="demo"
      className="game-hero"
      style={{ "--game-accent": game.accent } as CSSProperties}
    >
      <div className="game-hero-art" aria-hidden="true">
        {GAMES.map((entry, index) => (
          <img
            key={entry.slug}
            src={entry.screenshot}
            alt=""
            draggable={false}
            className={selected === index && ready.has(index) ? "is-visible" : ""}
            style={{ objectPosition: entry.position }}
          />
        ))}
      </div>
      <div className="game-hero-shade" />
      <div
        className="game-hero-content"
        role="tabpanel"
        id="game-preview"
        aria-labelledby={`game-tab-${game.slug}`}
      >
        <p className="game-hero-eyebrow">MIU2D / {t("gameEntry.collection")}</p>
        <p className="game-hero-edition">{game.subtitle}</p>
        <h1>{t(`demo.tabs.${game.key}`)}</h1>
        <p className="game-hero-description">{t("gameEntry.description")}</p>
        <a className="game-hero-play" href={`/game/${game.slug}`}>
          {t("gameEntry.enter")}
          <span aria-hidden="true">↗</span>
        </a>
        {!ready.has(requested) && !failed.has(requested) && (
          <p className="game-hero-status" role="status">
            {t("gameEntry.loading")}
          </p>
        )}
        {failed.has(selected) && (
          <p className="game-hero-status" role="status">
            {t("gameEntry.unavailable")}
          </p>
        )}
      </div>
      <div className="game-hero-bottom">
        <p className="game-hero-hint">
          {t("gameEntry.choose")}
          <span aria-hidden="true">↓</span>
        </p>
        <div className="game-tabs" role="tablist" aria-label={t("gameEntry.choose")}>
          {GAMES.map((entry, index) => (
            <button
              key={entry.slug}
              type="button"
              role="tab"
              id={`game-tab-${entry.slug}`}
              aria-selected={selected === index}
              aria-controls="game-preview"
              tabIndex={selected === index ? 0 : -1}
              ref={(element) => {
                buttons.current[index] = element;
              }}
              onPointerEnter={(event) => {
                if (event.pointerType === "mouse") {
                  clearTimeout(timer.current);
                  timer.current = setTimeout(() => select(index), 100);
                }
              }}
              onPointerLeave={() => clearTimeout(timer.current)}
              onFocus={() => select(index)}
              onClick={() => select(index)}
              onKeyDown={(event) => onKeyDown(event, index)}
            >
              <span className="game-tab-number">0{index + 1}</span>
              <img src={entry.logo} alt="" />
              <span>{t(`demo.tabs.${entry.key}`)}</span>
              <span className="game-tab-arrow" aria-hidden="true">
                ↗
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
