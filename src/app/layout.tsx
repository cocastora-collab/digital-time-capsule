import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Digital Time Capsule",
  description: "Leave a message for the world of 2030."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}