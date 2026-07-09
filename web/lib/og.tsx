import { ImageResponse } from "next/og";

// OG 画像共通仕様（1200×630）。テキストは既定フォント（Latin）で描画するため
// 日本語グリフの豆腐化を避け、英語表記で統一する。配色は F&G ブランドに準拠。
export const ogSize = { width: 1200, height: 630 };
export const ogContentType = "image/png";

type OGOpts = { title: string; subtitle: string; tag?: string };

export function renderOG({ title, subtitle, tag = "markets-lab" }: OGOpts) {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0e0f0d",
          padding: "72px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #c0392b, #e6b800, #1a9850)",
            }}
          />
          <div
            style={{
              color: "#8b8a80",
              fontSize: "30px",
              letterSpacing: "7px",
              textTransform: "uppercase",
            }}
          >
            {tag}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div
            style={{
              color: "#f5f4ee",
              fontSize: "78px",
              fontWeight: 700,
              lineHeight: 1.05,
            }}
          >
            {title}
          </div>
          <div style={{ color: "#c3c2b7", fontSize: "38px" }}>{subtitle}</div>
        </div>

        <div
          style={{
            display: "flex",
            height: "14px",
            borderRadius: "7px",
            overflow: "hidden",
          }}
        >
          <div style={{ flex: 1, background: "#c0392b" }} />
          <div style={{ flex: 1, background: "#e67e22" }} />
          <div style={{ flex: 1, background: "#e6b800" }} />
          <div style={{ flex: 1, background: "#7cb342" }} />
          <div style={{ flex: 1, background: "#1a9850" }} />
        </div>
      </div>
    ),
    { ...ogSize }
  );
}
