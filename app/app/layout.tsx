// app/layout.tsx
import './globals.css'
import { ReactNode, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Home, Boxes, Archive, Settings } from 'lucide-react'
import { usePathname } from 'next/navigation'

function NavLink({ href, icon: Icon, label }: { href: string; icon: any; label: string }) {
  const pathname = usePathname()
  const isActive = pathname === href

  const baseClasses =
    "flex items-center gap-2 transition-colors hover:text-blue-600 dark:hover:text-blue-400"
  const activeClasses = "text-blue-600 dark:text-blue-400 font-semibold"

  return (
    <Link
      href={href}
      className={`${baseClasses} ${isActive ? activeClasses : "text-gray-700 dark:text-gray-300"}`}
    >
      <Icon size={16} />
      {label}
    </Link>
  )
}

export default function RootLayout({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <html lang="en" className="h-full bg-gray-50 dark:bg-gray-900">
      <body className="min-h-screen text-gray-900 dark:text-gray-100">
        <header className="sticky top-0 z-50 border-b border-gray-200 dark:border-gray-700 bg-gray-50/95 dark:bg-gray-900/95 backdrop-blur">
          {/* Top section: logo + title + tagline */}
          <div className="flex flex-col items-center py-4">
            <Image
              src="/garagegrid-logo.png"
              alt="GarageGrid Logo"
              width={120}
              height={120}
              priority
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg shadow-md"
            />
            <h1 className="mt-2 text-lg font-bold sm:mt-3 sm:text-3xl">
              GarageGrid Pro
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-lg text-center leading-snug px-4">
              Smart Storage.<br />
              Effortless Retrieval.
            </p>
          </div>

          {/* Navigation */}
          <div className="border-t border-gray-200 dark:border-gray-700">
            {/* Desktop nav */}
            <nav className="hidden sm:flex justify-center gap-8 py-2 bg-gray-100/80 dark:bg-gray-800/80">
              <NavLink href="/" icon={Home} label="Dashboard" />
              <NavLink href="/items" icon={Boxes} label="Items" />
              <NavLink href="/racks" icon={Archive} label="Racks" />
              <NavLink href="/settings" icon={Settings} label="Settings" />
            </nav>

            {/* Mobile nav toggle */}
            <div className="sm:hidden flex justify-between items-center px-4 py-2 bg-gray-100/80 dark:bg-gray-800/80">
              <span className="text-sm font-medium">Menu</span>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                {/* Hamburger / X icon */}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none"
                  viewBox="0 0 24 24" stroke="currentColor">
                  {menuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>

            {/* Mobile menu with animation */}
            <nav
              className={`sm:hidden flex flex-col items-center gap-4 bg-gray-100 dark:bg-gray-800 transition-all duration-300 ease-in-out overflow-hidden ${
                menuOpen ? "max-h-60 py-4 opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              <NavLink href="/" icon={Home} label="Dashboard" />
              <NavLink href="/items" icon={Boxes} label="Items" />
              <NavLink href="/racks" icon={Archive} label="Racks" />
              <NavLink href="/settings" icon={Settings} label="Settings" />
            </nav>
          </div>
        </header>

        {/* Main content */}
        <main className="p-4 sm:p-6">{children}</main>
      </body>
    </html>
  )
}