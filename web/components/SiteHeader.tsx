"use client";

import Link from "next/link";
import { useLang } from "./LangProvider";
import { ui } from "@/lib/i18n";

// 米国 / 世界 / 日本業種別 を切り替える共有ヘッダー（全ページ共有）。
// 右上に日本語⇄英語の言語トグルを配置（既定=日本語）。
export default function SiteHeader({
  active,
}: {
  active: "us" | "global" | "jp";
}) {
  const { lang, setLang } = useLang();
  const t = ui[lang];

  return (
    <header className="site-header">
      <Link href="/" className="brand" aria-label={t.homeAria}>
        <span className="brand-mark" aria-hidden="true" />
        <div>
          <div className="brand-title">{t.brandTitle}</div>
          <div className="brand-sub">{t.brandSub}</div>
        </div>
      </Link>

      <div className="header-right">
        <nav className="site-nav" aria-label="dashboard">
          <Link href="/" className={"nav-link" + (active === "us" ? " is-active" : "")}>
            {t.navUs}
          </Link>
          <Link
            href="/global"
            className={"nav-link" + (active === "global" ? " is-active" : "")}
          >
            {t.navGlobal}
          </Link>
          <Link
            href="/jp-sectors"
            className={"nav-link" + (active === "jp" ? " is-active" : "")}
          >
            {t.navJp}
          </Link>
        </nav>

        <div className="lang-toggle segmented" role="group" aria-label={t.langLabel}>
          <button
            type="button"
            className={"segment" + (lang === "ja" ? " is-active" : "")}
            aria-pressed={lang === "ja"}
            onClick={() => setLang("ja")}
          >
            日本語
          </button>
          <button
            type="button"
            className={"segment" + (lang === "en" ? " is-active" : "")}
            aria-pressed={lang === "en"}
            onClick={() => setLang("en")}
          >
            EN
          </button>
        </div>
      </div>
    </header>
  );
}
