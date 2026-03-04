import { Routes, Route, NavLink } from "react-router-dom";
import Home from "./pages/Home";
import Scanner from "./pages/Scanner";
import HowItWorks from "./pages/HowItWorks";
import Settings from "./pages/Settings";

const navLinks = [
  { to: "/", label: "首页", end: true },
  { to: "/scanner", label: "费率扫描", end: false },
  { to: "/how-it-works", label: "使用说明", end: false },
  { to: "/settings", label: "设置", end: false },
];

function TwitterIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

export default function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* SVG Noise Texture */}
      <svg
        className="fixed inset-0 w-full h-full z-50 pointer-events-none mix-blend-overlay opacity-[0.03]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <filter id="noiseFilter">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#noiseFilter)" />
      </svg>

      {/* Top Nav */}
      <header className="sticky top-0 z-40 w-full border-b-2 border-foreground/10 bg-background">
        <div className="max-w-[95vw] mx-auto flex items-center justify-between h-14 px-4">
          {/* Left: Brand */}
          <NavLink to="/" className="flex items-center gap-2 shrink-0">
            <span className="text-xl font-bold uppercase tracking-tighter">
              PEPPER
            </span>
            <span className="text-xs text-muted-foreground tracking-wide hidden sm:inline">
              花椒套利工具
            </span>
          </NavLink>

          {/* Center: Nav links */}
          <nav className="flex items-center gap-6">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `text-sm font-medium tracking-wide transition-colors pb-0.5 ${
                    isActive
                      ? "text-accent border-b-2 border-accent"
                      : "text-foreground/50 hover:text-foreground border-b-2 border-transparent"
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          {/* Right: Social links */}
          <div className="flex items-center gap-3 shrink-0">
            <a
              href="https://x.com/off_thetarget"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground/50 hover:text-foreground transition-colors p-1.5"
              title="Twitter @off_thetarget"
            >
              <TwitterIcon />
            </a>
            <a
              href="https://github.com/yansc153/fundingRate_Arb_Tool"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground/50 hover:text-foreground transition-colors p-1.5"
              title="GitHub"
            >
              <GitHubIcon />
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-[95vw] mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/scanner" element={<Scanner />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}
