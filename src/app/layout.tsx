import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider, SignInButton, SignUpButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { isAdmin } from "@/lib/auth";
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
  const adminStatus = await isAdmin();

  return (
    <ClerkProvider>
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen`}
        >
          {/* Header */}
          <header className="border-b border-foreground/10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto flex h-16 items-center justify-between px-4">
              <div className="flex items-center gap-8">
                <Link href="/" className="text-xl font-bold">
                  World Cup 2026
                </Link>
                <nav className="hidden md:flex gap-6">
                  <Link
                    href="/matches"
                    className="text-sm font-medium text-foreground/60 hover:text-foreground transition-colors"
                  >
                    Matches
                  </Link>
                  <Link
                    href="/leaderboard"
                    className="text-sm font-medium text-foreground/60 hover:text-foreground transition-colors"
                  >
                    Leaderboard
                  </Link>
                  <SignedIn>
                    <Link
                      href="/my-predictions"
                      className="text-sm font-medium text-foreground/60 hover:text-foreground transition-colors"
                    >
                      My Predictions
                    </Link>
                  </SignedIn>
                  {adminStatus && (
                    <Link
                      href="/admin"
                      className="text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                    >
                      Admin
                    </Link>
                  )}
                </nav>
              </div>

              <div className="flex items-center gap-4">
                <SignedOut>
                  <SignInButton mode="modal">
                    <button className="text-sm font-medium text-foreground/60 hover:text-foreground transition-colors">
                      Sign In
                    </button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <button className="text-sm font-medium bg-foreground text-background px-4 py-2 rounded-md hover:bg-foreground/90 transition-colors">
                      Sign Up
                    </button>
                  </SignUpButton>
                </SignedOut>
                <SignedIn>
                  <UserButton afterSignOutUrl="/" />
                </SignedIn>
              </div>
            </div>
          </header>

          <main className="flex-1">{children}</main>

          {/* Footer */}
          <footer className="border-t border-foreground/10 mt-auto">
            <div className="container mx-auto px-4 py-8">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="text-sm text-foreground/60">
                  © 2026 World Cup Predictions. All rights reserved.
                </div>
                <div className="flex gap-6 text-sm text-foreground/60">
                  <a href="#" className="hover:text-foreground transition-colors">
                    About
                  </a>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Rules
                  </a>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Contact
                  </a>
                </div>
              </div>
            </div>
          </footer>
        </body>
      </html>
    </ClerkProvider>
  );
}
