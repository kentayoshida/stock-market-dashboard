import { renderOG, ogSize, ogContentType } from "@/lib/og";

export const size = ogSize;
export const contentType = ogContentType;
export const alt = "NIFTY 50 — markets-lab";

export default function Image() {
  return renderOG({
    title: "NIFTY 50",
    subtitle: "Nifty 50 constituent performance & rotation clock",
  });
}
