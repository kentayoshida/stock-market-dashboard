import Link from "next/link";

// 米国 / 世界 / 日本業種別 を切り替える共有ヘッダー（全ページ共有）。
export default function SiteHeader({
  active,
}: {
  active: "us" | "global" | "jp";
}) {
  return (
    <header className="site-header">
      <Link href="/" className="brand" aria-label="市場パフォーマンス ホーム">
        <span className="brand-mark" aria-hidden="true" />
        <div>
          <div className="brand-title">市場パフォーマンス</div>
          <div className="brand-sub">Market Performance Dashboard</div>
        </div>
      </Link>
      <nav className="site-nav" aria-label="ダッシュボード切替">
        <Link href="/" className={"nav-link" + (active === "us" ? " is-active" : "")}>
          米国 US
        </Link>
        <Link
          href="/global"
          className={"nav-link" + (active === "global" ? " is-active" : "")}
        >
          世界 Global
        </Link>
        <Link
          href="/jp-sectors"
          className={"nav-link" + (active === "jp" ? " is-active" : "")}
        >
          日本業種別 JP
        </Link>
      </nav>
    </header>
  );
}
