import type { Metadata } from "next";
import "./globals.css";
import { FocusDock } from "@/components/FocusDock";
import { Nav } from "@/components/Nav";
export const metadata: Metadata = { title: "Boardo — Your day, with intention", description: "A private daily assistant for what matters next." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body><Nav /><main>{children}</main><FocusDock /></body></html>; }
