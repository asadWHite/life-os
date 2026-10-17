import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { getCurrentUser } from "@/lib/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Life OS", template: "%s · Life OS" },
  description: "A calm personal operating system for tasks, habits, sleep, focus and real progress.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F2F2F0" },
    { media: "(prefers-color-scheme: dark)", color: "#191A19" },
  ],
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser().catch(() => null);
  const appearance = user?.appearance ?? "system";
  const htmlClass = appearance === "dark" ? "dark" : "";

  return (
    <html lang={user?.language ?? "uz"} className={htmlClass} suppressHydrationWarning data-appearance={appearance}>
      <head>
        {/* Resolve "system" appearance before paint to avoid a flash; keeps
            server-set explicit choices untouched. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var m=document.documentElement.dataset.appearance||"system";var dark=m==="dark"||(m==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",dark);}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-dvh bg-canvas text-ink antialiased">{children}</body>
    </html>
  );
}
