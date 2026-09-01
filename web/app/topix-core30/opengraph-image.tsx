import { renderOG, ogSize, ogContentType } from "@/lib/og";

export const size = ogSize;
export const contentType = ogContentType;
export const alt = "TOPIX Core 30 — markets-lab";

export default function Image() {
  return renderOG({
    title: "TOPIX Core 30",
    subtitle: "TOPIX Core 30 constituent performance & rotation clock",
  });
}
