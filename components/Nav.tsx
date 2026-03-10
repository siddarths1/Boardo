"use client";

import Link from "next/link";
import { useState } from "react";

export function Nav() {
  const [open, setOpen] = useState(false);

  const links = (
    <>
      <Link
        href="/dashboard"
        className="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900"
      >
        Dashboard
      </Link>
      <Link
        href="/projects/settings"
        className="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900"
      >
        Manage projects
      </Link>
    </>
  );

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 justify-between">
          <div className="flex">
            <Link href="/dashboard" className="flex flex-shrink-0 items-center text-lg font-semibold text-gray-900">
              Todo + Kanban
            </Link>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-1">{links}</div>
          </div>
          <div className="flex items-center sm:hidden">
            <button
              type="button"
              onClick={() => setOpen(!open)}
              className="rounded-md p-2 text-gray-700 hover:bg-gray-100"
              aria-expanded={open}
            >
              <span className="sr-only">Menu</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {open ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>
      {open && (
        <div className="border-t border-gray-200 sm:hidden">
          <div className="space-y-1 px-4 py-3">{links}</div>
        </div>
      )}
    </nav>
  );
}
