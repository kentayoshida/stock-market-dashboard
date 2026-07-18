import { renderOG, ogSize, ogContentType } from "@/lib/og";

export const size = ogSize;
export const contentType = ogContentType;
export const alt = "Dow Jones 30 — markets-lab";

export default function Image() {
  return renderOG({
    title: "Dow Jones 30",
    subtitle: "Dow 30 constituent performance & rotation clock",
  });
}
