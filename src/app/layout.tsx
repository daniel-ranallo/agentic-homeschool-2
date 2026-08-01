import type { Metadata } from "next";
import "./globals.css";

/**
 * Root layout metadata for the application.
 */
export const metadata: Metadata = {
  title: "Agentic Course Design Workbench",
  description: "AI-powered Backward Design curriculum builder",
};

/**
 * Root layout component.
 * Sets up the HTML document structure and basic styling.
 *
 * @param children - Child components to render
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
