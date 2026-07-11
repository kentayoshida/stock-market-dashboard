"use client";

import { useLang } from "./LangProvider";
import { ui } from "@/lib/i18n";

const DASH_URL = "https://dashboard.markets-lab.com/";
const JFGI_URL = "https://jfgi.markets-lab.com/";
const NAMAE_URL = "https://www.namae-lab.com/";
const DEVIL_URL = "https://www.devil-fruit-maker.com/";
const MANSION_URL = "https://mansion-poem-maker.vercel.app/";

export default function Portal() {
  const { lang, setLang } = useLang();
  const t = ui[lang];
  const p = t.portal;

  return (
    <div className="portal">
      <div className="portal-topbar">
        <div
          className="segmented lang-toggle"
          role="group"
          aria-label={t.langLabel}
        >
          <button
            className={"segment" + (lang === "ja" ? " is-active" : "")}
            aria-pressed={lang === "ja"}
            onClick={() => setLang("ja")}
          >
            日本語
          </button>
          <button
            className={"segment" + (lang === "en" ? " is-active" : "")}
            aria-pressed={lang === "en"}
            onClick={() => setLang("en")}
          >
            EN
          </button>
        </div>
      </div>

      <main className="portal-main">
        <header className="portal-hero">
          <h1 className="portal-brand">markets-lab</h1>
          <p className="portal-sub">{p.sub}</p>
          <p className="portal-intro">{p.intro}</p>
        </header>

        <div className="portal-cards">
          <a
            className="portal-card"
            href={DASH_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="portal-card-emoji" aria-hidden="true">
              📊
            </span>
            <span className="portal-card-body">
              <span className="portal-card-title">{p.dashTitle}</span>
              <span className="portal-card-desc">{p.dashDesc}</span>
              <span className="portal-card-cta">{p.visit}</span>
            </span>
          </a>

          <a
            className="portal-card"
            href={JFGI_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="portal-card-emoji" aria-hidden="true">
              😱
            </span>
            <span className="portal-card-body">
              <span className="portal-card-title">{p.jfgiTitle}</span>
              <span className="portal-card-desc">{p.jfgiDesc}</span>
              <span className="portal-card-cta">{p.visit}</span>
            </span>
          </a>
        </div>

        <section className="portal-fun" aria-label={p.funHeading}>
          <div className="portal-fun-head">
            <span className="portal-fun-eyebrow">{p.funHeading}</span>
            <span className="portal-fun-note">{p.funNote}</span>
          </div>
          <div className="portal-fun-links">
            <a
              className="portal-fun-link"
              href={NAMAE_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="portal-fun-emoji" aria-hidden="true">
                🔤
              </span>
              <span className="portal-fun-body">
                <span className="portal-fun-title">{p.namaeTitle}</span>
                <span className="portal-fun-desc">{p.namaeDesc}</span>
              </span>
              <span className="portal-fun-arrow" aria-hidden="true">
                ↗
              </span>
            </a>
            <a
              className="portal-fun-link"
              href={DEVIL_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="portal-fun-emoji" aria-hidden="true">
                🍥
              </span>
              <span className="portal-fun-body">
                <span className="portal-fun-title">{p.devilTitle}</span>
                <span className="portal-fun-desc">{p.devilDesc}</span>
              </span>
              <span className="portal-fun-arrow" aria-hidden="true">
                ↗
              </span>
            </a>
            <a
              className="portal-fun-link"
              href={MANSION_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="portal-fun-emoji" aria-hidden="true">
                🏢
              </span>
              <span className="portal-fun-body">
                <span className="portal-fun-title">{p.mansionTitle}</span>
                <span className="portal-fun-desc">{p.mansionDesc}</span>
              </span>
              <span className="portal-fun-arrow" aria-hidden="true">
                ↗
              </span>
            </a>
          </div>
        </section>
      </main>

      <footer className="portal-footer">
        <p>{t.disclaimer}</p>
      </footer>
    </div>
  );
}
