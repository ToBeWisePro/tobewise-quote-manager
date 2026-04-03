"use client";

import SideNav from "./SideNav";

interface DashboardPageShellProps {
  children: React.ReactNode;
  contentClassName?: string;
  mainClassName?: string;
}

export default function DashboardPageShell({
  children,
  contentClassName = "flex w-full min-w-0 flex-col gap-6",
  mainClassName = "ml-64 flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8",
}: DashboardPageShellProps) {
  return (
    <div className="flex min-h-screen bg-neutral-light">
      <SideNav />
      <main className={mainClassName}>
        <div className={contentClassName}>{children}</div>
      </main>
    </div>
  );
}
