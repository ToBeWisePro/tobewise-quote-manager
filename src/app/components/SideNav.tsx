"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navigationSections = [
  {
    label: "Library",
    items: [
      { href: "/", label: "Quotes" },
      { href: "/authors", label: "Authors" },
      { href: "/subjects", label: "Subject Explorer" },
      { href: "/author-explorer", label: "Author Explorer" },
    ],
  },
  {
    label: "Workflow",
    items: [
      { href: "/add-quote", label: "Add Quote" },
      { href: "/bulk-upload", label: "Bulk Upload" },
    ],
  },
];

function BrandBlock() {
  return (
    <div className="flex items-center gap-3">
      <Image
        src="/images/image.png"
        alt="Quote Manager Icon"
        width={44}
        height={44}
        priority
        style={{ width: 44, height: 44 }}
        className="rounded-2xl ring-1 ring-slate-200"
      />
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-blue-600">
          Tobewise
        </p>
        <h1 className="text-lg font-semibold text-slate-950">Quote Manager</h1>
      </div>
    </div>
  );
}

export default function SideNav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const renderLinks = () => (
    <nav className="space-y-6">
      {navigationSections.map((section) => (
        <div key={section.label} className="space-y-2">
          <p className="px-3 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
            {section.label}
          </p>
          <div className="space-y-1">
            {section.items.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-2xl px-4 py-3 text-sm font-medium transition ${
                    active
                      ? "bg-slate-900 text-white shadow-lg shadow-slate-900/10"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 border-b border-slate-200/80 bg-white/92 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <BrandBlock />
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:border-blue-200 hover:text-blue-700"
            aria-label="Open navigation"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.8}
              stroke="currentColor"
              className="h-5 w-5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5m-16.5 5.25h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
        </div>
      </header>

      <div
        className={`fixed inset-0 z-40 bg-slate-950/40 transition lg:hidden ${
          mobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setMobileOpen(false)}
      />

      <aside
        className={`fixed left-0 top-0 z-50 h-screen w-64 border-r border-slate-200/80 bg-white/96 shadow-[0_24px_70px_rgba(15,23,42,0.14)] backdrop-blur transition-transform duration-200 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col p-4">
          <div className="flex items-center justify-between">
            <BrandBlock />
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:border-blue-200 hover:text-blue-700 lg:hidden"
              aria-label="Close navigation"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.8}
                stroke="currentColor"
                className="h-5 w-5"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mt-8 flex-1 overflow-y-auto pr-1">{renderLinks()}</div>

          <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
            Keep quotes, authors, and supporting media clean from one place.
          </div>
        </div>
      </aside>
    </>
  );
}
