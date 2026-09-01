"""NIFTY 50（インド）構成銘柄ダッシュボードのデータ生成（/nifty50）。

nifty50.yaml を読み → 構成銘柄（NSE 上場の個別株50銘柄）の価格を yfinance で取得
（".NS" サフィックス付きシンボル）→ 期間リターン＋モメンタムを算出 → nifty50.json 出力。

ダウ工業株30種（build_dow30.py）と同じ単一ブロック構成。東証 ETF や J-Quants ではなく、
NSE 上場シンボル（"RELIANCE.NS" 等）を yfinance で直接使う。分割は yfinance の Adj Close が
自動調整するため、TOPIX Core30 のような手動の分割調整は不要。通貨は INR。

構成銘柄・英語社名・データ源は 3D ヒートマップ・プロジェクト（3d_heatmap_ni225）に準拠。

使い方:
  python build_nifty50.py --source yfinance    # 本番（NSE は US 引け前に確定済み）
  python build_nifty50.py --source fixture      # ローカル: 合成データで UI 検証
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

import yaml

sys.path.insert(0, str(Path(__file__).resolve().parent))
from fetch import fetch_prices  # noqa: E402
from momentum import compute_momentum  # noqa: E402
from returns import compute_returns, latest_date  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CONFIG = ROOT / "pipeline" / "nifty50.yaml"
DEFAULT_OUT = ROOT / "web" / "public" / "data" / "nifty50.json"

ATTRIBUTION = (
    "「NIFTY 50」等の指数・商標は NSE Indices Ltd. の知的財産です。本ページは指数そのものではなく、"
    "構成50銘柄それぞれの個別株価に基づくパフォーマンスを表示しています。"
)
SOURCE_NOTE = (
    "構成銘柄は手動更新（NIFTY 50 は定期的に入れ替えあり）。株価は Yahoo Finance（NSE 上場・INR）。"
    "配当込みリターン（1Y）は調整後終値（Adj Close）由来の近似です。構成銘柄情報は 3D ヒートマップ・"
    "プロジェクト（3d_heatmap_ni225）に準拠。"
)


def load_config(path: Path) -> dict:
    with open(path, encoding="utf-8") as f:
        return yaml.safe_load(f)


def _process(item: dict, price_map: dict, periods: list[str], tr_periods: list[str]) -> tuple[dict, bool]:
    """1 銘柄を返り値 dict（returns＋momentum＋status）に変換。"""
    ticker, label = item["ticker"], item["label"]
    df = price_map.get(ticker)
    base = {"label": label, "ticker": ticker, "review": False}
    if df is None or df["close"].dropna().empty:
        return {**base, "status": "no_data", "as_of": None, "momentum": None,
                "returns": {p: {"price": None, "total": None} for p in periods}}, False
    rets = compute_returns(df, periods, tr_periods)
    d = latest_date(df)
    return {**base, "status": "ok", "as_of": d.isoformat() if d else None,
            "returns": rets, "momentum": compute_momentum(df["close"])}, True


def build(cfg: dict, source: str, lookback_days: int) -> dict:
    periods: list[str] = cfg.get("periods", ["1D", "1M", "1Y"])
    tr_periods: list[str] = cfg.get("total_return_periods", [])
    block = cfg["block"]

    tickers = [it["ticker"] for it in block["items"]]
    end = date.today()
    start = end - timedelta(days=lookback_days)
    price_map, source_label = fetch_prices(tickers, start, end, source=source)

    out_items = []
    item_dates: list[date] = []
    n_ok = n_missing = 0
    for item in block["items"]:
        obj, ok = _process(item, price_map, periods, tr_periods)
        out_items.append(obj)
        if ok:
            n_ok += 1
            if obj["as_of"]:
                item_dates.append(date.fromisoformat(obj["as_of"]))
        else:
            n_missing += 1

    global_as_of = max(item_dates) if item_dates else None
    return {
        "as_of": global_as_of.isoformat() if global_as_of else None,
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "data_source": source_label,
        "currency": "INR",
        "market": "IN",
        "periods": periods,
        "total_return_periods": tr_periods,
        "sort": cfg.get("sort", {"default": "ticker_order"}),
        "coverage": {"ok": n_ok, "no_data": n_missing, "total": n_ok + n_missing},
        "disclaimer": "情報提供目的であり投資助言ではありません。",
        "attribution": ATTRIBUTION,
        "source_note": SOURCE_NOTE,
        "block": {"id": block["id"], "title": block["title"],
                  "columns": block.get("columns", 2), "items": out_items},
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", default="yfinance",
                    choices=["auto", "yfinance", "stooq", "fixture"])
    ap.add_argument("--config", type=Path, default=DEFAULT_CONFIG)
    ap.add_argument("--out", type=Path, default=DEFAULT_OUT)
    ap.add_argument("--lookback-days", type=int, default=430)
    args = ap.parse_args()

    cfg = load_config(args.config)
    data = build(cfg, source=args.source, lookback_days=args.lookback_days)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    cov = data["coverage"]
    print(f"[build_nifty50] source={data['data_source']} as_of={data['as_of']} "
          f"coverage={cov['ok']}/{cov['total']} (no_data={cov['no_data']})")
    print(f"[build_nifty50] wrote {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
