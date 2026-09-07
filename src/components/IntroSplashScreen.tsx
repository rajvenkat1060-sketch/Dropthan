import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface IntroSplashScreenProps {
  onFinish: () => void;
  /**
   * Total duration in ms for the full right-to-left reveal and transition sequence.
   * Default: 3100ms (3.1 seconds) for unhurried, luxury pacing.
   */
  durationMs?: number;
}

// Letters of "dropthan" to animate sequentially from right to left
const LOGO_LETTERS = ['d', 'r', 'o', 'p', 't', 'h', 'a', 'n'];

export function IntroSplashScreen({
  onFinish,
  durationMs = 3100,
}: IntroSplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [phase, setPhase] = useState<'letters' | 'welcome' | 'done'>('letters');
  const completedRef = useRef(false);

  // Complete and redirect directly to Login page
  const handleComplete = () => {
    if (completedRef.current) return;
    completedRef.current = true;

    // Set flag in localStorage so returning users bypass the intro
    try {
      localStorage.setItem('hasSeenIntro', 'true');
      localStorage.setItem('dropthan_has_seen_intro', 'true');
    } catch (e) {
      console.warn('localStorage access failed:', e);
    }

    setIsVisible(false);
    setTimeout(() => {
      onFinish();
    }, 400); // smooth exit transition
  };

  useEffect(() => {
    // 1. Immediately flag localStorage on mount
    try {
      localStorage.setItem('hasSeenIntro', 'true');
      localStorage.setItem('dropthan_has_seen_intro', 'true');
    } catch (e) {}

    // 2. Timeline steps for smooth, lag-free reveal sequence
    // Phase 1: Letter-by-letter reveal (Right-to-Left: 'n' -> 'a' -> 'h' -> 't' -> 'p' -> 'o' -> 'r' -> 'd')
    // Phase 2: Smooth transition to Welcome Entrepreneur
    const welcomeTimer = setTimeout(() => {
      setPhase('welcome');
    }, 1650);

    // Phase 3: Automatic Redirection to Login
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
          exit={{ opacity: 0, scale: 1.015, filter: 'blur(4px)' }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[999999] flex flex-col items-center justify-center bg-white text-slate-900 select-none overflow-hidden"
        >
          {/* Subtle Ambient Radial Lighting for High-End Polish */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(13,71,161,0.06)_0%,rgba(255,255,255,0)_70%)] pointer-events-none" />

          {/* Main Visual Animation Stage */}
          <div className="relative z-10 flex flex-col items-center justify-center text-center px-4 w-full max-w-4xl min-h-[220px]">
            <AnimatePresence mode="wait">
              {phase === 'letters' && (
                <motion.div
                  key="logo-text-reveal"
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0, y: -16, filter: 'blur(6px)' }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className="flex items-center justify-center space-x-0 sm:space-x-0.5 tracking-tight"
                >
                  {LOGO_LETTERS.map((char, index) => {
                    // Calculate right-to-left sequential delay
                    // 'n' (index 7) animates first, 'd' (index 0) animates last
                    const reverseIndex = LOGO_LETTERS.length - 1 - index;
                    const delay = 0.12 + reverseIndex * 0.095;

                    return (
                      <motion.span
                        key={`char-${index}-${char}`}
                        initial={{
                          opacity: 0,
                          x: 28,
                          y: 4,
                          scale: 0.92,
                          filter: 'blur(8px)',
                        }}
                        animate={{
                          opacity: 1,
                          x: 0,
                          y: 0,
                          scale: 1,
                          filter: 'blur(0px)',
                        }}
                        transition={{
                          duration: 0.55,
                          delay,
                          ease: [0.16, 1, 0.3, 1],
                        }}
                        className="inline-block text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black text-[#0d47a1] lowercase select-none"
                        style={{
                          fontFamily: "'Plus Jakarta Sans', 'Poppins', -apple-system, sans-serif",
                          letterSpacing: '-0.04em',
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
                  initial={{ opacity: 0, scale: 0.95, y: 12, filter: 'blur(6px)' }}
                  animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, scale: 1.02, filter: 'blur(4px)' }}
                  transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                  className="flex flex-col items-center justify-center space-y-1.5 sm:space-y-2 select-none"
                >
                  <motion.span
                    initial={{ opacity: 0, letterSpacing: '0.2em' }}
                    animate={{ opacity: 1, letterSpacing: '0.35em' }}
                    transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
                    className="text-xs sm:text-sm md:text-base font-extrabold text-slate-400 uppercase tracking-[0.35em]"
                    style={{ fontFamily: "'Montserrat', sans-serif" }}
                  >
                    WELCOME
                  </motion.span>

                  <motion.h2
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
                    className="text-4xl sm:text-6xl md:text-7xl font-black uppercase text-[#0d47a1] tracking-wider"
                    style={{
                      fontFamily: "'Montserrat', 'Poppins', sans-serif",
                      letterSpacing: '0.04em',
                    }}
                  >
                    ENTREPRENEUR
                  </motion.h2>

                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.35 }}
                    className="text-[11px] sm:text-xs font-bold text-slate-500 tracking-wide pt-1"
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  >
                    Dropshippers &bull; Wholesalers &bull; Exporters
                  </motion.p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom Minimal Progress Indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-40 sm:w-52 h-1 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60 z-10">
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
