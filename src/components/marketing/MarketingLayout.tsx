import Link from "next/link";
import type { ReactNode } from "react";

const NAV_LINKS = [
  { label: "Product", href: "/product" },
  { label: "Modes", href: "/modes" },
  { label: "Pricing", href: "/pricing" },
  { label: "Agents", href: "/agents" },
];

export function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mkt min-h-screen flex flex-col">
      <MarketingHeader />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  );
}

export function MarketingHeader() {
  return (
    <header className="border-b border-stone-200 bg-stone-50/90 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link
          href="/"
          className="font-display text-lg font-semibold tracking-tight text-stone-900 hover:text-accent transition-colors"
          style={{ fontFamily: "var(--font-newsreader)" }}
        >
          Margot
        </Link>

        <nav className="hidden md:flex items-center gap-7">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-stone-600 hover:text-stone-900 transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-sm text-stone-600 hover:text-stone-900 transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/login"
            className="mkt-accent-bg text-sm px-4 py-2 rounded transition-colors font-medium"
          >
            Start with Margot
          </Link>
        </div>
      </div>
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-stone-200 bg-stone-100">
      <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-sm text-stone-600">
        <div>
          <span
            className="font-display font-semibold text-stone-900 text-base"
            style={{ fontFamily: "var(--font-newsreader)" }}
          >
            Margot
          </span>
          <p className="mt-2 text-xs leading-relaxed">
            Fractional CFO for creative and dev agencies.
          </p>
        </div>
        <div>
          <p className="font-medium text-stone-800 mb-3">Product</p>
          <ul className="space-y-2">
            <li>
              <Link
                href="/product"
                className="hover:text-stone-900 transition-colors"
              >
                Product
              </Link>
            </li>
            <li>
              <Link
                href="/modes"
                className="hover:text-stone-900 transition-colors"
              >
                Modes
              </Link>
            </li>
            <li>
              <Link
                href="/pricing"
                className="hover:text-stone-900 transition-colors"
              >
                Pricing
              </Link>
            </li>
            <li>
              <Link
                href="/customers"
                className="hover:text-stone-900 transition-colors"
              >
                Customers
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="font-medium text-stone-800 mb-3">Developers</p>
          <ul className="space-y-2">
            <li>
              <Link
                href="/agents"
                className="hover:text-stone-900 transition-colors"
              >
                Agent API
              </Link>
            </li>
            <li>
              <Link
                href="/docs"
                className="hover:text-stone-900 transition-colors"
              >
                Docs
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="font-medium text-stone-800 mb-3">Company</p>
          <ul className="space-y-2">
            <li>
              <Link
                href="/about"
                className="hover:text-stone-900 transition-colors"
              >
                About
              </Link>
            </li>
            <li>
              <Link
                href="/blog"
                className="hover:text-stone-900 transition-colors"
              >
                Blog
              </Link>
            </li>
            <li>
              <Link
                href="/security"
                className="hover:text-stone-900 transition-colors"
              >
                Security
              </Link>
            </li>
            <li>
              <Link
                href="/status"
                className="hover:text-stone-900 transition-colors"
              >
                Status
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-stone-200 max-w-6xl mx-auto px-6 py-4 flex items-center justify-between text-xs text-stone-400">
        <span>© {new Date().getFullYear()} Margot. All rights reserved.</span>
        <span>Built for agencies that deserve better answers.</span>
      </div>
    </footer>
  );
}
