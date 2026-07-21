#!/usr/bin/env python3
"""X（Twitter）投稿用の「1D パフォーマンス・ランキング表」画像（PNG）を生成する。

`web/public/data/<dataset>.json` の値から自己完結 HTML を組み立て、Playwright(chromium)
で 1200×675（@2x）の PNG にスクリーンショットする。X のタイムラインは 16:9 で表示される
ため、この比率にしておくと切れずに全体が出る。

配色・ダイバージングバーの見た目は Web 版（`web/components/PerfRow.tsx` /
`web/app/globals.css` / `web/app/design-tokens.css`）と一致させ、サイトと同じ印象にする。

対応 variant:
  topix17 : topix17.json の block.items（17業種）を 1D 降順・1パネル
  us      : latest.json の us_index / sectors ブロックを 1D 降順
            layout="2panel"（1枚2パネル）または layout="split"（1ブロック1画像×2枚）

CLI 例:
  python pipeline/src/x_card.py --variant topix17 --out /tmp/topix17.png
  python pipeline/src/x_card.py --variant us --layout 2panel --out /tmp/us.png
  python pipeline/src/x_card.py --variant us --layout split \
      --out /tmp/us_index.png --out2 /tmp/sectors.png
"""

from __future__ import annotations

import argparse
import html as _html
import json
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "web" / "public" / "data"

SITE_DOMAIN = "dashboard.markets-lab.com"
DISCLAIMER = "情報提供目的であり投資助言ではありません。"

# --- 配色（web/app/globals.css ライトテーマと一致） ---
COL = {
    "gain": "#1a9850",
    "loss": "#c0392b",
    "gain_strong": "#14803f",
    "loss_strong": "#9c2b20",
    "surface": "#ffffff",
    "surface2": "#f7f8fa",
    "border": "#e0e0e0",
    "ink": "#0d0d0d",
    "ink2": "#5a6570",
    "ink_muted": "#8a929b",
}


# ---- データ読み込み ----------------------------------------------------------
def _load(name: str) -> dict:
    return json.loads((DATA_DIR / name).read_text(encoding="utf-8"))


def _rows_from_items(items: list[dict], period: str = "1D", sort: bool = True) -> list[dict]:
    """status=ok かつ当該期間 price が数値のアイテムを行に変換。

    sort=True: price 降順。sort=False: config 順のまま（主要指数パネル用）。
    """
    rows = []
    for it in items:
        if it.get("status") != "ok":
            continue
        r = (it.get("returns") or {}).get(period) or {}
        v = r.get("price")
        if v is None:
            continue
        rows.append({"label": it.get("label", it.get("ticker", "")), "value": float(v)})
    if sort:
        rows.sort(key=lambda x: x["value"], reverse=True)
    return rows


def build_panels(variant: str) -> tuple[list[dict], str]:
    """variant → (panels, as_of)。panel = {title, rows}。"""
    if variant == "topix17":
        data = _load("topix17.json")
        as_of = data.get("as_of", "")
        panels = []
        idx = data.get("indices")
        if idx and idx.get("items"):
            # 主要指数は固定順（並び替えしない）
            panels.append({"title": idx.get("title", "主要指数"),
                           "rows": _rows_from_items(idx["items"], sort=False)})
        panels.append({"title": "TOPIX-17 業種別",
                       "rows": _rows_from_items(data["block"]["items"], sort=True)})
        return panels, as_of

    if variant == "us":
        data = _load("latest.json")
        as_of = data.get("as_of", "")
        by_id = {b["id"]: b for b in data.get("blocks", [])}
        panels = []
        for bid in ("us_index", "sectors"):
            b = by_id.get(bid)
            if not b:
                continue
            panels.append({"title": b.get("title", bid),
                           "rows": _rows_from_items(b["items"])})
        return panels, as_of

    raise ValueError(f"unknown variant: {variant}")


# ---- 色計算（PerfRow.tsx と同じ式） -----------------------------------------
def _mix(hex_a: str, pct: int, hex_b: str) -> str:
    """color-mix(in srgb, hex_a pct%, hex_b) 相当。"""
    a = hex_a.lstrip("#")
    b = hex_b.lstrip("#")
    f = max(0, min(100, pct)) / 100.0
    out = []
    for i in (0, 2, 4):
        ca = int(a[i:i + 2], 16)
        cb = int(b[i:i + 2], 16)
        out.append(round(ca * f + cb * (1 - f)))
    return "#{:02x}{:02x}{:02x}".format(*out)


def _fmt_pct(v: float) -> str:
    sign = "+" if v > 0 else ("−" if v < 0 else "±")  # + / − / ±
    return f"{sign}{abs(v):.2f}%"


def _row_html(row: dict, max_abs: float) -> str:
    v = row["value"]
    pos = v >= 0
    ratio = min(1.0, abs(v) / max_abs) if max_abs > 0 else 0.0
    half = ratio * 50.0  # 中心から片側最大50%
    depth = round((0.4 + 0.6 * ratio) * 100)
    hue = COL["gain"] if pos else COL["loss"]
    fill = _mix(hue, depth, COL["surface2"])
    val_col = COL["gain_strong"] if pos else COL["loss_strong"]
    name = _html.escape(row["label"])
    if pos:
        bar_style = f"left:50%;width:{half:.2f}%;background:{fill};"
    else:
        bar_style = f"right:50%;width:{half:.2f}%;background:{fill};"
    return (
        '<div class="row">'
        f'<div class="name">{name}</div>'
        f'<div class="val" style="color:{val_col}">{_fmt_pct(v)}</div>'
        '<div class="bar"><span class="axis"></span>'
        f'<span class="fill" style="{bar_style}"></span></div>'
        '</div>'
    )


def _panel_html(panel: dict, show_title: bool) -> str:
    rows = panel["rows"]
    max_abs = max((abs(r["value"]) for r in rows), default=0.0)
    rows_html = "".join(_row_html(r, max_abs) for r in rows)
    head = ""
    if show_title:
        head = f'<div class="panel-head">{_html.escape(panel["title"])}</div>'
    return f'<div class="panel">{head}<div class="rows">{rows_html}</div></div>'


def build_html(panels: list[dict], as_of: str, heading: str) -> str:
    multi = len(panels) > 1
    panels_html = "".join(_panel_html(p, show_title=multi) for p in panels)
    grid = "two" if multi else "one"
    subtitle = f"{as_of} 時点"
    C = COL
    return f"""<!DOCTYPE html>
<html lang="ja"><head><meta charset="utf-8"><style>
  * {{ margin:0; padding:0; box-sizing:border-box; }}
  html,body {{ width:1200px; height:675px; }}
  body {{
    font-family:"Inter","Noto Sans JP","Hiragino Kaku Gothic ProN","Noto Sans CJK JP",sans-serif;
    background:{C['surface']}; color:{C['ink']}; -webkit-font-smoothing:antialiased;
  }}
  .card {{
    width:1200px; height:675px; padding:34px 56px 24px;
    display:flex; flex-direction:column; border-top:6px solid {C['loss']};
    overflow:hidden;
  }}
  .head {{ margin-bottom:16px; flex:none; }}
  .eyebrow {{ font-size:18px; font-weight:700; letter-spacing:0.10em;
    text-transform:uppercase; color:{C['ink2']}; }}
  .title {{ font-size:38px; font-weight:800; margin-top:2px; letter-spacing:-0.01em; }}
  .subtitle {{ font-size:18px; font-weight:600; color:{C['ink2']}; margin-top:6px; }}
  .panels {{ flex:1; display:grid; gap:48px; min-height:0; }}
  .panels.two {{ grid-template-columns:1fr 1fr; }}
  .panels.one {{ grid-template-columns:1fr; }}
  .panel {{ display:flex; flex-direction:column; min-height:0; }}
  .panel-head {{ font-size:23px; font-weight:800; flex:none;
    border-bottom:2px solid {C['ink']}; padding-bottom:8px; margin-bottom:2px; }}
  .rows {{ flex:1; display:flex; flex-direction:column; min-height:0; }}
  .row {{ flex:1 1 0; min-height:0; display:grid; grid-template-columns:1fr 92px 148px;
    align-items:center; gap:14px; border-bottom:1px solid {C['border']}; }}
  /* 1パネル（TOPIX-17）は横幅が広く名前列が伸びて余白が空くため、
     名前・値・バーを内容幅の固定グループにして中央寄せし、余白を詰める。 */
  .panels.one .row {{ grid-template-columns:minmax(220px, max-content) 92px 200px;
    justify-content:center; gap:18px; }}
  .panels.one .name {{ text-align:right; }}
  .name {{ font-size:19px; font-weight:600; white-space:nowrap; overflow:hidden;
    text-overflow:ellipsis; }}
  .val {{ font-size:20px; font-weight:700; text-align:right;
    font-variant-numeric:tabular-nums; }}
  .bar {{ position:relative; height:13px; background:{C['surface2']};
    border-radius:3px; box-shadow:inset 0 0 0 1px {C['border']}; }}
  .axis {{ position:absolute; left:50%; top:-2px; bottom:-2px; width:1px;
    background:{C['ink_muted']}; transform:translateX(-0.5px); }}
  .fill {{ position:absolute; top:2px; bottom:2px; border-radius:2px; }}
  .footer {{ display:flex; justify-content:space-between; align-items:flex-end;
    flex:none; border-top:1px solid {C['border']}; padding-top:12px; margin-top:14px; }}
  .footer .site {{ font-size:20px; font-weight:700; color:{C['ink']}; }}
  .footer .disc {{ font-size:15px; color:{C['ink_muted']}; }}
</style></head><body>
  <div class="card">
    <div class="head">
      <div class="eyebrow">markets-lab ・ Stock Dashboard</div>
      <div class="title">{_html.escape(heading)}</div>
      <div class="subtitle">{_html.escape(subtitle)}</div>
    </div>
    <div class="panels {grid}">{panels_html}</div>
    <div class="footer">
      <span class="site">{SITE_DOMAIN}</span>
      <span class="disc">{DISCLAIMER}</span>
    </div>
  </div>
</body></html>"""


# ---- レンダリング ------------------------------------------------------------
def _render(html_str: str, out_path: str) -> str:
    import os

    from playwright.sync_api import sync_playwright

    out = Path(out_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    exe = os.environ.get("PLAYWRIGHT_CHROMIUM_PATH")
    launch_kwargs = {"executable_path": exe} if exe else {}
    with sync_playwright() as p:
        browser = p.chromium.launch(**launch_kwargs)
        try:
            page = browser.new_page(viewport={"width": 1200, "height": 675},
                                    device_scale_factor=2)
            page.set_content(html_str, wait_until="networkidle")
            page.locator(".card").screenshot(path=str(out))
        finally:
            browser.close()
    return str(out)


_HEADINGS = {
    "topix17": "日本株 1Dパフォーマンス",
    "us": "米国 1Dパフォーマンス",
    "us_index": "主要米国株価指数 ETF 1Dパフォーマンス",
    "sectors": "S&P500 セクター ETF 1Dパフォーマンス",
}


def render(variant: str, out_path: str, layout: str = "2panel",
           out_path2: str | None = None) -> list[str]:
    """variant のカードを描画し、生成した PNG パスのリストを返す。"""
    panels, as_of = build_panels(variant)

    if variant == "us" and layout == "split":
        # 1ブロック1画像 × 2枚。out_path=指数ETF / out_path2=セクターETF。
        keys = ["us_index", "sectors"]
        outs = [out_path, out_path2 or str(Path(out_path).with_name("card2.png"))]
        results = []
        for panel, key, outp in zip(panels, keys, outs):
            h = build_html([panel], as_of, _HEADINGS.get(key, panel["title"]))
            results.append(_render(h, outp))
        return results

    heading = _HEADINGS.get(variant, panels[0]["title"] if panels else variant)
    return [_render(build_html(panels, as_of, heading), out_path)]


def main() -> int:
    ap = argparse.ArgumentParser(description="1Dパフォーマンス・ランキング画像(PNG)生成")
    ap.add_argument("--variant", required=True, choices=["topix17", "us"])
    ap.add_argument("--layout", default="2panel", choices=["2panel", "split"],
                    help="us のみ: 2panel=1枚2パネル / split=1ブロック1画像×2枚")
    ap.add_argument("--out", default=str(Path(tempfile.gettempdir()) / "x_card.png"))
    ap.add_argument("--out2", default=None, help="split の2枚目（セクターETF）出力先")
    args = ap.parse_args()
    paths = render(args.variant, args.out, layout=args.layout, out_path2=args.out2)
    for p in paths:
        print(f"wrote {p}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
