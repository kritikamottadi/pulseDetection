import { Activity, HeartPulse, ScanFace, ShieldCheck } from 'lucide-react';

const STEPS = [
  {
    number: '01.',
    title: 'Face detection',
    description:
      'Locates the facial boundary and isolates skin regions of interest on the forehead and cheeks where capillaries sit close to the surface.',
    Icon: ScanFace,
  },
  {
    number: '02.',
    title: 'Pulse extraction from skin color changes',
    description:
      'Tracks frame-by-frame green-channel reflectance across the skin, then filters out head motion and ambient flicker.',
    Icon: Activity,
  },
  {
    number: '03.',
    title: 'Heart rate estimation',
    description:
      'Applies spectral analysis to find the strongest periodic frequency between 45 and 180 BPM and reconstructs the pulse wave.',
    Icon: HeartPulse,
  },
  {
    number: '04.',
    title: 'Real vs. fake classification',
    description:
      'Evaluates whether the extracted waveform exhibits consistent physiological rhythm or synthetic frame-blending artifacts.',
    Icon: ShieldCheck,
  },
];

export default function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-it-works-heading"
      className="border-t border-slate-800/70 py-16 sm:py-20"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-wider text-[#2DD4BF]">
            Methodology
          </p>
          <h2
            id="how-it-works-heading"
            className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl text-balance"
          >
            How PulseGuard Works
          </h2>
          <p className="mt-3 text-base leading-relaxed text-slate-400">
            Remote photoplethysmography (rPPG) turns an ordinary camera into a contactless pulse
            sensor in four processing stages.
          </p>
        </div>

        {/* 4 Step Cards */}
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step) => {
            const StepIcon = step.Icon;
            return (
              <article
                key={step.number}
                className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-[#111A2E] p-6 shadow-lg shadow-black/20"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-semibold text-[#2DD4BF]">
                      {step.number}
                    </span>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-[#0B1220] text-[#2DD4BF]">
                      <StepIcon className="h-5 w-5" aria-hidden="true" />
                    </div>
                  </div>

                  <h3 className="mt-5 text-base font-semibold leading-snug text-white">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">
                    {step.description}
                  </p>
                </div>
              </article>
            );
          })}
        </div>

        {/* Plain-language Biology Explanation */}
        <div className="mt-8 rounded-2xl border border-slate-800 bg-[#111A2E]/70 p-6 sm:p-8">
          <h3 className="text-base font-semibold text-white">The Biology Behind the Signal</h3>
          <p className="mt-2 max-w-4xl text-sm leading-relaxed text-slate-300 sm:text-base">
            With every heartbeat, your heart pumps a fresh surge of blood through tiny vessels just
            beneath the surface of your skin. Because hemoglobin in blood absorbs green light
            slightly more strongly during each pulse, your skin undergoes microscopic color shifts
            that are invisible to the naked eye—yet measurable across video frames. Deepfake
            generators focus on matching facial appearance frame by frame and usually fail to
            preserve this subtle, synchronized physiological rhythm.
          </p>
        </div>
      </div>
    </section>
  );
}
