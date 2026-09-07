import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface IntroSplashScreenProps {
  onFinish: () => void;
  /**
   * Total duration in ms for the full unhurried, sequential reveal.
   * Default: 6800ms (6.8 seconds) for calm, luxury pacing.
   */
  durationMs?: number;
}

// Letter arrays for matching animation style
const DROPTHAN_LETTERS = ['d', 'r', 'o', 'p', 't', 'h', 'a', 'n'];
const ENTREPRENEUR_LETTERS = ['E', 'N', 'T', 'R', 'E', 'P', 'R', 'E', 'N', 'E', 'U', 'R'];

export function IntroSplashScreen({
  onFinish,
  durationMs = 6800,
}: IntroSplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);
  // Strictly sequential phases: 'dropthan' finishes completely before 'welcome' starts
  const [currentPhase, setCurrentPhase] = useState<'dropthan' | 'welcome'>('dropthan');
  const completedRef = useRef(false);

  // Complete and seamlessly transition to Login page
  const handleComplete = () => {
    if (completedRef.current) return;
    completedRef.current = true;

    // Set flag in localStorage when the intro finishes
    try {
      localStorage.setItem('hasSeenIntro', 'true');
    } catch (e) {
      console.warn('localStorage access error:', e);
    }

    setIsVisible(false);
    setTimeout(() => {
      onFinish();
    }, 450); // 60fps smooth fade out to Login screen
  };

  useEffect(() => {
    // TIMELINE ORCHESTRATION (Strictly Sequential - No Overlap):
    // 1. "dropthan" animates left-to-right from 0.3s to ~2.1s, then rests in full display until 3.3s.
    // 2. At 3.4s, "dropthan" exits cleanly, and "WELCOME ENTREPRENEUR" animates in with matching style.
    const welcomePhaseTimer = setTimeout(() => {
      setCurrentPhase('welcome');
    }, 3400);

    // 3. At durationMs (~6.8s), entire intro concludes and smoothly routes to Login.
    const finishTimer = setTimeout(() => {
      handleComplete();
    }, durationMs);

    return () => {
      clearTimeout(welcomePhaseTimer);
      clearTimeout(finishTimer);
    };
  }, [durationMs]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          id="dropthan-intro-splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[999999] flex flex-col items-center justify-center bg-white text-slate-900 select-none overflow-hidden"
          style={{
            transform: 'translateZ(0)',
            backfaceVisibility: 'hidden',
          }}
        >
          {/* Subtle Ambient Radial Glow for High-End Polish */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(13,71,161,0.04)_0%,rgba(255,255,255,0)_75%)] pointer-events-none" />

          {/* Main Visual Animation Stage */}
          <div className="relative z-10 flex flex-col items-center justify-center text-center px-6 w-full max-w-5xl min-h-[300px]">
            <AnimatePresence mode="wait">
              {/* PHASE 1: "dropthan" Letter-by-Letter Reveal (Left-to-Right: 'd' -> 'r' -> 'o' -> 'p' -> 't' -> 'h' -> 'a' -> 'n') */}
              {currentPhase === 'dropthan' && (
                <motion.div
                  key="phase-dropthan"
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0, y: -16, filter: 'blur(6px)' }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  className="flex items-center justify-center space-x-0.5 sm:space-x-1 tracking-tight"
                >
                  {DROPTHAN_LETTERS.map((char, index) => {
                    // Left-to-Right sequential delay starting at 0.3s with 0.22s stagger
                    const delay = 0.3 + index * 0.22;

                    return (
                      <motion.span
                        key={`dropthan-char-${index}-${char}`}
                        initial={{
                          opacity: 0,
                          x: -20,
                          y: 4,
                          scale: 0.92,
                        }}
                        animate={{
                          opacity: 1,
                          x: 0,
                          y: 0,
                          scale: 1,
                        }}
                        transition={{
                          duration: 0.65,
                          delay,
                          ease: [0.16, 1, 0.3, 1], // Smooth natural cubic bezier
                        }}
                        className="inline-block text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black text-[#0d47a1] lowercase select-none"
                        style={{
                          fontFamily: "'Plus Jakarta Sans', 'Poppins', -apple-system, sans-serif",
                          letterSpacing: '-0.035em',
                          willChange: 'transform, opacity',
                          transform: 'translateZ(0)',
                        }}
                      >
                        {char}
                      </motion.span>
                    );
                  })}
                </motion.div>
              )}

              {/* PHASE 2: "WELCOME ENTREPRENEUR" (Starts strictly AFTER Phase 1 finishes with matching reveal style) */}
              {currentPhase === 'welcome' && (
                <motion.div
                  key="phase-welcome"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 1.01 }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="flex flex-col items-center justify-center space-y-3 sm:space-y-4 select-none"
                  style={{
                    transform: 'translateZ(0)',
                    willChange: 'transform, opacity',
                  }}
                >
                  {/* "WELCOME" Top Eyebrow */}
                  <motion.span
                    initial={{ opacity: 0, letterSpacing: '0.2em' }}
                    animate={{ opacity: 1, letterSpacing: '0.38em' }}
                    transition={{ duration: 0.65, delay: 0.1, ease: 'easeOut' }}
                    className="text-xs sm:text-sm md:text-base font-extrabold text-[#0d47a1]/70 uppercase tracking-[0.38em]"
                    style={{ fontFamily: "'Montserrat', sans-serif" }}
                  >
                    WELCOME
                  </motion.span>

                  {/* "ENTREPRENEUR" Sequential Letter-by-Letter Reveal with Matching Style in #0d47a1 */}
                  <div className="flex items-center justify-center flex-wrap gap-0.5 sm:gap-1">
                    {ENTREPRENEUR_LETTERS.map((char, index) => {
                      // Matching left-to-right sequential delay
                      const delay = 0.2 + index * 0.09;

                      return (
                        <motion.span
                          key={`entrepreneur-char-${index}-${char}`}
                          initial={{
                            opacity: 0,
                            x: -14,
                            y: 4,
                            scale: 0.94,
                          }}
                          animate={{
                            opacity: 1,
                            x: 0,
                            y: 0,
                            scale: 1,
                          }}
                          transition={{
                            duration: 0.55,
                            delay,
                            ease: [0.16, 1, 0.3, 1],
                          }}
                          className="inline-block text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black uppercase text-[#0d47a1] select-none"
                          style={{
                            fontFamily: "'Montserrat', 'Poppins', sans-serif",
                            letterSpacing: '0.04em',
                            willChange: 'transform, opacity',
                            transform: 'translateZ(0)',
                          }}
                        >
                          {char}
                        </motion.span>
                      );
                    })}
                  </div>

                  {/* Subtitle Tagline */}
                  <motion.p
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 1.35 }}
                    className="text-xs sm:text-sm font-semibold text-slate-500 tracking-wide pt-1"
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  >
                    Dropshippers &bull; Wholesalers &bull; Exporters
                  </motion.p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom Minimal Progress Bar */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-48 sm:w-60 h-1 bg-slate-100 rounded-full overflow-hidden border border-slate-200/40 z-10">
            <motion.div
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: durationMs / 1000, ease: 'linear' }}
              className="h-full bg-gradient-to-r from-blue-600 to-[#0d47a1] rounded-full"
              style={{ willChange: 'width' }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
