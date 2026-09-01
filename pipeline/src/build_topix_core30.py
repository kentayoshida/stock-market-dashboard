"""TOPIX Core 30 構成銘柄ダッシュボードのデータ生成（/topix-core30）。

topix_core30.yaml を読み → 構成銘柄（東証上場の個別株）の価格を J-Quants
（JPX公式API v2・/equities/bars/daily、分割調整後終値）で取得 → 期間リターン＋モメンタムを
算出 → topix_core30.json 出力。

ダウ工業株30種（build_dow30.py）と同じ単一ブロック構成だが、価格の取得元が yfinance ではなく
J-Quants（個別株の分割調整後終値）である点が異なる。期間定義・休場丸めは returns.py 共通。
J-Quants は翌営業日更新のため最新値は1営業日ラグになりうる（33業種と同じ）。

使い方:
  python build_topix_core30.py --source jquants    # 本番（要 JQUANTS_API_KEY）
  python build_topix_core30.py --source fixture      # ローカル: 合成データで UI 検証
"""
from __future__ import annotations

import argparse
import json
import math
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

import pandas as pd
import yaml

sys.path.insert(0, str(Path(__file__).resolve().parent))
from jquants import JQuantsClient, JQuantsError  # noqa: E402
from momentum import compute_momentum  # noqa: E402
from returns import compute_returns, latest_date  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CONFIG = ROOT / "pipeline" / "topix_core30.yaml"
DEFAULT_OUT = ROOT / "web" / "public" / "data" / "topix_core30.json"

ATTRIBUTION = (
    "「TOPIX Core30」等の指数値・商標は株式会社JPX総研またはその関連会社の知的財産です。"
    "本ページは指数そのものではなく、構成銘柄それぞれの個別株価（J-Quants・JPX公式API）に"
    "基づくパフォーマンスを表示しています。"
)
SOURCE_NOTE = (
    "構成銘柄は手動更新（TOPIX Core30 は定期的に入れ替えあり）。株価は J-Quants（JPX公式API・"
    "分割調整後終値）。配当を含まない価格リターンです。翌営業日更新のため1営業日ラグとなる場合があります。"
)


def load_config(path: Path) -> dict:
    with open(path, encoding="utf-8") as f:
        return yaml.safe_load(f)


def jq_code(code: str) -> str:
    """4桁銘柄コード → J-Quants の5桁コード（末尾0付与。例 7203 → 72030）。

    既に5桁ならそのまま返す。
    """
    code = str(code).strip()
    return code if len(code) >= 5 else code + "0"


def _fixture_series(code: str, start: date, end: date) -> pd.Series:
    """UI 検証用の合成価格系列（build_jp と同方針・コードで決定的に生成）。"""
    bdays = pd.bdate_range(start=start, end=end)
    seed = (sum(ord(c) for c in code) * 7) % 997
    base = 1500.0 + (seed % 8000)
    drift = ((seed % 9) - 4) * 0.0003
    amp = base * (0.004 + (seed % 6) * 0.001)
    price = base
    vals = []
    for n in range(len(bdays)):
        wave = math.sin((n + seed) / 13.0) * amp + math.sin((n + seed) / 4.0) * amp * 0.3
        price = max(10.0, price * (1 + drift) + wave)
        vals.append(round(price, 1))
    return pd.Series(vals, index=bdays)


def _series_for(item: dict, client: JQuantsClient | None, source: str,
                from_date: str, to_date: str, start: date, end: date) -> pd.Series | None:
    code = item["code"]
    if source == "fixture":
        return _fixture_series(code, start, end)
    try:
        return client.equity_close(jq_code(code), from_date=from_date, to_date=to_date)
    except (JQuantsError, Exception) as e:  # noqa: BLE001
        print(f"[build_topix_core30] {code} ({item['label']}) failed: {e}", file=sys.stderr)
        return None


def build(cfg: dict, source: str, lookback_days: int) -> dict:
    periods: list[str] = cfg.get("periods", ["1D", "1M", "1Y"])
    block = cfg["block"]
    end = date.today()
    start = end - timedelta(days=lookback_days)
    from_date, to_date = start.isoformat(), end.isoformat()

    client = None
    if source == "jquants":
        client = JQuantsClient()
        if not client.is_configured():
            print("[build_topix_core30] JQUANTS_API_KEY 未設定。", file=sys.stderr)

    out_items = []
    item_dates: list[date] = []
    n_ok = n_missing = 0
    for item in block["items"]:
        code, label = item["code"], item["label"]
        base = {"label": label, "ticker": code, "code": code, "review": False}
        s = _series_for(item, client, source, from_date, to_date, start, end)
        if s is None or s.dropna().empty:
            n_missing += 1
            out_items.append({**base, "status": "no_data", "as_of": None, "momentum": None,
                              "returns": {p: {"price": None, "total": None} for p in periods}})
            continue
        df = pd.DataFrame({"close": s.astype(float), "adj_close": pd.NA})
        rets = compute_returns(df, periods, total_return_periods=[])  # 価格リターンのみ
        d = latest_date(df)
        if d:
            item_dates.append(d)
        n_ok += 1
        out_items.append({**base, "status": "ok",
                          "as_of": d.isoformat() if d else None,
                          "returns": rets, "momentum": compute_momentum(df["close"])})

    global_as_of = max(item_dates) if item_dates else None
    return {
        "as_of": global_as_of.isoformat() if global_as_of else None,
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "data_source": source,
        "currency": "JPY",
        "market": "JP",
        "periods": periods,
        "total_return_periods": cfg.get("total_return_periods", []),
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
    ap.add_argument("--source", default="jquants", choices=["jquants", "fixture"])
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
    print(f"[build_topix_core30] source={data['data_source']} as_of={data['as_of']} "
          f"coverage={cov['ok']}/{cov['total']} (no_data={cov['no_data']})")
    print(f"[build_topix_core30] wrote {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
