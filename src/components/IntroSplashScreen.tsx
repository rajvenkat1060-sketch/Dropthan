import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface IntroSplashScreenProps {
  onFinish: () => void;
  /**
   * Total duration in ms for the full right-to-left reveal and transition sequence.
   * Default: 6000ms (6 seconds) for unhurried, luxury pacing.
   */
  durationMs?: number;
}

// Letters of "dropthan" to animate sequentially from right to left
const LOGO_LETTERS = ['d', 'r', 'o', 'p', 't', 'h', 'a', 'n'];

export function IntroSplashScreen({
  onFinish,
  durationMs = 6000,
}: IntroSplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [phase, setPhase] = useState<'letters' | 'welcome'>('letters');
  const completedRef = useRef(false);

  // Complete and redirect directly to Login page
  const handleComplete = () => {
    if (completedRef.current) return;
    completedRef.current = true;

    // Set flag in localStorage when the intro finishes
    try {
      localStorage.setItem('hasSeenIntro', 'true');
    } catch (e) {
      console.warn('localStorage access failed:', e);
    }

    setIsVisible(false);
    setTimeout(() => {
      onFinish();
    }, 450); // smooth exit transition
  };

  useEffect(() => {
    // Phase 1: Right-to-Left letter reveal ('n' -> 'a' -> 'h' -> 't' -> 'p' -> 'o' -> 'r' -> 'd')
    // Letters start revealing from 0.3s to ~3.2s, then rest in full display.
    
    // Phase 2: Transition to "WELCOME ENTREPRENEUR" at 3.6s
    const welcomeTimer = setTimeout(() => {
      setPhase('welcome');
    }, 3600);

    // Phase 3: Automatic seamless redirection to Login page at durationMs (6.0s)
    const finishTimer = setTimeout(() => {
      handleComplete();
    }, durationMs);

    return () => {
      clearTimeout(welcomeTimer);
      clearTimeout(finishTimer);
    };
  }, [durationMs]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          id="dropthan-intro-splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.01, filter: 'blur(6px)' }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[999999] flex flex-col items-center justify-center bg-white text-slate-900 select-none overflow-hidden"
        >
          {/* Subtle Ambient Radial Lighting for High-End Depth */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(13,71,161,0.04)_0%,rgba(255,255,255,0)_75%)] pointer-events-none" />

          {/* Main Visual Animation Stage */}
          <div className="relative z-10 flex flex-col items-center justify-center text-center px-4 w-full max-w-4xl min-h-[260px]">
            <AnimatePresence mode="wait">
              {phase === 'letters' && (
                <motion.div
                  key="logo-text-reveal"
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0, y: -16, filter: 'blur(8px)' }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="flex items-center justify-center space-x-0.5 sm:space-x-1 tracking-tight"
                >
                  {LOGO_LETTERS.map((char, index) => {
                    // Right-to-left sequential reveal:
                    // 'n' (index 7) reveals first, ..., 'd' (index 0) reveals last.
                    const reverseIndex = LOGO_LETTERS.length - 1 - index;
                    // Relaxed pacing: 0.28s stagger per letter starting at 0.3s
                    const delay = 0.3 + reverseIndex * 0.28;

                    return (
                      <motion.span
                        key={`char-${index}-${char}`}
                        initial={{
                          opacity: 0,
                          x: 35,
                          scale: 0.88,
                          filter: 'blur(10px)',
                        }}
                        animate={{
                          opacity: 1,
                          x: 0,
                          scale: 1,
                          filter: 'blur(0px)',
                        }}
                        transition={{
                          duration: 0.75,
                          delay,
                          ease: [0.16, 1, 0.3, 1],
                        }}
                        className="inline-block text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black text-[#0d47a1] lowercase select-none"
                        style={{
                          fontFamily: "'Plus Jakarta Sans', 'Poppins', -apple-system, sans-serif",
                          letterSpacing: '-0.035em',
                          willChange: 'transform, opacity, filter',
                        }}
                      >
                        {char}
                      </motion.span>
                    );
                  })}
                </motion.div>
              )}

              {phase === 'welcome' && (
                <motion.div
                  key="welcome-reveal"
                  initial={{ opacity: 0, scale: 0.94, y: 16, filter: 'blur(8px)' }}
                  animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, scale: 1.02, filter: 'blur(6px)' }}
                  transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
                  className="flex flex-col items-center justify-center space-y-2 sm:space-y-3 select-none"
                >
                  <motion.span
                    initial={{ opacity: 0, letterSpacing: '0.2em' }}
                    animate={{ opacity: 1, letterSpacing: '0.38em' }}
                    transition={{ duration: 0.7, delay: 0.1, ease: 'easeOut' }}
                    className="text-xs sm:text-sm md:text-base font-extrabold text-slate-400 uppercase tracking-[0.38em]"
                    style={{ fontFamily: "'Montserrat', sans-serif" }}
                  >
                    WELCOME
                  </motion.span>

                  <motion.h2
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className="text-4xl sm:text-6xl md:text-7xl font-black uppercase text-[#0d47a1] tracking-wider"
                    style={{
                      fontFamily: "'Montserrat', 'Poppins', sans-serif",
                      letterSpacing: '0.04em',
                    }}
                  >
                    ENTREPRENEUR
                  </motion.h2>

                  <motion.p
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="text-xs sm:text-sm font-semibold text-slate-500 tracking-wide pt-1"
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  >
                    Dropshippers &bull; Wholesalers &bull; Exporters
                  </motion.p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom Calm Linear Progress Accent */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-48 sm:w-60 h-1 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50 z-10">
            <motion.div
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: durationMs / 1000, ease: 'linear' }}
              className="h-full bg-gradient-to-r from-blue-600 to-[#0d47a1] rounded-full"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

