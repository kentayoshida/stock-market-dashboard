"""TOPIX Core 30 構成銘柄コードの検証（J-Quants /equities/bars/daily）。

topix_core30.yaml の各 code（4桁→5桁）について J-Quants で取得可否・行数・最新日を検証する。
開発サンドボックスからは J-Quants に到達できないため、GitHub Actions（JQUANTS_API_KEY あり）で
実行する。エンドポイントパス・コード桁・列名の妥当性を初回に確認するための道具。

使い方（CI）:  python validate_core30.py
"""
from __future__ import annotations

import sys
from datetime import date, timedelta
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_topix_core30 import DEFAULT_CONFIG, jq_code, load_config  # noqa: E402
from jquants import JQuantsClient  # noqa: E402


def main() -> int:
    cfg = load_config(DEFAULT_CONFIG)
    items = cfg["block"]["items"]
    client = JQuantsClient()
    if not client.is_configured():
        print("JQUANTS_API_KEY 未設定のため検証できません。", file=sys.stderr)
        return 2

    end = date.today()
    # 分割調整の検証には1年超の窓が必要（52週内の除権日を跨ぐため）。
    start = end - timedelta(days=430)
    from_date, to_date = start.isoformat(), end.isoformat()

    # --- 生レスポンスの列名ダンプ（1銘柄・スキーマ確認用）---
    probe = jq_code(items[0]["code"])
    try:
        raw = client._get("/equities/bars/daily",
                          {"code": probe, "from": from_date, "to": to_date})
        cols = list(raw[0].keys()) if raw else []
        print(f"# /equities/bars/daily 応答列（{probe}）: {cols}\n")
    except Exception as e:  # noqa: BLE001
        print(f"# 列ダンプ失敗: {e}\n", file=sys.stderr)

    print(f"# TOPIX Core30 銘柄検証 (v2 /equities/bars/daily, {end.isoformat()})")
    print(f"# 分割調整の効き目確認（source＝採用した調整経路。DD52=52週高値ドローダウン%）\n")
    print(f"{'CODE':<7} {'銘柄':<20} {'OK':<4} {'ROWS':<6} {'DD52':<9} SOURCE(debug)")
    print("-" * 72)
    missing = []
    for it in items:
        code = jq_code(it["code"])
        try:
            # debug=True で採用経路（self-adjust / AdjustmentClose / raw）を stderr に出す。
            s = client.equity_close(code, from_date=from_date, to_date=to_date, debug=True)
            ok, rows = (not s.empty), len(s)
            if not s.empty:
                win = s.loc[s.index[-1] - pd.Timedelta(days=365):]
                dd = round((float(s.iloc[-1]) - float(win.max())) / float(win.max()) * 100, 2)
                dd_s = f"{dd:>7.2f}%"
            else:
                dd_s = "-"
        except Exception as e:  # noqa: BLE001
            ok, rows, dd_s = False, 0, f"ERR:{str(e)[:20]}"
        print(f"{code:<7} {it['label']:<20} {'yes' if ok else 'NO':<4} {rows:<6} {dd_s:<9}")
        if not ok:
            missing.append((code, it["label"]))

    print("\n## サマリ")
    print(f"- 取得不可の銘柄コード: {missing or 'なし'}")
    print("- DD52 が -60% を超える銘柄が残っていれば、分割調整が効いていない可能性 → "
          "上の応答列名を確認し jquants.equity_close の調整経路を調整。")
    if missing:
        print("  → topix_core30.yaml の code、または jquants.equity_close のパス/桁を要確認")
    return 1 if missing else 0


if __name__ == "__main__":
    raise SystemExit(main())
