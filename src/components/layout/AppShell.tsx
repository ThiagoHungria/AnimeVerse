"use client";

import type { ReactNode } from "react";
import { SidebarNavigation } from "@/components/SidebarNavigation";
import { MobileNavigation } from "@/components/MobileNavigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { PageTransition } from "@/components/layout/PageTransition";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <SidebarNavigation />
      <div className="flex min-h-screen flex-1 flex-col lg:pl-[72px] xl:pl-56">
        <AppHeader />
        <main className="flex-1 pb-20 lg:pb-0">
          <PageTransition>{children}</PageTransition>
        </main>
        <MobileNavigation />
      </div>
    </div>
  );
}
