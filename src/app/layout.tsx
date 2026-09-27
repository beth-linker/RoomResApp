import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "RoomRes", template: "%s · RoomRes" },
  description: "A cheerful little conference room scheduler.",
  applicationName: "RoomRes",
};

export const viewport: Viewport = {
  themeColor: "#6750e8",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
