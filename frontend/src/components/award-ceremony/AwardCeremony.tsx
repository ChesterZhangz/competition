import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { MathParticlesCanvas } from './MathParticles';
import { Podium3D } from './Podium3D';
import { WinnerCard } from './WinnerCard';
import { Confetti } from './Confetti';

interface Winner {
  rank: number;
  name: string;
  score: number;
  participantId: string;
  avatar?: string;
  teamName?: string;
}

interface AwardCeremonyProps {
  winners: Winner[];
  competitionName: string;
  onClose?: () => void;
}

// Dramatic light beam component
function LightBeams() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute top-0 left-1/2 h-full"
          style={{
            width: '2px',
            background: 'linear-gradient(180deg, rgba(255,215,0,0.8) 0%, rgba(255,215,0,0) 100%)',
            transformOrigin: 'top center',
            rotate: `${(i - 4) * 12}deg`,
          }}
          initial={{ opacity: 0, scaleY: 0 }}
          animate={{
            opacity: [0, 0.6, 0.3],
            scaleY: [0, 1, 1],
          }}
          transition={{
            duration: 1.5,
            delay: 0.5 + i * 0.1,
            ease: 'easeOut',
          }}
        />
      ))}
    </div>
  );
}

// Glowing ring effect
function GlowRings() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border-2 border-yellow-400/30"
          style={{
            width: `${300 + i * 150}px`,
            height: `${300 + i * 150}px`,
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: [0, 0.5, 0],
            scale: [0, 1.5, 2],
          }}
          transition={{
            duration: 3,
            delay: 1 + i * 0.3,
            repeat: Infinity,
            ease: 'easeOut',
          }}
        />
      ))}
    </div>
  );
}

// Sparkle effect
function Sparkles({ count = 30 }: { count?: number }) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {[...Array(count)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-yellow-300 rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            boxShadow: '0 0 6px 2px rgba(255,215,0,0.8)',
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1.5, 0],
          }}
          transition={{
            duration: 1.5 + Math.random(),
            delay: Math.random() * 3,
            repeat: Infinity,
            repeatDelay: Math.random() * 2,
          }}
        />
      ))}
    </div>
  );
}

export function AwardCeremony({ winners, competitionName, onClose }: AwardCeremonyProps) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<'blackout' | 'intro' | 'reveal' | 'celebration'>('blackout');
  const [showConfetti, setShowConfetti] = useState(false);
  const [showPodium, setShowPodium] = useState(false);
  const [showWinners, setShowWinners] = useState(false);

  // Top 3 winners for podium
  const topThree = winners.filter(w => w.rank <= 3).sort((a, b) => a.rank - b.rank);
  // All other winners
  const otherWinners = winners.filter(w => w.rank > 3).slice(0, 7);

  useEffect(() => {
    // Dramatic phase transitions - fast and smooth
    const timers = [
      setTimeout(() => setPhase('intro'), 100),
      setTimeout(() => setPhase('reveal'), 1500),
      setTimeout(() => setShowPodium(true), 1800),
      setTimeout(() => setShowWinners(true), 2500),
      setTimeout(() => {
        setPhase('celebration');
        setShowConfetti(true);
      }, 3000),
    ];

    return () => timers.forEach(clearTimeout);
  }, []);

  // Handle escape key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && onClose) {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <motion.div
      className="fixed inset-0 z-50 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Deep dark background with gradient */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, #1a1a2e 0%, #0a0a0f 50%, #000000 100%)',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      />

      {/* Background Math Particles */}
      <MathParticlesCanvas count={100} />

      {/* Light beams effect */}
      <AnimatePresence>
        {phase !== 'blackout' && <LightBeams />}
      </AnimatePresence>

      {/* Glow rings */}
      <AnimatePresence>
        {phase === 'celebration' && <GlowRings />}
      </AnimatePresence>

      {/* Sparkles */}
      <AnimatePresence>
        {phase === 'celebration' && <Sparkles count={40} />}
      </AnimatePresence>

      {/* Radial glow effects */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[1000px] h-[1000px]"
          style={{
            background: 'radial-gradient(circle, rgba(255,215,0,0.15) 0%, transparent 50%)',
          }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
        />
        <motion.div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[1400px] h-[700px]"
          style={{
            background: 'radial-gradient(ellipse at bottom, rgba(44,177,188,0.2) 0%, transparent 60%)',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1 }}
        />
      </div>

      {/* Confetti */}
      <AnimatePresence>
        {showConfetti && <Confetti count={250} />}
      </AnimatePresence>

      {/* Close button */}
      {onClose && (
        <motion.button
          className="absolute top-6 right-6 z-[60] p-3 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-all duration-300"
          onClick={onClose}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 2, type: 'spring' }}
          whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,255,255,0.3)' }}
          whileTap={{ scale: 0.9 }}
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </motion.button>
      )}

      {/* Main Content */}
      <div className="relative h-full flex flex-col items-center justify-start pt-8 px-4 overflow-y-auto">
        {/* MAREATE Logo with spectacular animation */}
        <AnimatePresence>
          {phase !== 'blackout' && (
            <motion.div
              className="text-center mb-4 relative z-10"
              initial={{ opacity: 0, y: -100 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.8,
                ease: [0.34, 1.56, 0.64, 1],
              }}
            >
              {/* Glow behind text */}
              <motion.div
                className="absolute inset-0 blur-3xl"
                style={{
                  background: 'radial-gradient(circle, rgba(255,215,0,0.4) 0%, transparent 70%)',
                }}
                animate={{
                  opacity: [0.4, 0.8, 0.4],
                  scale: [1, 1.1, 1],
                }}
                transition={{ duration: 2, repeat: Infinity }}
              />

              {/* Main Mareate Text */}
              <motion.h1
                className="relative text-6xl md:text-8xl lg:text-9xl font-black tracking-[0.2em]"
                style={{
                  background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 20%, #FFD700 40%, #FFEC8B 60%, #FFD700 80%, #FFA500 100%)',
                  backgroundSize: '200% 200%',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  filter: 'drop-shadow(0 0 40px rgba(255,215,0,0.5)) drop-shadow(0 0 80px rgba(255,215,0,0.3))',
                }}
                animate={{
                  backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'],
                }}
                transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
              >
                MAREATE
              </motion.h1>

              {/* Decorative line */}
              <motion.div
                className="mt-4 flex items-center justify-center gap-4"
                initial={{ opacity: 0, scaleX: 0 }}
                animate={{ opacity: 1, scaleX: 1 }}
                transition={{ delay: 0.5, duration: 0.8 }}
              >
                <motion.div
                  className="h-[2px] w-24 md:w-32"
                  style={{
                    background: 'linear-gradient(90deg, transparent 0%, #FFD700 50%, transparent 100%)',
                  }}
                />
                <motion.span
                  className="text-yellow-400/90 text-sm md:text-base font-light tracking-[0.4em] uppercase"
                  animate={{ opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  Math Competition
                </motion.span>
                <motion.div
                  className="h-[2px] w-24 md:w-32"
                  style={{
                    background: 'linear-gradient(90deg, transparent 0%, #FFD700 50%, transparent 100%)',
                  }}
                />
              </motion.div>

              {/* Competition Name */}
              <motion.h2
                className="mt-4 text-xl md:text-2xl text-white/80 font-medium"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                style={{ textShadow: '0 2px 20px rgba(0,0,0,0.5)' }}
              >
                {competitionName}
              </motion.h2>

              {/* Award Ceremony Title */}
              <motion.div
                className="mt-3"
                initial={{ opacity: 0, scale: 0.5, rotateX: 90 }}
                animate={{ opacity: 1, scale: 1, rotateX: 0 }}
                transition={{ delay: 1, type: 'spring', stiffness: 200 }}
              >
                <span
                  className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent"
                  style={{
                    filter: 'drop-shadow(0 0 20px rgba(44,177,188,0.5))',
                  }}
                >
                  {t('competition.awardCeremony', '颁奖典礼')}
                </span>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main ceremony content */}
        <AnimatePresence>
          {showPodium && (
            <motion.div
              className="flex-1 w-full max-w-7xl flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-12 pb-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              {/* 3D Podium */}
              <motion.div
                className="flex-shrink-0"
                initial={{ opacity: 0, scale: 0.5, y: 100 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{
                  duration: 0.8,
                  type: 'spring',
                  stiffness: 100,
                  damping: 15,
                }}
              >
                <Podium3D winners={topThree} showAnimation={true} />
              </motion.div>

              {/* Other Winners List */}
              {otherWinners.length > 0 && showWinners && (
                <motion.div
                  className="w-full max-w-md space-y-3"
                  initial={{ opacity: 0, x: 100 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                >
                  <motion.h3
                    className="text-lg text-white/60 font-medium mb-4 text-center lg:text-left flex items-center gap-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    <span className="text-yellow-500">★</span>
                    {t('competition.honorableMentions', '荣誉榜')}
                    <span className="text-yellow-500">★</span>
                  </motion.h3>
                  {otherWinners.map((winner, index) => (
                    <WinnerCard
                      key={winner.participantId}
                      winner={winner}
                      index={index}
                      showAnimation={true}
                    />
                  ))}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom branding */}
        <motion.div
          className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 3 }}
        >
          <motion.div
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur-sm border border-white/10"
            animate={{ borderColor: ['rgba(255,255,255,0.1)', 'rgba(255,215,0,0.3)', 'rgba(255,255,255,0.1)'] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <span className="text-yellow-500/80 text-xs">✦</span>
            <span className="text-white/40 text-xs tracking-wider">
              Powered by Mareate
            </span>
            <span className="text-yellow-500/80 text-xs">✦</span>
          </motion.div>
        </motion.div>
      </div>

      {/* Vignette overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.7) 100%)',
        }}
      />

      {/* Film grain effect */}
      <motion.div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
        animate={{ opacity: [0.02, 0.04, 0.02] }}
        transition={{ duration: 0.1, repeat: Infinity }}
      />
    </motion.div>
  );
}
