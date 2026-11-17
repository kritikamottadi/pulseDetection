import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
} from 'react';
import {
  AlertCircle,
  Camera,
  Check,
  Film,
  Loader2,
  PlayCircle,
  Square,
  Trash2,
  Upload,
  Video,
} from 'lucide-react';
import {
  analyzeVideo,
  createSampleDemoVideo,
  ERROR_DETAILS,
  inspectVideoReadiness,
  PulseAnalysisError,
  validateUploadedVideoFile,
  type AnalysisErrorCode,
  type PulseAnalysisResult,
} from '../services/pulseAnalyzer';
import ResultsPanel from './ResultsPanel';

type InputTab = 'upload' | 'webcam';

const ANALYSIS_STEPS = [
  'Detecting face',
  'Extracting pulse signal',
  'Estimating heart rate',
  'Classifying',
] as const;

const RECORD_DURATION_SECONDS = 10;

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AnalyzeSection() {
  const [activeTab, setActiveTab] = useState<InputTab>('upload');
  const [simulateFake, setSimulateFake] = useState(false);

  // Selected / recorded video state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isPreparingSample, setIsPreparingSample] = useState(false);

  // Webcam state
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSecondsLeft, setRecordingSecondsLeft] = useState(RECORD_DURATION_SECONDS);

  // Analysis & result state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);
  const [errorCode, setErrorCode] = useState<AnalysisErrorCode | null>(null);
  const [errorCustomMessage, setErrorCustomMessage] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<PulseAnalysisResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const liveVideoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const recordingElapsedRef = useRef<number>(0);
  const analysisStepTimerRef = useRef<number | null>(null);

  // Clean up object URLs on change/unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const stopWebcamStream = useCallback(() => {
    if (recordingTimerRef.current !== null) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (liveVideoRef.current) {
      liveVideoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setIsRecording(false);
  }, []);

  // Stop webcam and any active timers when unmounting
  useEffect(() => {
    return () => {
      stopWebcamStream();
      if (analysisStepTimerRef.current !== null) {
        window.clearInterval(analysisStepTimerRef.current);
      }
    };
  }, [stopWebcamStream]);

  // Attach active MediaStream to the video preview element
  useEffect(() => {
    if (cameraActive && liveVideoRef.current && mediaStreamRef.current) {
      liveVideoRef.current.srcObject = mediaStreamRef.current;
    }
  }, [cameraActive]);

  const clearCurrentVideo = useCallback(() => {
    setSelectedFile(null);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setVideoDuration(null);
    setAnalysisResult(null);
    setErrorCode(null);
    setErrorCustomMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const loadAndValidateVideo = useCallback(
    async (file: File, options?: { skipExtensionCheck?: boolean; overrideDuration?: number }) => {
      setErrorCode(null);
      setErrorCustomMessage(null);
      setAnalysisResult(null);

      try {
        if (!options?.skipExtensionCheck) {
          validateUploadedVideoFile(file);
        }

        const objectUrl = URL.createObjectURL(file);

        try {
          if (
            typeof options?.overrideDuration === 'number' &&
            options.overrideDuration < 5
          ) {
            URL.revokeObjectURL(objectUrl);
            throw new PulseAnalysisError('video_too_short', ERROR_DETAILS.video_too_short.message);
          }

          const { duration } = await inspectVideoReadiness(objectUrl);

          setPreviewUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return objectUrl;
          });
          setSelectedFile(file);
          setVideoDuration(
            typeof options?.overrideDuration === 'number' ? options.overrideDuration : duration
          );
        } catch (err) {
          URL.revokeObjectURL(objectUrl);
          throw err;
        }
      } catch (err) {
        setSelectedFile(null);
        setVideoDuration(null);
        if (err instanceof PulseAnalysisError) {
          setErrorCode(err.code);
          setErrorCustomMessage(err.message);
        } else {
          setErrorCode('unsupported_file');
          setErrorCustomMessage(ERROR_DETAILS.unsupported_file.message);
        }
      }
    },
    []
  );

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      void loadAndValidateVideo(file);
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      void loadAndValidateVideo(file);
    }
  };

  const handleLoadSampleClip = async () => {
    setIsPreparingSample(true);
    setErrorCode(null);
    setErrorCustomMessage(null);
    try {
      const sampleFile = await createSampleDemoVideo();
      await loadAndValidateVideo(sampleFile, {
        skipExtensionCheck: true,
        overrideDuration: 5.5,
      });
    } catch (err) {
      if (err instanceof PulseAnalysisError) {
        setErrorCode(err.code);
        setErrorCustomMessage(err.message);
      }
    } finally {
      setIsPreparingSample(false);
    }
  };

  const startWebcam = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Webcam access is not supported in this browser. Try uploading an MP4 or MOV file.');
      return;
    }

    setCameraLoading(true);
    setCameraError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      mediaStreamRef.current = stream;
      setCameraActive(true);
    } catch {
      setCameraError(
        'Camera permission was denied or no webcam was found. Allow camera access or switch to Upload Video.'
      );
      setCameraActive(false);
    } finally {
      setCameraLoading(false);
    }
  }, []);

  const handleTabSelect = (tab: InputTab) => {
    if (isAnalyzing || isRecording) return;
    setActiveTab(tab);
    setErrorCode(null);
    setErrorCustomMessage(null);

    if (tab === 'webcam') {
      if (!selectedFile && !cameraActive) {
        void startWebcam();
      }
    } else {
      stopWebcamStream();
    }
  };

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, current: InputTab) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      handleTabSelect(current === 'upload' ? 'webcam' : 'upload');
    }
  };

  const finishRecording = useCallback(() => {
    if (recordingTimerRef.current !== null) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  }, []);

  const handleStartRecording = () => {
    if (!mediaStreamRef.current || typeof MediaRecorder === 'undefined') {
      setCameraError('Recording is not supported in this browser.');
      return;
    }

    clearCurrentVideo();
    recordedChunksRef.current = [];
    recordingElapsedRef.current = 0;
    setRecordingSecondsLeft(RECORD_DURATION_SECONDS);

    const mimeType = MediaRecorder.isTypeSupported('video/mp4')
      ? 'video/mp4'
      : MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';

    const recorder = new MediaRecorder(mediaStreamRef.current, { mimeType });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };

    recorder.onstop = () => {
      const elapsedSeconds = Math.max(1, recordingElapsedRef.current);
      const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
      const blob = new Blob(recordedChunksRef.current, { type: mimeType });
      const recordedFile = new File([blob], `webcam_capture_${elapsedSeconds}s.${ext}`, {
        type: mimeType,
      });

      stopWebcamStream();
      void loadAndValidateVideo(recordedFile, {
        skipExtensionCheck: true,
        overrideDuration: elapsedSeconds,
      });
    };

    recorder.start(250);
    setIsRecording(true);

    recordingTimerRef.current = window.setInterval(() => {
      recordingElapsedRef.current += 1;
      const remaining = RECORD_DURATION_SECONDS - recordingElapsedRef.current;
      setRecordingSecondsLeft(Math.max(0, remaining));

      if (remaining <= 0) {
        finishRecording();
      }
    }, 1000);
  };

  const handleAnalyze = async () => {
    if (!selectedFile || isAnalyzing) return;

    setIsAnalyzing(true);
    setErrorCode(null);
    setErrorCustomMessage(null);
    setAnalysisResult(null);
    setCurrentStepIndex(0);
    setProgressPercent(10);

    // Advance the 4-step indicator smoothly across the 3-second analysis window
    const startTime = Date.now();
    analysisStepTimerRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(95, Math.round((elapsed / 3000) * 95));
      setProgressPercent(pct);

      if (elapsed < 750) setCurrentStepIndex(0);
      else if (elapsed < 1550) setCurrentStepIndex(1);
      else if (elapsed < 2350) setCurrentStepIndex(2);
      else setCurrentStepIndex(3);
    }, 120);

    try {
      const result = await analyzeVideo(selectedFile, { simulateFake });
      if (analysisStepTimerRef.current !== null) {
        window.clearInterval(analysisStepTimerRef.current);
        analysisStepTimerRef.current = null;
      }
      setProgressPercent(100);
      setCurrentStepIndex(ANALYSIS_STEPS.length - 1);
      setAnalysisResult(result);
    } catch (err) {
      if (analysisStepTimerRef.current !== null) {
        window.clearInterval(analysisStepTimerRef.current);
        analysisStepTimerRef.current = null;
      }
      if (err instanceof PulseAnalysisError) {
        setErrorCode(err.code);
        setErrorCustomMessage(err.message);
      } else {
        setErrorCode('no_face');
        setErrorCustomMessage(ERROR_DETAILS.no_face.message);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleResetAll = () => {
    clearCurrentVideo();
    if (activeTab === 'webcam') {
      void startWebcam();
    }
  };

  const activeError = errorCode ? ERROR_DETAILS[errorCode] : null;

  return (
    <section
      id="analyze"
      aria-labelledby="analyze-heading"
      className="py-16 sm:py-20"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Section Header + Demo Controls */}
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-[#2DD4BF]">
              Pulse Verification Studio
            </p>
            <h2
              id="analyze-heading"
              className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl text-balance"
            >
              Analyze a Face Video
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400 sm:text-base">
              Upload a 5–15 second MP4 or MOV clip, or record 10 seconds directly with your webcam.
            </p>
          </div>

          {/* Demo Controls: Simulate Fake Toggle + Error Preview Selector */}
          <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-800 bg-[#111A2E] px-4 py-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                role="switch"
                id="simulate-fake-toggle"
                aria-checked={simulateFake}
                onClick={() => setSimulateFake((prev) => !prev)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border transition-colors duration-150 ${
                  simulateFake
                    ? 'border-[#F87171]/60 bg-[#F87171]/30'
                    : 'border-slate-700 bg-slate-800'
                }`}
              >
                <span className="sr-only">Simulate fake video</span>
                <span
                  className={`inline-block h-4 w-4 transform rounded-full transition-transform duration-150 ${
                    simulateFake
                      ? 'translate-x-6 bg-[#F87171]'
                      : 'translate-x-1 bg-slate-300'
                  }`}
                />
              </button>
              <label
                htmlFor="simulate-fake-toggle"
                className="cursor-pointer text-xs font-medium text-slate-200 whitespace-nowrap"
              >
                Simulate fake video
              </label>
            </div>

            <div className="h-4 w-px bg-slate-800 hidden sm:block" aria-hidden="true" />

            <div className="flex items-center gap-2">
              <label htmlFor="preview-error-select" className="text-xs text-slate-400 whitespace-nowrap">
                Preview error:
              </label>
              <select
                id="preview-error-select"
                value={errorCode ?? ''}
                onChange={(e) => {
                  const val = e.target.value as AnalysisErrorCode | '';
                  if (!val) {
                    setErrorCode(null);
                    setErrorCustomMessage(null);
                  } else {
                    setAnalysisResult(null);
                    setErrorCode(val);
                    setErrorCustomMessage(ERROR_DETAILS[val].message);
                  }
                }}
                className="rounded-lg border border-slate-700 bg-[#0B1220] px-2.5 py-1.5 text-xs text-slate-200 focus:border-[#2DD4BF] focus:outline-none"
              >
                <option value="">None</option>
                <option value="no_face">No face detected</option>
                <option value="video_too_short">Video too short</option>
                <option value="video_too_dark">Video too dark</option>
                <option value="unsupported_file">Unsupported file type</option>
              </select>
            </div>
          </div>
        </div>

        {/* Main Analyzer Workspace Card */}
        <div className="mt-8 rounded-2xl border border-slate-800 bg-[#111A2E] p-5 shadow-xl shadow-black/30 sm:p-8">
          {/* Segmented Input Mode Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div
              role="tablist"
              aria-label="Video input method"
              className="inline-flex rounded-xl border border-slate-800 bg-[#0B1220] p-1"
            >
              <button
                type="button"
                role="tab"
                id="tab-upload"
                aria-selected={activeTab === 'upload'}
                aria-controls="panel-upload"
                onClick={() => handleTabSelect('upload')}
                onKeyDown={(e) => handleTabKeyDown(e, 'upload')}
                disabled={isAnalyzing || isRecording}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-150 whitespace-nowrap cursor-pointer ${
                  activeTab === 'upload'
                    ? 'bg-[#2DD4BF] text-[#0B1220] font-semibold'
                    : 'text-slate-300 hover:text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <Upload className="h-4 w-4" aria-hidden="true" />
                <span>Upload Video</span>
              </button>

              <button
                type="button"
                role="tab"
                id="tab-webcam"
                aria-selected={activeTab === 'webcam'}
                aria-controls="panel-webcam"
                onClick={() => handleTabSelect('webcam')}
                onKeyDown={(e) => handleTabKeyDown(e, 'webcam')}
                disabled={isAnalyzing || isRecording}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-150 whitespace-nowrap cursor-pointer ${
                  activeTab === 'webcam'
                    ? 'bg-[#2DD4BF] text-[#0B1220] font-semibold'
                    : 'text-slate-300 hover:text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <Camera className="h-4 w-4" aria-hidden="true" />
                <span>Use Webcam</span>
              </button>
            </div>

            {selectedFile && !isAnalyzing && (
              <button
                type="button"
                onClick={clearCurrentVideo}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 transition-colors hover:text-[#F87171] cursor-pointer whitespace-nowrap"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Clear video</span>
              </button>
            )}
          </div>

          {/* Error Banner */}
          {activeError && (
            <div
              role="alert"
              className="animate-fade-in mt-6 flex flex-col justify-between gap-4 rounded-xl border border-[#F87171]/35 bg-[#F87171]/10 p-4 sm:flex-row sm:items-center sm:p-5"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#F87171]" aria-hidden="true" />
                <div>
                  <h3 className="text-sm font-semibold text-[#F87171]">{activeError.title}</h3>
                  <p className="mt-1 text-sm text-slate-200">
                    {errorCustomMessage || activeError.message}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">{activeError.hint}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setErrorCode(null);
                  setErrorCustomMessage(null);
                  if (activeTab === 'webcam' && !cameraActive && !selectedFile) {
                    void startWebcam();
                  }
                }}
                className="shrink-0 self-start rounded-lg border border-[#F87171]/40 bg-[#0B1220] px-3.5 py-2 text-xs font-medium text-slate-200 transition-colors hover:text-white sm:self-center cursor-pointer whitespace-nowrap"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Tab Panel: Upload Video */}
          {activeTab === 'upload' && !selectedFile && (
            <div
              id="panel-upload"
              role="tabpanel"
              aria-labelledby="tab-upload"
              className="mt-6"
            >
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors duration-150 ${
                  isDragging
                    ? 'border-[#2DD4BF] bg-[#2DD4BF]/10'
                    : 'border-slate-700 bg-[#0B1220]/70 hover:border-slate-600'
                }`}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-800 bg-[#111A2E] text-[#2DD4BF]">
                  <Film className="h-6 w-6" aria-hidden="true" />
                </div>

                <p className="mt-4 text-base font-medium text-white">
                  Drag and drop your face video here
                </p>
                <p className="mt-1.5 text-sm text-slate-400">
                  Accepts MP4 or MOV · 5–15 seconds · Good front lighting works best
                </p>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".mp4,.mov,video/mp4,video/quicktime"
                  onChange={handleFileChange}
                  className="sr-only"
                  id="video-file-input"
                  aria-label="Upload MP4 or MOV video file"
                />

                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#2DD4BF] px-4 py-2.5 text-sm font-semibold text-[#0B1220] transition-colors hover:bg-[#5EEAD4] cursor-pointer whitespace-nowrap"
                  >
                    <Upload className="h-4 w-4" aria-hidden="true" />
                    <span>Choose File</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleLoadSampleClip}
                    disabled={isPreparingSample}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-[#111A2E] px-4 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:border-[#2DD4BF]/50 hover:text-white disabled:opacity-60 cursor-pointer whitespace-nowrap"
                  >
                    {isPreparingSample ? (
                      <Loader2 className="h-4 w-4 animate-spin text-[#2DD4BF]" aria-hidden="true" />
                    ) : (
                      <PlayCircle className="h-4 w-4 text-[#2DD4BF]" aria-hidden="true" />
                    )}
                    <span>{isPreparingSample ? 'Preparing sample...' : 'Load sample clip'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tab Panel: Use Webcam */}
          {activeTab === 'webcam' && !selectedFile && (
            <div
              id="panel-webcam"
              role="tabpanel"
              aria-labelledby="tab-webcam"
              className="mt-6"
            >
              <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#0B1220]">
                {cameraError ? (
                  <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
                    <Camera className="h-10 w-10 text-slate-500" aria-hidden="true" />
                    <p className="mt-3 max-w-md text-sm text-slate-300">{cameraError}</p>
                    <button
                      type="button"
                      onClick={() => void startWebcam()}
                      className="mt-5 inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-[#111A2E] px-4 py-2 text-sm font-medium text-white hover:border-[#2DD4BF]/60 cursor-pointer"
                    >
                      Retry Camera
                    </button>
                  </div>
                ) : !cameraActive ? (
                  <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
                    {cameraLoading ? (
                      <>
                        <Loader2 className="h-8 w-8 animate-spin text-[#2DD4BF]" aria-hidden="true" />
                        <p className="mt-3 text-sm text-slate-300">Requesting camera access...</p>
                      </>
                    ) : (
                      <>
                        <Video className="h-10 w-10 text-[#2DD4BF]" aria-hidden="true" />
                        <p className="mt-3 text-sm text-slate-300">
                          Enable your camera to record a 10-second facial video for pulse analysis.
                        </p>
                        <button
                          type="button"
                          onClick={() => void startWebcam()}
                          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#2DD4BF] px-4 py-2.5 text-sm font-semibold text-[#0B1220] hover:bg-[#5EEAD4] cursor-pointer"
                        >
                          <Camera className="h-4 w-4" aria-hidden="true" />
                          <span>Enable Camera</span>
                        </button>
                      </>
                    )}
                  </div>
                ) : (
                  <div>
                    <div className="relative aspect-video max-h-96 w-full bg-black">
                      <video
                        ref={liveVideoRef}
                        autoPlay
                        muted
                        playsInline
                        className="h-full w-full -scale-x-100 object-cover"
                      />

                      {/* Subtle face positioning guide */}
                      <div
                        className="pointer-events-none absolute inset-0 flex items-center justify-center"
                        aria-hidden="true"
                      >
                        <div className="h-48 w-36 rounded-[50%] border border-dashed border-[#2DD4BF]/50 sm:h-56 sm:w-44" />
                      </div>

                      {isRecording && (
                        <div
                          className="absolute top-4 left-4 inline-flex items-center gap-2 rounded-lg bg-[#0B1220]/85 px-3 py-1.5 font-mono text-xs font-medium text-white tabular-nums backdrop-blur-sm"
                          aria-live="polite"
                        >
                          <span className="h-2 w-2 rounded-full bg-[#F87171]" aria-hidden="true" />
                          <span>REC · {recordingSecondsLeft}s remaining</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-800 px-5 py-4">
                      <p className="text-xs text-slate-400">
                        Center your face inside the oval guide and keep still while recording.
                      </p>

                      {!isRecording ? (
                        <button
                          type="button"
                          onClick={handleStartRecording}
                          className="inline-flex items-center gap-2 rounded-lg bg-[#2DD4BF] px-4 py-2.5 text-sm font-semibold text-[#0B1220] transition-colors hover:bg-[#5EEAD4] cursor-pointer whitespace-nowrap"
                        >
                          <Camera className="h-4 w-4" aria-hidden="true" />
                          <span>Record 10 seconds</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={finishRecording}
                          className="inline-flex items-center gap-2 rounded-lg border border-[#F87171]/50 bg-[#F87171]/15 px-4 py-2.5 text-sm font-semibold text-[#F87171] transition-colors hover:bg-[#F87171]/25 cursor-pointer whitespace-nowrap"
                        >
                          <Square className="h-4 w-4 fill-current" aria-hidden="true" />
                          <span>Stop ({recordingSecondsLeft}s)</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Selected / Recorded Video Preview */}
          {selectedFile && previewUrl && (
            <div className="animate-fade-in mt-6 space-y-4">
              <div className="overflow-hidden rounded-xl border border-slate-800 bg-black">
                <video
                  src={previewUrl}
                  controls
                  playsInline
                  className="mx-auto max-h-80 w-full object-contain"
                  aria-label="Selected video preview"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
                <div className="flex flex-wrap items-center gap-2 font-mono tabular-nums">
                  <span className="font-sans text-sm font-medium text-slate-200">
                    {selectedFile.name}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {videoDuration ? `${videoDuration.toFixed(1)}s` : 'Ready'}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{formatFileSize(selectedFile.size)}</span>
                </div>

                {videoDuration !== null && videoDuration > 15 && (
                  <span className="text-amber-400">
                    Clip exceeds 15s; only the primary window will be evaluated.
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Loading Progress Bar & 4-Step Pipeline */}
          {isAnalyzing && (
            <div
              className="animate-fade-in mt-6 rounded-xl border border-slate-800 bg-[#0B1220] p-5 sm:p-6"
              aria-live="polite"
            >
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-semibold text-white">
                  Analyzing cardiac signal...
                </span>
                <span className="font-mono text-xs font-medium tabular-nums text-[#2DD4BF]">
                  {progressPercent}%
                </span>
              </div>

              <div
                role="progressbar"
                aria-valuenow={progressPercent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Video analysis progress"
                className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-800"
              >
                <div
                  className="h-full rounded-full bg-[#2DD4BF] transition-[width] duration-150 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <ol className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {ANALYSIS_STEPS.map((label, idx) => {
                  const isDone = idx < currentStepIndex;
                  const isActive = idx === currentStepIndex;
                  return (
                    <li
                      key={label}
                      className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-xs font-medium transition-colors ${
                        isActive
                          ? 'border-[#2DD4BF]/50 bg-[#2DD4BF]/10 text-white'
                          : isDone
                            ? 'border-slate-800 bg-[#111A2E] text-[#4ADE80]'
                            : 'border-slate-800/70 bg-[#111A2E]/40 text-slate-500'
                      }`}
                    >
                      {isDone ? (
                        <Check className="h-4 w-4 shrink-0 text-[#4ADE80]" aria-hidden="true" />
                      ) : isActive ? (
                        <Loader2
                          className="h-4 w-4 shrink-0 animate-spin text-[#2DD4BF]"
                          aria-hidden="true"
                        />
                      ) : (
                        <span
                          className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-slate-700 font-mono text-[10px]"
                          aria-hidden="true"
                        >
                          {idx + 1}
                        </span>
                      )}
                      <span>{label}</span>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}

          {/* Primary Analyze Action Bar */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-slate-800 pt-5">
            <p className="text-xs text-slate-400">
              {selectedFile
                ? simulateFake
                  ? 'Demo mode active: analysis will simulate a deepfake verdict.'
                  : 'Ready to run rPPG heartbeat verification.'
                : 'Select or record a 5–15 second video to enable analysis.'}
            </p>

            <button
              type="button"
              onClick={handleAnalyze}
              disabled={!selectedFile || isAnalyzing || Boolean(errorCode)}
              aria-disabled={!selectedFile || isAnalyzing || Boolean(errorCode)}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#2DD4BF] px-6 py-2.5 text-sm font-semibold text-[#0B1220] transition-colors duration-150 hover:bg-[#5EEAD4] disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500 cursor-pointer whitespace-nowrap"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <span>Analyze</span>
              )}
            </button>
          </div>
        </div>

        {/* Results Panel (rendered after analysis completes) */}
        {analysisResult && !isAnalyzing && (
          <ResultsPanel result={analysisResult} onReset={handleResetAll} />
        )}
      </div>
    </section>
  );
}
