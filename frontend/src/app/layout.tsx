import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "WebSockets vs WebRTC | Live Interactive Seminar",
  description: "Live demonstration and benchmark comparing HTTP Polling, WebSockets, and WebRTC.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#FBF8F3] text-[#2C221E] selection:bg-[#FFD7C5] selection:text-[#9A3412]">
        {children}
      </body>
    </html>
  );
}
