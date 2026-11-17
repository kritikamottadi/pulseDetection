import { useState } from 'react';
import { HeartPulse, Menu, X } from 'lucide-react';

interface NavbarProps {
  onNavigate: (sectionId: string) => void;
}

const NAV_LINKS = [
  { id: 'home', label: 'Home' },
  { id: 'analyze', label: 'Analyze' },
  { id: 'how-it-works', label: 'How It Works' },
];

export default function Navbar({ onNavigate }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLinkClick = (sectionId: string) => {
    setMobileMenuOpen(false);
    onNavigate(sectionId);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-[#0B1220]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Brand wordmark (single-line, no secondary badge clutter) */}
        <a
          href="#home"
          onClick={(e) => {
            e.preventDefault();
            handleLinkClick('home');
          }}
          className="flex items-center gap-2.5 text-lg font-semibold tracking-tight text-white whitespace-nowrap shrink-0"
        >
          <HeartPulse className="h-5 w-5 text-[#2DD4BF]" aria-hidden="true" />
          <span>PulseGuard</span>
        </a>

        {/* Zone 2: Clean single-line navigation links */}
        <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <a
              key={link.id}
              href={`#${link.id}`}
              onClick={(e) => {
                e.preventDefault();
                handleLinkClick(link.id);
              }}
              className="text-sm font-medium text-slate-300 transition-colors duration-150 hover:text-white hover:underline underline-offset-4 decoration-[#2DD4BF]/70 whitespace-nowrap shrink-0 py-1"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Zone 3: Primary CTA + Mobile menu button */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => handleLinkClick('analyze')}
            className="hidden sm:inline-flex items-center justify-center rounded-lg bg-[#2DD4BF] px-4 py-2 text-sm font-semibold text-[#0B1220] transition-colors duration-150 hover:bg-[#5EEAD4] whitespace-nowrap shrink-0 cursor-pointer"
          >
            Try It Now
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav-drawer"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-800 text-slate-300 transition-colors hover:bg-slate-800/60 hover:text-white md:hidden cursor-pointer"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Responsive mobile drawer */}
      {mobileMenuOpen && (
        <nav
          id="mobile-nav-drawer"
          aria-label="Mobile navigation"
          className="border-t border-slate-800 bg-[#0B1220] px-4 py-3 md:hidden"
        >
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <a
                key={link.id}
                href={`#${link.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  handleLinkClick(link.id);
                }}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800/60 hover:text-white"
              >
                {link.label}
              </a>
            ))}
            <button
              type="button"
              onClick={() => handleLinkClick('analyze')}
              className="mt-2 inline-flex w-full items-center justify-center rounded-lg bg-[#2DD4BF] px-4 py-2.5 text-sm font-semibold text-[#0B1220] transition-colors hover:bg-[#5EEAD4] sm:hidden cursor-pointer"
            >
              Try It Now
            </button>
          </div>
        </nav>
      )}
    </header>
  );
}
