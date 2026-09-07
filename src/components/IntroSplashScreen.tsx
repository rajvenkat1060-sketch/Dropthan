import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Volume2, VolumeX } from 'lucide-react';

interface IntroSplashScreenProps {
  onFinish: () => void;
  /**
   * Video source path. Defaults to '/intro.mp4'.
   */
  videoSrc?: string;
  /**
   * Maximum safety timeout in ms matching the video length.
   * Ensures the user is NEVER stuck on the intro screen.
   */
  durationMs?: number;
}

export function IntroSplashScreen({
  onFinish,
  videoSrc = '/intro.mp4',
  durationMs = 2800,
}: IntroSplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [videoFailed, setVideoFailed] = useState(false);
  const [animationStep, setAnimationStep] = useState<number>(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const completedRef = useRef(false);

  // Complete and redirect to Login
  const handleComplete = () => {
    if (completedRef.current) return;
    completedRef.current = true;

    // Set flag in localStorage so returning users bypass the intro
    try {
      localStorage.setItem('hasSeenIntro', 'true');
      localStorage.setItem('dropthan_has_seen_intro', 'true');
    } catch (e) {
      console.warn('localStorage not accessible:', e);
    }

    setIsVisible(false);
    setTimeout(() => {
      onFinish();
    }, 400); // smooth exit transition
  };

  useEffect(() => {
    // 1. Mark localStorage flag on initial mount as required
    try {
      localStorage.setItem('hasSeenIntro', 'true');
      localStorage.setItem('dropthan_has_seen_intro', 'true');
    } catch (e) {}

    // 2. Play video if available
    if (videoRef.current) {
      videoRef.current.play().catch(() => {
        // Autoplay may be restricted with sound or video format
        setVideoFailed(true);
      });
    }

    // 3. Fallback animated visual steps matching exact video frames
    const step1 = setTimeout(() => setAnimationStep(1), 150);
    const step2 = setTimeout(() => setAnimationStep(2), 1100);

    // 4. Exact safety timer to guarantee automatic redirection to Login page
    const safetyTimer = setTimeout(() => {
      handleComplete();
    }, durationMs);

    return () => {
      clearTimeout(step1);
      clearTimeout(step2);
      clearTimeout(safetyTimer);
    };
  }, [durationMs]);

  const toggleAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    } else {
      setIsMuted((prev) => !prev);
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          id="dropthan-intro-splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          onClick={handleComplete}
          className="fixed inset-0 z-[999999] flex flex-col items-center justify-center bg-white text-slate-900 select-none overflow-hidden cursor-pointer"
        >
          {/* TOP CONTROLS: SKIP & MUTE BUTTONS */}
          <div className="absolute top-5 right-5 sm:top-7 sm:right-7 flex items-center gap-2.5 z-30">
            <button
              type="button"
              id="btn-intro-mute"
              onClick={toggleAudio}
              className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition shadow-xs cursor-pointer border border-slate-200/80 backdrop-blur-md"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-[#0d47a1]" />}
            </button>

            <button
              type="button"
              id="btn-skip-intro-video"
              onClick={(e) => {
                e.stopPropagation();
                handleComplete();
              }}
              className="px-3.5 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <span>Skip</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* MAIN VIDEO DISPLAY */}
          <div className="relative w-full h-full max-w-5xl flex items-center justify-center p-4">
            {!videoFailed ? (
              <video
                ref={videoRef}
                src={videoSrc}
                autoPlay
                playsInline
                muted={isMuted}
                onEnded={handleComplete}
                onError={() => setVideoFailed(true)}
                className="w-full h-full max-h-[85vh] object-contain"
              />
            ) : null}

            {/* HIGH-FIDELITY BACKUP ANIMATION (EXACT MATCH OF UPLOADED VIDEO FRAMES: DROPTHAN -> WELCOME ENTREPRENEUR) */}
            {videoFailed && (
              <div className="flex flex-col items-center justify-center text-center w-full px-6">
                <AnimatePresence mode="wait">
                  {animationStep < 2 ? (
                    <motion.div
                      key="step-dropthan"
                      initial={{ opacity: 0, x: 40 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -30 }}
                      transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
                      className="flex items-center justify-center"
                    >
                      <h1
                        className="text-5xl sm:text-7xl md:text-8xl font-black text-[#0d47a1] tracking-tight lowercase"
                        style={{
                          fontFamily: "'Plus Jakarta Sans', 'Poppins', sans-serif",
                          letterSpacing: '-0.03em',
                        }}
                      >
                        dropthan
                      </h1>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="step-welcome-entrepreneur"
                      initial={{ opacity: 0, scale: 0.94 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.05 }}
                      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                      className="flex flex-col items-center justify-center space-y-1"
                    >
                      <span
                        className="text-sm sm:text-lg md:text-xl font-black text-slate-500 uppercase tracking-[0.35em]"
                        style={{ fontFamily: "'Montserrat', sans-serif" }}
                      >
                        WELCOME
                      </span>
                      <h2
                        className="text-4xl sm:text-6xl md:text-7xl font-black uppercase text-[#0d47a1] tracking-wider"
                        style={{
                          fontFamily: "'Montserrat', 'Poppins', sans-serif",
                          letterSpacing: '0.04em',
                        }}
                      >
                        ENTREPRENEUR
                      </h2>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* BOTTOM SUBTLE BRANDING & PROGRESS BAR */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-xs px-4 flex flex-col items-center space-y-2 z-20">
            <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden border border-slate-200">
              <motion.div
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: durationMs / 1000, ease: 'linear' }}
                className="h-full bg-[#0d47a1] rounded-full"
              />
            </div>
            <span className="text-[10px] font-semibold text-slate-400 tracking-wider">
              TAP ANYWHERE TO CONTINUE
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
