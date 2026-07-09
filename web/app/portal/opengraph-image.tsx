import { renderOG, ogSize, ogContentType } from "@/lib/og";

export const size = ogSize;
export const contentType = ogContentType;
export const alt = "markets-lab — Markets Data Lab";

export default function Image() {
  return renderOG({
    title: "markets-lab",
    subtitle: "Markets Data Lab · dashboards & sentiment",
    tag: "markets-lab.com",
  });
}
