import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/shell/Sidebar";
import { Topbar } from "@/components/shell/Topbar";

export const metadata: Metadata = {
  title: "pelagos-sss — Marine Debris Ops Console",
  description:
    "Indian side-scan sonar marine-debris intelligence. Ranked, dive-ready cleanup targets — SIH 2026.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-hidden">
            <Topbar />
            <main className="flex-1 overflow-hidden">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
