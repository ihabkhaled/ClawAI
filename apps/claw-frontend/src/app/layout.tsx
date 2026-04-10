import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { THEME_INIT_SCRIPT } from "@/constants/theme.constants";

import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Claw - AI Orchestration Platform",
  description:
    "Local-first AI orchestration platform for managing connectors, models, and conversations.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* eslint-disable-next-line react/no-danger */}
        <script
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
