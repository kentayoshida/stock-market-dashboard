import { renderOG, ogSize, ogContentType } from "@/lib/og";

export const size = ogSize;
export const contentType = ogContentType;
export const alt = "TOPIX-17 Sectors — markets-lab";

export default function Image() {
  return renderOG({
    title: "TOPIX-17 Sectors",
    subtitle: "Japan 17-sector performance & rotation clock",
  });
}
