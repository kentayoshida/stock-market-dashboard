"""ティッカー実在・データ取得可否の検証（market-dashboard-spec.md §2, §9）。

このサンドボックスからは Yahoo Finance / stooq が egress ポリシーで 403 ブロック
されるため、この検証は GitHub Actions（外部ネットワーク可）で実行する。
etfs.yaml の各ティッカーについて、直近データが取得できるか・最新日・1Y分の
行数が揃うかを表にして出力する。「要確認(review)」印の銘柄は明示する。

使い方（CI）:  python validate_tickers.py
"""
from __future__ import annotations

import sys
from datetime import date, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build import all_tickers, load_config, DEFAULT_CONFIG, ROOT  # noqa: E402
from build_global import _all_tickers as global_tickers  # noqa: E402
from fetch import fetch_prices  # noqa: E402

GLOBAL_CONFIG = ROOT / "pipeline" / "etfs_global.yaml"


def main() -> int:
    # 米国版（blocks 構造）＋ 世界版（tiers 構造）の両 config を検証対象にする。
    us_cfg = load_config(DEFAULT_CONFIG)
    review_flags = {
        item["ticker"]: bool(item.get("review", False))
        for b in us_cfg.get("blocks", []) for item in b.get("items", [])
    }
    seen: set[str] = set()
    tickers: list[str] = []
    for t in all_tickers(us_cfg):
        if t not in seen:
            seen.add(t)
            tickers.append(t)
    if GLOBAL_CONFIG.exists():
        for t in global_tickers(load_config(GLOBAL_CONFIG)):
            if t not in seen:
                seen.add(t)
                tickers.append(t)
    end = date.today()
    start = end - timedelta(days=430)

    price_map, source = fetch_prices(tickers, start, end, source="auto")

    print(f"# ティッカー検証 (source={source}, {end.isoformat()})\n")
    print(f"{'TICKER':<8} {'OK':<4} {'ROWS':<6} {'LATEST':<12} {'ADJ':<5} REVIEW")
    print("-" * 50)
    missing, no_adj = [], []
    for t in tickers:
        df = price_map.get(t)
        ok = df is not None and not df["close"].dropna().empty
        rows = len(df["close"].dropna()) if ok else 0
        latest = df["close"].dropna().index[-1].date().isoformat() if ok else "-"
        has_adj = ok and not df["adj_close"].dropna().empty
        rv = "REVIEW" if review_flags.get(t) else ""
        print(f"{t:<8} {'yes' if ok else 'NO':<4} {rows:<6} {latest:<12} "
              f"{'yes' if has_adj else 'no':<5} {rv}")
        if not ok:
            missing.append(t)
        elif not has_adj:
            no_adj.append(t)

    print("\n## サマリ")
    print(f"- 取得不可: {missing or 'なし'}")
    print(f"- 配当込み(Adj Close)なし: {no_adj or 'なし'}")
    print(f"- 要確認(review)印: {[t for t, r in review_flags.items() if r]}")
    return 1 if missing else 0


if __name__ == "__main__":
    raise SystemExit(main())
