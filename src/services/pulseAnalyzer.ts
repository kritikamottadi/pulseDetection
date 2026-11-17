/**
 * PulseGuard — rPPG Pulse Analysis Service
 *
 * This module isolates all video validation and pulse-analysis logic in one place
 * so you can replace the simulated mock inside `analyzeVideo(file)` with a real
 * Python backend (Flask, FastAPI, or Streamlit API) without changing the UI.
 */

export type SignalQuality = 'Strong' | 'Weak' | 'Unreliable';
export type Verdict = 'LIVE HUMAN' | 'LIKELY FAKE';

export type AnalysisErrorCode =
  | 'no_face'
  | 'video_too_short'
  | 'video_too_dark'
  | 'unsupported_file';

export interface PulseAnalysisResult {
  bpm: number;
  signalQuality: SignalQuality;
  verdict: Verdict;
  confidence: number;
  waveform: number[];
}

export interface AnalyzeVideoOptions {
  /** Demo toggle: when true, returns a simulated deepfake result */
  simulateFake?: boolean;
  /** Optional demo error trigger so all error states can be previewed easily */
  simulateError?: AnalysisErrorCode | null;
}

export class PulseAnalysisError extends Error {
  code: AnalysisErrorCode;

  constructor(code: AnalysisErrorCode, message: string) {
    super(message);
    this.name = 'PulseAnalysisError';
    this.code = code;
  }
}

/**
 * Friendly, human-readable error copy mapped to each supported failure mode.
 */
export const ERROR_DETAILS: Record<
  AnalysisErrorCode,
  { title: string; message: string; hint: string }
> = {
  no_face: {
    title: 'No face detected',
    message:
      'We could not locate a clear frontal face in the video frames to sample skin reflectance.',
    hint: 'Keep your face centered, unobstructed, and facing the camera for at least 5 seconds.',
  },
  video_too_short: {
    title: 'Video is too short',
    message:
      'Reliable rPPG heart-rate estimation requires at least 5 seconds of continuous facial video.',
    hint: 'Upload a 5–15 second clip or use the 10-second webcam recorder.',
  },
  video_too_dark: {
    title: 'Video is too dark',
    message:
      'Ambient lighting is too low to measure subtle hemoglobin color fluctuations in the skin.',
    hint: 'Move to a well-lit area with even front lighting and try recording again.',
  },
  unsupported_file: {
    title: 'Unsupported file type',
    message:
      'PulseGuard currently accepts standard MP4 (.mp4) and QuickTime (.mov) video files.',
    hint: 'Convert your clip to MP4 or MOV, or record directly using your webcam.',
  },
};

/**
 * Generates a realistic 10-second rPPG pulse waveform (100 samples at 10 Hz).
 * - For a live human: clear periodic systolic/diastolic cardiac curve at `bpm` + mild noise.
 * - For a deepfake: weak, fragmented oscillation dominated by compression noise / drift.
 */
function generatePulseWaveform(bpm: number, isFake: boolean): number[] {
  const sampleCount = 100; // 10 seconds at 10 samples/sec
  const durationSeconds = 10;
  const freqHz = bpm / 60;
  const phaseShift = Math.random() * Math.PI * 2;
  const waveform: number[] = [];

  for (let i = 0; i < sampleCount; i++) {
    const t = (i / (sampleCount - 1)) * durationSeconds;

    if (!isFake) {
      // Primary systolic wave + dicrotic notch harmonic + subtle natural respiratory modulation
      const fundamental = Math.sin(2 * Math.PI * freqHz * t + phaseShift);
      const dicroticHarmonic = 0.32 * Math.sin(4 * Math.PI * freqHz * t + phaseShift - 0.8);
      const respiratoryEnvelope = 1 + 0.12 * Math.sin(2 * Math.PI * 0.25 * t);
      const sensorNoise = (Math.random() - 0.5) * 0.24;

      const value = (fundamental + dicroticHarmonic) * respiratoryEnvelope + sensorNoise;
      waveform.push(Number(value.toFixed(3)));
    } else {
      // Deepfake artifact: weak, inconsistent frequency + heavy frame-interpolation jitter
      const weakResidual = 0.22 * Math.sin(2 * Math.PI * (freqHz * 0.65) * t + phaseShift);
      const compressionJitter = (Math.random() - 0.5) * 1.15;
      const baselineDrift = 0.25 * Math.sin(2 * Math.PI * 0.12 * t);

      const value = weakResidual + compressionJitter + baselineDrift;
      waveform.push(Number(value.toFixed(3)));
    }
  }

  return waveform;
}

/**
 * ============================================================================
 * MAIN ANALYSIS ENTRY POINT — analyzeVideo(file)
 * ============================================================================
 * Replace the body of this function with a `fetch()` call to your Python
 * backend (e.g., Flask/FastAPI running OpenCV + rPPG signal processing) when
 * you are ready to move from simulated results to live inference.
 *
 * Expected return contract:
 *   {
 *     bpm: number,               // Estimated heart rate in beats per minute (55–100)
 *     signalQuality: string,     // 'Strong' | 'Weak' | 'Unreliable'
 *     verdict: string,           // 'LIVE HUMAN' | 'LIKELY FAKE'
 *     confidence: number,        // Model confidence percentage (0–100)
 *     waveform: number[]         // Normalized pulse signal values over time
 *   }
 */
export async function analyzeVideo(
  file: File,
  options: AnalyzeVideoOptions = {}
): Promise<PulseAnalysisResult> {
  // --------------------------------------------------------------------------
  // HOW TO CONNECT YOUR PYTHON BACKEND LATER (Flask / FastAPI / Streamlit):
  //
  // const formData = new FormData();
  // formData.append('video', file);
  //
  // const response = await fetch('http://localhost:5000/api/analyze', {
  //   method: 'POST',
  //   body: formData,
  // });
  //
  // if (!response.ok) {
  //   const err = await response.json();
  //   throw new PulseAnalysisError(err.code || 'no_face', err.message);
  // }
  //
  // return (await response.json()) as PulseAnalysisResult;
  // --------------------------------------------------------------------------

  // Simulated 3-second processing delay matching the 4-step pipeline UI
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Allow easy previewing of any error state from the demo controls or filename hints
  if (options.simulateError) {
    const detail = ERROR_DETAILS[options.simulateError];
    throw new PulseAnalysisError(options.simulateError, detail.message);
  }

  const lowerName = file.name.toLowerCase();
  if (lowerName.includes('noface') || lowerName.includes('no-face')) {
    throw new PulseAnalysisError('no_face', ERROR_DETAILS.no_face.message);
  }

  const isFake = Boolean(options.simulateFake);

  if (isFake) {
    const bpm = Math.floor(55 + Math.random() * 45); // Randomized 55–99 BPM noise peak
    const confidence = Math.floor(82 + Math.random() * 14); // 82%–95% fake likelihood
    const signalQuality: SignalQuality = Math.random() > 0.45 ? 'Unreliable' : 'Weak';
    const waveform = generatePulseWaveform(bpm, true);

    return {
      bpm,
      signalQuality,
      verdict: 'LIKELY FAKE',
      confidence,
      waveform,
    };
  }

  // Live human simulation: realistic resting heart rate 58–94 BPM
  const bpm = Math.floor(58 + Math.random() * 37);
  const confidence = Math.floor(87 + Math.random() * 11); // 87%–97% confidence
  const signalQuality: SignalQuality = confidence >= 90 ? 'Strong' : 'Weak';
  const waveform = generatePulseWaveform(bpm, false);

  return {
    bpm,
    signalQuality,
    verdict: 'LIVE HUMAN',
    confidence,
    waveform,
  };
}

/**
 * Validates that an uploaded file is an MP4 or MOV video.
 */
export function validateUploadedVideoFile(file: File): void {
  const validMimeTypes = ['video/mp4', 'video/quicktime'];
  const lowerName = file.name.toLowerCase();
  const hasValidExtension = lowerName.endsWith('.mp4') || lowerName.endsWith('.mov');

  if (!validMimeTypes.includes(file.type) && !hasValidExtension) {
    throw new PulseAnalysisError('unsupported_file', ERROR_DETAILS.unsupported_file.message);
  }
}

/**
 * Checks video duration (>= 5 seconds) and samples a frame's average luminance
 * using an offscreen canvas so extremely dark videos are caught early.
 */
export async function inspectVideoReadiness(videoUrl: string): Promise<{
  duration: number;
  meanLuminance: number;
}> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.src = videoUrl;

    const cleanup = () => {
      video.removeAttribute('src');
      video.load();
    };

    video.onloadedmetadata = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : 0;

      // MediaRecorder WebM blobs sometimes report Infinity duration on initial metadata;
      // if finite and < 5s, flag as too short immediately.
      if (Number.isFinite(video.duration) && duration < 5) {
        cleanup();
        reject(new PulseAnalysisError('video_too_short', ERROR_DETAILS.video_too_short.message));
        return;
      }

      // Seek to ~1s (or 0.5s) to inspect brightness of a representative frame
      const seekTarget = Number.isFinite(video.duration)
        ? Math.min(1.0, Math.max(0.2, duration * 0.2))
        : 0.5;
      video.currentTime = seekTarget;
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 96;
        canvas.height = 54;
        const ctx = canvas.getContext('2d');

        let meanLuminance = 120; // Safe neutral fallback
        if (ctx && video.videoWidth > 0 && video.videoHeight > 0) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
          let totalLum = 0;
          const pixelCount = data.length / 4;

          for (let i = 0; i < data.length; i += 4) {
            totalLum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          }
          meanLuminance = totalLum / pixelCount;
        }

        const finalDuration = Number.isFinite(video.duration) ? video.duration : 10;
        cleanup();

        if (meanLuminance < 16) {
          reject(new PulseAnalysisError('video_too_dark', ERROR_DETAILS.video_too_dark.message));
          return;
        }

        resolve({ duration: finalDuration, meanLuminance });
      } catch {
        const finalDuration = Number.isFinite(video.duration) ? video.duration : 10;
        cleanup();
        resolve({ duration: finalDuration, meanLuminance: 120 });
      }
    };

    video.onerror = () => {
      cleanup();
      reject(new PulseAnalysisError('unsupported_file', ERROR_DETAILS.unsupported_file.message));
    };
  });
}

/**
 * Generates a short 6-second synthetic facial-ROI sample video clip in the browser
 * so users can test the Upload + Analyze pipeline immediately without a local MP4.
 */
export async function createSampleDemoVideo(): Promise<File> {
  const canvas = document.createElement('canvas');
  canvas.width = 480;
  canvas.height = 270;
  const ctx = canvas.getContext('2d');

  if (!ctx || typeof MediaRecorder === 'undefined' || !canvas.captureStream) {
    throw new PulseAnalysisError(
      'unsupported_file',
      'Browser video synthesis is unavailable here. Please upload an MP4/MOV or use your webcam.'
    );
  }

  const stream = canvas.captureStream(24);
  const mimeType = MediaRecorder.isTypeSupported('video/mp4')
    ? 'video/mp4'
    : MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';

  const recorder = new MediaRecorder(stream, { mimeType });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const recordingPromise = new Promise<File>((resolve) => {
    recorder.onstop = () => {
      const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
      const blob = new Blob(chunks, { type: mimeType });
      resolve(new File([blob], `sample_subject_clip.${ext}`, { type: mimeType }));
    };
  });

  recorder.start();

  const totalFrames = 132; // ~5.5 seconds at 24 fps
  let frame = 0;

  await new Promise<void>((resolve) => {
    const interval = window.setInterval(() => {
      const t = frame / 24;
      // Subtle simulated heartbeat skin-reflectance shift (~72 BPM = 1.2 Hz)
      const pulse = Math.sin(2 * Math.PI * 1.2 * t) * 4;

      // Clinical backdrop
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Soft studio radial lighting
      const grad = ctx.createRadialGradient(240, 125, 20, 240, 125, 160);
      grad.addColorStop(0, 'rgba(45, 212, 191, 0.12)');
      grad.addColorStop(1, 'rgba(15, 23, 42, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Shoulders silhouette
      ctx.fillStyle = '#1E293B';
      ctx.beginPath();
      ctx.ellipse(240, 255, 92, 52, 0, Math.PI, 2 * Math.PI);
      ctx.fill();

      // Head / skin region with subtle green-channel pulse modulation
      const greenVal = Math.round(176 + pulse);
      ctx.fillStyle = `rgb(218, ${greenVal}, 154)`;
      ctx.beginPath();
      ctx.ellipse(240, 126, 48, 62, 0, 0, Math.PI * 2);
      ctx.fill();

      // Forehead & cheek ROI tracking boxes
      ctx.strokeStyle = 'rgba(45, 212, 191, 0.85)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(216, 86, 48, 22);
      ctx.strokeRect(204, 124, 24, 20);
      ctx.strokeRect(252, 124, 24, 20);

      // Subtle caption
      ctx.fillStyle = 'rgba(148, 163, 184, 0.9)';
      ctx.font = '12px monospace';
      ctx.fillText(`SAMPLE CLIP · ${t.toFixed(1)}s`, 16, 24);

      frame += 1;
      if (frame >= totalFrames) {
        window.clearInterval(interval);
        recorder.stop();
        stream.getTracks().forEach((track) => track.stop());
        resolve();
      }
    }, 1000 / 24);
  });

  return recordingPromise;
}
