import { ArrowDown } from 'lucide-react';

interface HeroSectionProps {
  onTryNow: () => void;
}

export default function HeroSection({ onTryNow }: HeroSectionProps) {
  return (
    <section
      id="home"
      aria-labelledby="hero-title"
      className="border-b border-slate-800/70 py-16 sm:py-20 lg:py-24"
    >
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-12 lg:gap-10 lg:px-8">
        {/* Left column: Hero headline, tagline, subtext, primary CTA */}
        <div className="lg:col-span-7">
          <p className="text-xs font-medium tracking-wider uppercase text-[#2DD4BF]">
            Remote Photoplethysmography · Deepfake Verification
          </p>

          <h1
            id="hero-title"
            className="mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl text-balance"
          >
            PulseGuard
          </h1>

          <p className="mt-4 text-xl font-medium text-slate-200 sm:text-2xl text-balance">
            Detect deepfakes by checking for a real heartbeat.
          </p>

          <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-400">
            Every heartbeat causes tiny color changes in human skin that cameras can pick up but
            eyes can&apos;t. Deepfakes don&apos;t reproduce them well.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={onTryNow}
              className="inline-flex items-center gap-2 rounded-lg bg-[#2DD4BF] px-6 py-3 text-sm font-semibold text-[#0B1220] shadow-lg shadow-[#2DD4BF]/10 transition-colors duration-150 hover:bg-[#5EEAD4] cursor-pointer whitespace-nowrap"
            >
              <span>Try it now</span>
              <ArrowDown className="h-4 w-4" aria-hidden="true" />
            </button>

            <span className="text-xs text-slate-400">
              MP4 / MOV upload or live 10s webcam capture
            </span>
          </div>
        </div>

        {/* Right column: Clean clinical rPPG ROI & pulse signal illustration */}
        <div className="lg:col-span-5">
          <div className="rounded-2xl border border-slate-800 bg-[#111A2E] p-6 shadow-xl shadow-black/30">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 text-xs text-slate-400">
              <span className="font-medium text-slate-200">Optical Skin Reflectance</span>
              <span className="font-mono tabular-nums text-[#2DD4BF]">530 nm Green Band</span>
            </div>

            {/* Facial ROI Schematic SVG */}
            <div className="mt-5 grid grid-cols-12 items-center gap-4">
              <div className="col-span-5 flex justify-center">
                <svg
                  viewBox="0 0 120 140"
                  className="h-36 w-32"
                  role="img"
                  aria-label="Illustration of facial regions of interest on forehead and cheeks used for pulse extraction"
                >
                  {/* Head contour */}
                  <ellipse
                    cx="60"
                    cy="68"
                    rx="36"
                    ry="46"
                    fill="#18233C"
                    stroke="#334155"
                    strokeWidth="1.5"
                  />
                  {/* Subtle facial guide lines */}
                  <path
                    d="M42 64 Q48 60 54 64 M66 64 Q72 60 78 64 M53 90 Q60 95 67 90"
                    fill="none"
                    stroke="#475569"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                  {/* Forehead ROI */}
                  <rect
                    x="41"
                    y="35"
                    width="38"
                    height="16"
                    rx="3"
                    fill="rgba(45, 212, 191, 0.14)"
                    stroke="#2DD4BF"
                    strokeWidth="1.25"
                    strokeDasharray="3 2"
                  />
                  {/* Left & Right Cheek ROIs */}
                  <rect
                    x="32"
                    y="70"
                    width="18"
                    height="15"
                    rx="3"
                    fill="rgba(45, 212, 191, 0.14)"
                    stroke="#2DD4BF"
                    strokeWidth="1.25"
                  />
                  <rect
                    x="70"
                    y="70"
                    width="18"
                    height="15"
                    rx="3"
                    fill="rgba(45, 212, 191, 0.14)"
                    stroke="#2DD4BF"
                    strokeWidth="1.25"
                  />
                </svg>
              </div>

              {/* Clean schematic cardiac wave */}
              <div className="col-span-7 space-y-3">
                <div>
                  <p className="text-xs text-slate-400">Sampled ROI Regions</p>
                  <p className="mt-0.5 text-sm font-medium text-slate-200">
                    Forehead &amp; Malar Cheeks
                  </p>
                </div>

                <div className="rounded-lg border border-slate-800 bg-[#0B1220] p-3">
                  <svg
                    viewBox="0 0 200 54"
                    className="h-12 w-full overflow-visible"
                    aria-hidden="true"
                  >
                    <line x1="0" y1="27" x2="200" y2="27" stroke="#1E293B" strokeWidth="1" />
                    <path
                      d="M0 30 L22 30 L30 22 L38 40 L46 8 L54 34 L62 27 L82 27 L90 21 L98 39 L106 9 L114 34 L122 27 L142 27 L150 22 L158 40 L166 8 L174 34 L182 27 L200 27"
                      fill="none"
                      stroke="#2DD4BF"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 font-mono tabular-nums">
                  <span>Real Skin: Periodic</span>
                  <span className="text-[#F87171]">Deepfake: Incoherent</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
