import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sol QR Engine",
  description: "Dynamic QR Code Manager by Sol Agency",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
