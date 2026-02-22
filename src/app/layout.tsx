import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider, SignInButton, SignUpButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { isAdmin } from "@/lib/auth";
import { auth } from "@clerk/nextjs/server";
import { MobileNav } from "@/components/mobile-nav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "World Cup 2026 Predictions",
  description: "Make predictions for FIFA World Cup 2026 matches and compete with friends",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { userId } = await auth();
  const adminStatus = await isAdmin();

  return (
    <ClerkProvider>
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen bg-[#FFF5EE]`}
        >
          {/* Header */}
          <header className="bg-black text-white border-b border-white/10">
            <div className="container mx-auto flex h-16 items-center justify-center px-4 relative">
              {/* Logo - absolute left */}
              <Link href="/" className="absolute left-4 text-xl font-bold text-white">
                World Cup 2026
              </Link>

              {/* Centered navigation */}
              <nav className="hidden md:flex gap-6">
                <Link
                  href="/matches"
                  className="text-sm font-medium text-white/80 hover:text-white transition-colors"
                >
                  Matches
                </Link>
                <Link
                  href="/groups"
                  className="text-sm font-medium text-white/80 hover:text-white transition-colors"
                >
                  Groups
                </Link>
                <Link
                  href="/leaderboard"
                  className="text-sm font-medium text-white/80 hover:text-white transition-colors"
                >
                  Leaderboard
                </Link>
                <SignedIn>
                  <Link
                    href="/my-predictions"
                    className="text-sm font-medium text-white/80 hover:text-white transition-colors"
                  >
                    My Predictions
                  </Link>
                  <Link
                    href="/predictions-matrix"
                    className="text-sm font-medium text-white/80 hover:text-white transition-colors"
                  >
                    Predictions Table
                  </Link>
                </SignedIn>
                {adminStatus && (
                  <Link
                    href="/admin"
                    className="text-sm font-medium text-red-300 hover:text-red-200 transition-colors"
                  >
                    Admin
                  </Link>
                )}
              </nav>

              {/* Auth buttons and mobile menu - absolute right */}
              <div className="absolute right-4 flex items-center gap-4">
                {/* Mobile Navigation */}
                <MobileNav isSignedIn={!!userId} isAdmin={adminStatus} />

                {/* Desktop Auth Buttons */}
                <div className="hidden md:flex items-center gap-4">
                  <SignedOut>
                    <SignInButton mode="modal">
                      <button className="text-sm font-medium text-white/80 hover:text-white transition-colors">
                        Sign In
                      </button>
                    </SignInButton>
                    <SignUpButton mode="modal">
                      <button className="text-sm font-medium bg-white text-black px-4 py-2 rounded-md hover:bg-white/90 transition-colors">
                        Sign Up
                      </button>
                    </SignUpButton>
                  </SignedOut>
                  <SignedIn>
                    <UserButton afterSignOutUrl="/" />
                  </SignedIn>
                </div>

                {/* Mobile Auth - Show user button on mobile */}
                <div className="md:hidden">
                  <SignedIn>
                    <UserButton afterSignOutUrl="/" />
                  </SignedIn>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 pb-32 sm:pb-28 md:pb-24">{children}</main>

          {/* Footer */}
          <footer className="fixed bottom-0 left-0 right-0 bg-black text-white border-t border-white/10 z-40">
            <div className="container mx-auto px-4 py-3 sm:py-4 md:py-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-2 sm:gap-3 md:gap-4 text-xs sm:text-sm text-white/80">
                <p className="text-center md:text-left">&copy; 2026 World Cup Predictions. All rights reserved.</p>
                <div className="flex gap-4 sm:gap-6">
                  <Link
                    href="/about"
                    className="hover:text-white transition-colors"
                  >
                    About
                  </Link>
                  <Link
                    href="/rules"
                    className="hover:text-white transition-colors"
                  >
                    Rules
                  </Link>
                  <Link
                    href="/contact"
                    className="hover:text-white transition-colors"
                  >
                    Contact
                  </Link>
                </div>
              </div>
            </div>
          </footer>
        </body>
      </html>
    </ClerkProvider>
  );
}
