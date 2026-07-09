import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// apex ドメイン（markets-lab.com）はランディング（/portal）を表示。
// dashboard.markets-lab.com など配下のサブドメインは通常のダッシュボードを表示。
const APEX_HOSTS = new Set(["markets-lab.com", "www.markets-lab.com"]);

export function middleware(req: NextRequest) {
  const host = (req.headers.get("host") ?? "").split(":")[0].toLowerCase();
  if (APEX_HOSTS.has(host)) {
    const url = req.nextUrl.clone();
    url.pathname = "/portal";
    return NextResponse.rewrite(url);
  }
  return NextResponse.next();
}

// ルートアクセスのみ判定（配下ページはそのまま各ドメインで配信）。
export const config = {
  matcher: ["/"],
};
