import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/shell/Sidebar";
import { Topbar } from "@/components/shell/Topbar";

export const metadata: Metadata = {
  title: "Nexus AI — Enterprise AI Operations Platform",
  description:
    "Independent illustrative engineering demonstration: an integrated AI operations platform for support, sales, and messaging. Synthetic data only.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Sidebar />
        <div className="lg:pl-[248px]">
          <Topbar />
          <main className="mx-auto max-w-[1360px] px-6 py-7">{children}</main>
        </div>
      </body>
    </html>
  );
}
