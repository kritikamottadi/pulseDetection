import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Heart,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  WifiOff,
} from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { PulseAnalysisResult, SignalQuality } from '../services/pulseAnalyzer';

interface ResultsPanelProps {
  result: PulseAnalysisResult;
  onReset: () => void;
}

const SIGNAL_QUALITY_META: Record<
  SignalQuality,
  {
    colorClass: string;
    borderClass: string;
    bgClass: string;
    explanation: string;
    Icon: typeof CheckCircle2;
  }
> = {
  Strong: {
    colorClass: 'text-[#4ADE80]',
    borderClass: 'border-[#4ADE80]/30',
    bgClass: 'bg-[#4ADE80]/10',
    explanation:
      'Clear periodic green-channel oscillations align tightly with a human cardiac frequency band (0.8–2.5 Hz).',
    Icon: CheckCircle2,
  },
  Weak: {
    colorClass: 'text-amber-400',
    borderClass: 'border-amber-400/30',
    bgClass: 'bg-amber-400/10',
    explanation:
      'Pulse harmonics are faint or partially masked by compression artifacts, mild motion, or uneven lighting.',
    Icon: AlertTriangle,
  },
  Unreliable: {
    colorClass: 'text-[#F87171]',
    borderClass: 'border-[#F87171]/30',
    bgClass: 'bg-[#F87171]/10',
    explanation:
      'No coherent physiological periodicity found; frame-to-frame skin variations resemble synthetic generation or heavy noise.',
    Icon: WifiOff,
  },
};

export default function ResultsPanel({ result, onReset }: ResultsPanelProps) {
  const isLive = result.verdict === 'LIVE HUMAN';
  const verdictAccent = isLive ? '#4ADE80' : '#F87171';
  const qualityMeta = SIGNAL_QUALITY_META[result.signalQuality];
  const QualityIcon = qualityMeta.Icon;

  // Map raw waveform array into 10-second time series points for Recharts
  const chartData = result.waveform.map((value, idx) => {
    const seconds = Number(((idx / Math.max(1, result.waveform.length - 1)) * 10).toFixed(1));
    return {
      time: seconds,
      amplitude: value,
    };
  });

  // Circular gauge SVG geometry
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - Math.min(100, Math.max(0, result.confidence)) / 100);

  return (
    <div
      className="animate-fade-in mt-8 space-y-6 rounded-2xl border border-slate-800 bg-[#111A2E] p-6 shadow-2xl shadow-black/40 sm:p-8"
      aria-live="polite"
    >
      {/* Top Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
            rPPG Verification Report
          </p>
          <h3 className="mt-0.5 text-lg font-semibold text-white">Analysis Complete</h3>
        </div>

        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-[#0B1220] px-4 py-2 text-sm font-medium text-slate-200 transition-colors duration-150 hover:border-[#2DD4BF]/60 hover:text-white cursor-pointer whitespace-nowrap"
        >
          <RotateCcw className="h-4 w-4 text-[#2DD4BF]" aria-hidden="true" />
          <span>Analyze another video</span>
        </button>
      </div>

      {/* Primary Metrics Grid: Verdict + Gauge | Heart Rate | Signal Quality */}
      <div className="grid gap-5 lg:grid-cols-12">
        {/* Large Verdict Card with Circular Gauge */}
        <div
          className={`flex flex-col justify-between rounded-xl border p-5 sm:p-6 lg:col-span-5 ${
            isLive
              ? 'border-[#4ADE80]/30 bg-[#4ADE80]/[0.05]'
              : 'border-[#F87171]/30 bg-[#F87171]/[0.05]'
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Classification Verdict
              </span>
              <div className="mt-2 flex items-center gap-2.5">
                {isLive ? (
                  <ShieldCheck className="h-7 w-7 shrink-0 text-[#4ADE80]" aria-hidden="true" />
                ) : (
                  <ShieldAlert className="h-7 w-7 shrink-0 text-[#F87171]" aria-hidden="true" />
                )}
                <span
                  className={`text-2xl font-bold tracking-tight sm:text-3xl ${
                    isLive ? 'text-[#4ADE80]' : 'text-[#F87171]'
                  }`}
                >
                  {result.verdict}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-300">
                {isLive
                  ? 'Consistent subsurface blood-flow signal detected across facial regions.'
                  : 'Absent or erratic cardiac signal inconsistent with living human skin.'}
              </p>
            </div>

            {/* Circular Confidence Gauge */}
            <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
              <svg
                className="h-24 w-24 -rotate-90"
                viewBox="0 0 104 104"
                role="img"
                aria-label={`Confidence score ${result.confidence} percent`}
              >
                <circle
                  cx="52"
                  cy="52"
                  r={radius}
                  fill="none"
                  stroke="#1E293B"
                  strokeWidth="8"
                />
                <circle
                  cx="52"
                  cy="52"
                  r={radius}
                  fill="none"
                  stroke={verdictAccent}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-[stroke-dashoffset] duration-700 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="font-mono text-lg font-bold tabular-nums text-white">
                  {result.confidence}%
                </span>
                <span className="text-[10px] uppercase tracking-wider text-slate-400">
                  Confidence
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Estimated Heart Rate (BPM) Card */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-800 bg-[#0B1220] p-5 sm:p-6 lg:col-span-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Estimated Heart Rate
            </span>
            <Heart
              className={`h-5 w-5 animate-heartbeat ${
                isLive ? 'fill-[#4ADE80]/20 text-[#4ADE80]' : 'fill-[#F87171]/20 text-[#F87171]'
              }`}
              aria-hidden="true"
            />
          </div>

          <div className="my-3 flex items-baseline gap-2">
            <span className="font-mono text-5xl font-bold tracking-tight tabular-nums text-white">
              {result.bpm}
            </span>
            <span className="font-mono text-sm font-medium uppercase text-slate-400">BPM</span>
          </div>

          <p className="text-xs text-slate-400">
            {isLive
              ? 'Within normal resting adult pulse range (55–100 BPM).'
              : 'Estimated spectral peak is unstable due to low cardiac coherence.'}
          </p>
        </div>

        {/* Signal Quality Card */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-800 bg-[#0B1220] p-5 sm:p-6 lg:col-span-4">
          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Signal Quality
            </span>

            <div className="mt-3 flex items-center gap-2.5">
              <span
                className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-semibold ${qualityMeta.bgClass} ${qualityMeta.borderClass} ${qualityMeta.colorClass}`}
              >
                <QualityIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{result.signalQuality}</span>
              </span>
            </div>
          </div>

          <p className="mt-3 text-sm leading-relaxed text-slate-300">{qualityMeta.explanation}</p>
        </div>
      </div>

      {/* Pulse Waveform Line Chart (Recharts) */}
      <div className="rounded-xl border border-slate-800 bg-[#0B1220] p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-[#2DD4BF]" aria-hidden="true" />
            <h4 className="text-sm font-semibold text-white">
              Extracted rPPG Pulse Waveform
            </h4>
          </div>
          <span className="font-mono text-xs text-slate-400 tabular-nums">
            Bandpass 0.7–3.0 Hz · 10.0s Window
          </span>
        </div>

        <div className="h-64 w-full" role="region" aria-label="Pulse waveform line chart over 10 seconds">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 16, left: -12, bottom: 20 }}>
              <CartesianGrid stroke="#1E293B" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="time"
                type="number"
                domain={[0, 10]}
                ticks={[0, 2, 4, 6, 8, 10]}
                tickFormatter={(val: number) => `${val}s`}
                stroke="#64748B"
                tick={{ fill: '#94A3B8', fontSize: 12 }}
                label={{
                  value: 'Time (seconds)',
                  position: 'insideBottom',
                  offset: -12,
                  fill: '#94A3B8',
                  fontSize: 12,
                }}
              />
              <YAxis
                domain={[-1.8, 1.8]}
                stroke="#64748B"
                tick={{ fill: '#94A3B8', fontSize: 12 }}
                tickFormatter={(val: number) => val.toFixed(1)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#111A2E',
                  borderColor: '#334155',
                  borderRadius: '0.5rem',
                  color: '#F1F5F9',
                  fontSize: '12px',
                }}
                labelFormatter={(label) => `Time: ${label}s`}
                formatter={(value: unknown) => [
                  typeof value === 'number' ? value.toFixed(3) : String(value ?? ''),
                  'Pulse Amplitude',
                ]}
              />
              <Line
                type="monotone"
                dataKey="amplitude"
                stroke={isLive ? '#2DD4BF' : '#F87171'}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: isLive ? '#2DD4BF' : '#F87171' }}
                isAnimationActive={true}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Probabilistic Reliability Note */}
      <p className="text-xs leading-relaxed text-slate-400">
        Note: Results are probabilistic and may be less reliable on compressed video, low light, or
        certain skin tones.
      </p>
    </div>
  );
}
