"""TOPIX-17 業種別ダッシュボードのデータ生成（/topix17）。

topix17.yaml を読み → 各業種に対応する NEXT FUNDS ETF（例: 食品=1617）の価格を
yfinance（"1617.T" 形式）で取得 → 期間リターン＋モメンタムを算出 → topix17.json 出力。

33業種（build_jp.py・J-Quants 指数直取り）と異なり、上場 ETF の価格系列を使う。
期間定義・休場丸めは米国版 §3.1 と同じ（returns.py はデータ自身の営業日で asof）。

使い方:
  python build_topix17.py --source auto       # 本番（yfinance→stooq）
  python build_topix17.py --source fixture     # ローカル: 合成データで UI 検証
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
DEFAULT_CONFIG = ROOT / "pipeline" / "topix17.yaml"
DEFAULT_OUT = ROOT / "web" / "public" / "data" / "topix17.json"

ATTRIBUTION = (
    "TOPIX-17 等の指数値・商標は株式会社JPX総研またはその関連会社の知的財産です。"
    "ETF は NEXT FUNDS シリーズ（野村アセットマネジメント）。"
)
SOURCE_NOTE = (
    "各業種は対応する上場 ETF（NEXT FUNDS）の価格ベース。"
    "配当を含まない価格リターンのため、配当込み TOPIX-17 サブ指数とは差異があります。"
)


def load_config(path: Path) -> dict:
    with open(path, encoding="utf-8") as f:
        return yaml.safe_load(f)


def yf_ticker(code: str) -> str:
    """4桁銘柄コード → 東証サフィックス付き yfinance ティッカー（1617 → 1617.T）。"""
    return f"{code}.T"


def _process(item: dict, price_map: dict, periods: list[str], tr_periods: list[str]) -> tuple[dict, bool]:
    """1 ETF を返り値 dict（returns＋momentum＋status）に変換。"""
    code, label = item["code"], item["label"]
    df = price_map.get(yf_ticker(code))
    base = {"label": label, "code": code, "ticker": code, "review": False}
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

    tickers = [yf_ticker(it["code"]) for it in block["items"]]
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
        "currency": "JPY",
        "market": "JP",
        "periods": periods,
        "total_return_periods": tr_periods,
        "sort": cfg.get("sort", {"default": "code_order"}),
        "coverage": {"ok": n_ok, "no_data": n_missing, "total": n_ok + n_missing},
        "disclaimer": "情報提供目的であり投資助言ではありません。",
        "attribution": ATTRIBUTION,
        "source_note": SOURCE_NOTE,
        "block": {"id": block["id"], "title": block["title"],
                  "columns": block.get("columns", 3), "items": out_items},
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", default="auto",
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
    print(f"[build_topix17] source={data['data_source']} as_of={data['as_of']} "
          f"coverage={cov['ok']}/{cov['total']} (no_data={cov['no_data']})")
    print(f"[build_topix17] wrote {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
