#!/usr/bin/env python3
"""日次バッチ更新後の 1D パフォーマンスを X（Twitter）へ画像付きで投稿する。

日次ワークフロー（update-data.yml / update-data-jp.yml）がデータ JSON を再生成・commit
した直後に呼ぶ。手順：
  1) 対象 JSON（topix17.json / latest.json）から 1D 降順のランキング画像を生成
  2) 重複ガード：状態ファイルの as_of と同じなら「更新なし」として投稿せず終了
     （祝日など指数が進まない日は再投稿しない）
  3) 本文（日本語・URL・免責・ハッシュタグ）を組み立て
  4) tweepy でメディアアップロード → ツイート作成（OAuth1.0a ユーザーコンテキスト）
  5) 成功したら状態ファイル（x_last_posted.json）を更新

安全側の設計（Japanese-Fear-and-Greed-Index の post_to_x.py と同方針）:
- X 認証情報（環境変数）が未設定なら、投稿せずログを出して正常終了する
  （Secrets 未設定の環境でも日次バッチを壊さない）。
- `--dry-run` は画像生成と本文出力までで、X API を一切呼ばない（クレデンシャル不要で検証可）。

認証情報（GitHub Secrets）:
  X_API_KEY / X_API_SECRET / X_ACCESS_TOKEN / X_ACCESS_SECRET
サイトURL（GitHub Variables 推奨）:
  SITE_URL  例: https://dashboard.markets-lab.com/
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

SRC_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SRC_DIR))

import x_card  # noqa: E402

DEFAULT_STATE_PATH = x_card.DATA_DIR / "x_last_posted.json"
DEFAULT_SITE = "https://dashboard.markets-lab.com/"
_CRED_KEYS = ("X_API_KEY", "X_API_SECRET", "X_ACCESS_TOKEN", "X_ACCESS_SECRET")

# variant → ダッシュボード内の該当ページ（本文のリンク先）
_PAGE_PATH = {"topix17": "topix17", "us": ""}
# variant → 本文の見出し
_TWEET_HEAD = {
    "topix17": "日本株 1D（主要指数・TOPIX-17業種）",
    "us": "米国株 1D（指数ETF・S&P500セクターETF）",
}
_HASHTAGS = {
    "topix17": "#日本株 #TOPIX #セクター",
    "us": "#米国株 #ETF #セクター",
}


def _weighted_len(text: str) -> int:
    """X の文字数カウント近似：CJK・全角は2、その他は1で数える。"""
    return sum(2 if ord(ch) > 0x1100 else 1 for ch in text)


def _fmt(v: float) -> str:
    sign = "+" if v > 0 else ("−" if v < 0 else "±")
    return f"{sign}{abs(v):.2f}%"


def _movers(panels: list[dict]) -> tuple[dict | None, dict | None]:
    """全パネルを通じた最上位・最下位（1D）を返す。"""
    rows = [r for p in panels for r in p["rows"]]
    if not rows:
        return None, None
    return max(rows, key=lambda r: r["value"]), min(rows, key=lambda r: r["value"])


def build_tweet_text(variant: str, panels: list[dict], as_of: str, site_url: str) -> str:
    """投稿本文を組み立てる（280 の重み付き文字数に収める）。"""
    short = x_card._short_date(as_of) if hasattr(x_card, "_short_date") else as_of
    # topix17 は主要指数パネルに単位の異なる日本VI 等が混じるため、代表騰落は
    # 最終パネル（TOPIX-17 業種）から採る。us は全パネルが同単位のため全体から。
    mover_panels = panels[-1:] if variant == "topix17" else panels
    top, bottom = _movers(mover_panels)
    lines = [f"【{_TWEET_HEAD[variant]}】{short} Close分"]
    if top and bottom:
        lines.append(f"🔺{top['label']} {_fmt(top['value'])}")
        lines.append(f"🔻{bottom['label']} {_fmt(bottom['value'])}")
    page = site_url.rstrip("/") + ("/" + _PAGE_PATH[variant] if _PAGE_PATH[variant] else "/")
    lines += ["", f"詳しく見る → {page}"]
    # 免責は画像フッターに記載済みのため本文からは省略（冗長回避）。
    text = "\n".join(lines) + f"\n\n{_HASHTAGS[variant]}"
    if _weighted_len(text) > 280:  # 収まらなければハッシュタグ行を落とす
        text = "\n".join(lines)
    return text


def _load_state(path: Path) -> dict:
    if path.exists():
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except Exception:  # noqa: BLE001  壊れていたら空扱いで作り直す
            return {}
    return {}


def _already_posted(state: dict, variant: str, as_of: str) -> bool:
    return bool(as_of) and state.get(variant, {}).get("as_of") == as_of


def _write_state(path: Path, state: dict, variant: str, as_of: str) -> None:
    state[variant] = {"as_of": as_of, "posted_at": datetime.now(timezone.utc).isoformat()}
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(state, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def _post_to_x(image_paths: list[str], text: str) -> str:
    """tweepy でメディアアップロード（最大4枚）→ ツイート作成。ツイートIDを返す。"""
    import tweepy

    api_key = os.environ["X_API_KEY"]
    api_secret = os.environ["X_API_SECRET"]
    access_token = os.environ["X_ACCESS_TOKEN"]
    access_secret = os.environ["X_ACCESS_SECRET"]

    # 画像アップロードは v1.1 media/upload（OAuth1.0a）
    auth = tweepy.OAuth1UserHandler(api_key, api_secret, access_token, access_secret)
    api_v1 = tweepy.API(auth)
    media_ids = [api_v1.media_upload(filename=p).media_id for p in image_paths[:4]]

    # ツイート作成は v2 create_tweet
    client = tweepy.Client(
        consumer_key=api_key,
        consumer_secret=api_secret,
        access_token=access_token,
        access_token_secret=access_secret,
    )
    resp = client.create_tweet(text=text, media_ids=media_ids)
    return str(resp.data.get("id"))


def main() -> int:
    ap = argparse.ArgumentParser(description="1DパフォーマンスをXへ自動投稿")
    ap.add_argument("--variant", required=True, choices=["topix17", "us"])
    ap.add_argument("--layout", default="2panel", choices=["2panel", "split"],
                    help="us のみ: 2panel=1枚2パネル / split=1ブロック1画像×2枚")
    ap.add_argument("--dry-run", action="store_true",
                    help="画像生成と本文出力のみ。X API を呼ばない")
    ap.add_argument("--force", action="store_true",
                    help="重複ガードを無視して投稿（同一 as_of でも実行）")
    ap.add_argument("--state", default=str(DEFAULT_STATE_PATH))
    args = ap.parse_args()

    panels, as_of = x_card.build_panels(args.variant)
    state_path = Path(args.state)
    state = _load_state(state_path)

    # 重複ガード（as_of が進んだ時だけ投稿）
    if not args.force and _already_posted(state, args.variant, as_of):
        print(f"[skip] {args.variant}: as_of={as_of} は投稿済み。更新なしのためスキップ。")
        return 0

    site_url = (os.environ.get("SITE_URL") or DEFAULT_SITE).strip()
    text = build_tweet_text(args.variant, panels, as_of, site_url)

    # 画像生成（dry-run でも作って中身を確認できるように）
    tmp = Path(tempfile.gettempdir())
    out1 = str(tmp / f"x_{args.variant}.png")
    out2 = str(tmp / f"x_{args.variant}_2.png")
    image_paths = x_card.render(args.variant, out1, layout=args.layout, out_path2=out2)

    print("---- tweet text ----")
    print(text)
    print(f"---- weighted length: {_weighted_len(text)}/280 ----")
    print(f"images: {image_paths}")

    if args.dry_run:
        print("[dry-run] X API は呼び出しませんでした。")
        return 0

    missing = [k for k in _CRED_KEYS if not os.environ.get(k)]
    if missing:
        print(f"[skip] X 認証情報が未設定のため投稿しません（未設定: {', '.join(missing)}）。")
        return 0

    tweet_id = _post_to_x(image_paths, text)
    print(f"[posted] tweet id={tweet_id}")
    _write_state(state_path, state, args.variant, as_of)
    print(f"[state] {state_path} を更新（as_of={as_of}）")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
