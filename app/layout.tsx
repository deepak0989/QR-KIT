import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "QR Studio — Free Custom QR Code Generator",
  description:
    "Create and customize static QR codes for links, Wi-Fi, menus, payments, and contact cards. Download high-quality PNG or SVG QR codes instantly."
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
