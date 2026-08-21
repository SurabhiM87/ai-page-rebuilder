import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Page Rebuilder | Turn Webpages into Safe React",
  description: "Analyze public webpages and reconstruct their visual structure as safe, reusable React components.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
