import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface IntroSplashScreenProps {
  onFinish: () => void;
  /**
   * Total duration in ms for the full unhurried, calm reveal sequence.
   * Default: 7000ms (7.0 seconds) for relaxed, luxury pacing.
   */
  durationMs?: number;
}

// Letters of "dropthan" to animate sequentially from Left to Right ('d' -> 'n')
const LOGO_LETTERS = ['d', 'r', 'o', 'p', 't', 'h', 'a', 'n'];

export function IntroSplashScreen({
  onFinish,
  durationMs = 7000,
}: IntroSplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [phase, setPhase] = useState<'letters' | 'welcome'>('letters');
  const completedRef = useRef(false);

  // Complete and seamlessly transition to Login page
  const handleComplete = () => {
    if (completedRef.current) return;
    completedRef.current = true;

    // Set flag in localStorage when the intro completes
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
    // Phase 1: Smooth Left-to-Right sequential letter reveal ('d' -> 'r' -> 'o' -> 'p' -> 't' -> 'h' -> 'a' -> 'n')
    // Letters reveal calmly from 0.35s to ~2.6s, resting in full view until 3.9s.
    
    // Phase 2: Gentle crossfade to "WELCOME ENTREPRENEUR" at 3.9s
    const welcomeTimer = setTimeout(() => {
      setPhase('welcome');
    }, 3900);

    // Phase 3: Exact redirection trigger to Login page at durationMs (7.0s)
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
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[999999] flex flex-col items-center justify-center bg-white text-slate-900 select-none overflow-hidden"
          style={{
            transform: 'translateZ(0)',
            backfaceVisibility: 'hidden',
          }}
        >
          {/* Main Stage */}
          <div className="relative z-10 flex flex-col items-center justify-center text-center px-6 w-full max-w-4xl min-h-[260px]">
            <AnimatePresence mode="wait">
              {phase === 'letters' && (
                <motion.div
                  key="logo-text-reveal"
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  className="flex items-center justify-center space-x-0.5 sm:space-x-1 tracking-tight"
                >
                  {LOGO_LETTERS.map((char, index) => {
                    // Left-to-Right sequential reveal:
                    // 'd' (index 0) reveals first, ..., 'n' (index 7) reveals last.
                    // Relaxed, unhurried pacing with 0.28s stagger per character starting at 0.35s
                    const delay = 0.35 + index * 0.28;

                    return (
                      <motion.span
                        key={`char-${index}-${char}`}
                        initial={{
                          opacity: 0,
                          x: -18,
                          y: 6,
                          scale: 0.94,
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
                          ease: [0.16, 1, 0.3, 1], // Smooth natural deceleration
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

              {phase === 'welcome' && (
                <motion.div
                  key="welcome-reveal"
                  initial={{ opacity: 0, scale: 0.96, y: 14 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 1.01 }}
                  transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  className="flex flex-col items-center justify-center space-y-2.5 sm:space-y-3 select-none"
                  style={{
                    transform: 'translateZ(0)',
                    willChange: 'transform, opacity',
                  }}
                >
                  <motion.span
                    initial={{ opacity: 0, letterSpacing: '0.22em' }}
                    animate={{ opacity: 1, letterSpacing: '0.36em' }}
                    transition={{ duration: 0.75, delay: 0.1, ease: 'easeOut' }}
                    className="text-xs sm:text-sm md:text-base font-extrabold text-slate-400 uppercase tracking-[0.36em]"
                    style={{ fontFamily: "'Montserrat', sans-serif" }}
                  >
                    WELCOME
                  </motion.span>

                  <motion.h2
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.75, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
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
                    transition={{ duration: 0.65, delay: 0.4 }}
                    className="text-xs sm:text-sm font-semibold text-slate-500 tracking-wide pt-1"
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  >
                    Dropshippers &bull; Wholesalers &bull; Exporters
                  </motion.p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom Calm Progress Bar */}
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

