'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface MobileNavProps {
  isSignedIn: boolean;
  isAdmin: boolean;
}

export function MobileNav({ isSignedIn, isAdmin }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  const navLinks = [
    { href: '/matches', label: 'Matches', public: true },
    { href: '/groups', label: 'Groups', public: true },
    { href: '/leaderboard', label: 'Leaderboard', public: true },
    { href: '/my-predictions', label: 'My Predictions', public: false },
  ];

  return (
    <>
      {/* Hamburger Button */}
      <button
        onClick={toggleMenu}
        className="md:hidden flex flex-col gap-1.5 p-2 hover:bg-white/10 rounded-md transition-colors"
        aria-label="Toggle menu"
      >
        <span
          className={`block w-6 h-0.5 bg-white transition-transform ${
            isOpen ? 'rotate-45 translate-y-2' : ''
          }`}
        />
        <span
          className={`block w-6 h-0.5 bg-white transition-opacity ${
            isOpen ? 'opacity-0' : ''
          }`}
        />
        <span
          className={`block w-6 h-0.5 bg-white transition-transform ${
            isOpen ? '-rotate-45 -translate-y-2' : ''
          }`}
        />
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={closeMenu}
        />
      )}

      {/* Mobile Menu */}
      <div
        className={`fixed top-0 right-0 h-full w-64 bg-black text-white z-50 transform transition-transform duration-300 ease-in-out md:hidden ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Close button */}
          <div className="flex justify-end p-4 border-b border-white/10">
            <button
              onClick={closeMenu}
              className="p-2 hover:bg-white/10 rounded-md transition-colors"
              aria-label="Close menu"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto py-4">
            <ul className="space-y-1 px-4">
              {navLinks.map((link) => {
                // Skip authenticated-only links if not signed in
                if (!link.public && !isSignedIn) return null;

                const isActive = pathname === link.href;

                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={closeMenu}
                      className={`block px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-white/10 text-white'
                          : 'text-white/80 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      {link.label}
                    </Link>
                  </li>
                );
              })}

              {/* Admin Link */}
              {isAdmin && (
                <li>
                  <Link
                    href="/admin"
                    onClick={closeMenu}
                    className={`block px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                      pathname.startsWith('/admin')
                        ? 'bg-red-500/20 text-red-300'
                        : 'text-red-300 hover:bg-red-500/10 hover:text-red-200'
                    }`}
                  >
                    Admin
                  </Link>
                </li>
              )}
            </ul>
          </nav>

          {/* Footer Info */}
          <div className="p-4 border-t border-white/10">
            <p className="text-xs text-white/60 text-center">
              World Cup 2026 Predictions
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
