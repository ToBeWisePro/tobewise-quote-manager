"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function SideNav() {
  const pathname = usePathname();

  return (
    <div className="w-64 bg-white h-screen fixed left-0 top-0 shadow-lg">
      <div className="p-4">
        <h1 className="text-2xl font-bold text-primary mb-8">Quote Manager</h1>
        <nav className="space-y-2">
          <Link
            href="/"
            className={`block px-4 py-2 rounded-md ${
              pathname === '/'
                ? 'bg-primary text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Quote Grid
          </Link>
          <Link
            href="/bulk-upload"
            className={`block px-4 py-2 rounded-md ${
              pathname === '/bulk-upload'
                ? 'bg-primary text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Bulk Upload
          </Link>
        </nav>
      </div>
    </div>
  );
} 