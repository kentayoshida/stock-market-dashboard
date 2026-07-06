"""33業種別TOPIX の指数コード検証（jp-sector-dashboard-spec.md §3）。

sectors_jp.yaml の各 index_code（16進 0040〜0060）について J-Quants
/indices/bars/daily で取得可否・行数・最新日を検証する。開発サンドボックスからは
J-Quants に到達できないため、GitHub Actions（JQUANTS_API_KEY あり）で実行する。

使い方（CI）:  python validate_jp.py
"""
from __future__ import annotations

import sys
from datetime import date, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_jp import DEFAULT_CONFIG, load_config  # noqa: E402
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
    print(f"# 33業種 指数コード検証 (v2 /indices/bars/daily, {end.isoformat()})\n")
    print(f"{'CODE':<6} {'業種':<14} {'OK':<4} {'ROWS':<6} LATEST")
    print("-" * 48)
    missing = []
    for it in items:
        code = it["index_code"]
        try:
            s = client.index_close(code, from_date=start.isoformat(), to_date=end.isoformat())
            ok, rows = (not s.empty), len(s)
            latest = s.index[-1].date().isoformat() if not s.empty else "-"
        except Exception as e:  # noqa: BLE001
            ok, rows, latest = False, 0, f"ERR:{str(e)[:20]}"
        print(f"{code:<6} {it['label']:<14} {'yes' if ok else 'NO':<4} {rows:<6} {latest}")
        if not ok:
            missing.append((code, it["label"]))

    print("\n## サマリ")
    print(f"- 取得不可の指数コード: {missing or 'なし'}")
    if missing:
        print("  → sectors_jp.yaml の index_code を実在コードに要修正（Ken 相談）")
    return 1 if missing else 0


if __name__ == "__main__":
    raise SystemExit(main())
