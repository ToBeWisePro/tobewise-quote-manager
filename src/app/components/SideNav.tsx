"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../hooks/useAuth';

export default function SideNav() {
  const pathname = usePathname();
  const { authenticated } = useAuth();

  const isActive = (path: string) => pathname === path;

  return (
    <div className="w-64 bg-white h-screen fixed left-0 top-0 shadow-lg">
      <div className="p-4">
        <h1 className="text-2xl font-bold text-primary mb-8">Quote Manager</h1>
        <nav className="space-y-2">
          <Link
            href="/"
            className={`block px-4 py-2 rounded-md ${
              isActive("/")
                ? 'bg-primary text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Quotes
          </Link>
          <Link
            href="/add-quote"
            className={`block px-4 py-2 rounded-md ${
              isActive("/add-quote")
                ? 'bg-primary text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Add Quote
          </Link>
          <Link
            href="/bulk-upload"
            className={`block px-4 py-2 rounded-md ${
              isActive("/bulk-upload")
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