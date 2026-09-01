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
    start = end - timedelta(days=40)
    print(f"# TOPIX Core30 銘柄コード検証 (v2 /equities/bars/daily, {end.isoformat()})\n")
    print(f"{'CODE':<7} {'銘柄':<20} {'OK':<4} {'ROWS':<6} LATEST")
    print("-" * 56)
    missing = []
    for it in items:
        code = jq_code(it["code"])
        try:
            s = client.equity_close(code, from_date=start.isoformat(), to_date=end.isoformat())
            ok, rows = (not s.empty), len(s)
            latest = s.index[-1].date().isoformat() if not s.empty else "-"
        except Exception as e:  # noqa: BLE001
            ok, rows, latest = False, 0, f"ERR:{str(e)[:20]}"
        print(f"{code:<7} {it['label']:<20} {'yes' if ok else 'NO':<4} {rows:<6} {latest}")
        if not ok:
            missing.append((code, it["label"]))

    print("\n## サマリ")
    print(f"- 取得不可の銘柄コード: {missing or 'なし'}")
    if missing:
        print("  → topix_core30.yaml の code、または jquants.equity_close のパス/桁を要確認")
    return 1 if missing else 0


if __name__ == "__main__":
    raise SystemExit(main())
