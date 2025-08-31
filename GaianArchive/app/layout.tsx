import type { Metadata, Viewport } from "next";
import "./globals.css"; // ⬅️ your CSS with all the styles you pasted earlier

export const metadata: Metadata = {
  title: "Gaian Archive",
  themeColor: "#0b0f14",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
