import { motion } from 'framer-motion';

interface Winner {
  rank: number;
  name: string;
  score: number;
  avatar?: string;
}

interface Podium3DProps {
  winners: Winner[];
  showAnimation?: boolean;
}

// Podium heights for 1st, 2nd, 3rd place
const PODIUM_CONFIG = {
  1: { height: 200, color: 'from-yellow-400 via-yellow-500 to-yellow-600', delay: 0.6, zIndex: 30 },
  2: { height: 150, color: 'from-gray-300 via-gray-400 to-gray-500', delay: 0.3, zIndex: 20 },
  3: { height: 110, color: 'from-amber-600 via-amber-700 to-amber-800', delay: 0.45, zIndex: 10 },
};

// Medal colors
const MEDAL_COLORS = {
  1: { bg: 'bg-yellow-400', border: 'border-yellow-300', shadow: 'shadow-yellow-500/50', text: 'text-yellow-900' },
  2: { bg: 'bg-gray-300', border: 'border-gray-200', shadow: 'shadow-gray-400/50', text: 'text-gray-800' },
  3: { bg: 'bg-amber-600', border: 'border-amber-500', shadow: 'shadow-amber-700/50', text: 'text-amber-100' },
};

// Animated score counter
function AnimatedScore({ score, delay }: { score: number; delay: number }) {
  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: delay + 0.8 }}
    >
      <motion.span
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: delay + 0.8, type: 'spring', stiffness: 200 }}
      >
        {score}
      </motion.span>
    </motion.span>
  );
}

export function Podium3D({ winners, showAnimation = true }: Podium3DProps) {
  // Reorder winners for display: [2nd, 1st, 3rd]
  const orderedWinners = [
    winners.find(w => w.rank === 2),
    winners.find(w => w.rank === 1),
    winners.find(w => w.rank === 3),
  ].filter(Boolean) as Winner[];

  return (
    <div className="relative w-full max-w-4xl mx-auto" style={{ perspective: '1200px' }}>
      {/* Spotlight effect */}
      <motion.div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[600px] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at top, rgba(255,215,0,0.15) 0%, transparent 60%)',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 1 }}
      />

      {/* 3D Podium Container */}
      <div
        className="flex items-end justify-center gap-3 md:gap-6"
        style={{ transformStyle: 'preserve-3d' }}
      >
        {orderedWinners.map((winner) => {
          const config = PODIUM_CONFIG[winner.rank as 1 | 2 | 3];
          const medal = MEDAL_COLORS[winner.rank as 1 | 2 | 3];

          return (
            <motion.div
              key={winner.rank}
              className="flex flex-col items-center"
              style={{ zIndex: config.zIndex }}
              initial={showAnimation ? { opacity: 0, y: 100, scale: 0.8 } : false}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                duration: 0.8,
                delay: config.delay,
                ease: [0.34, 1.56, 0.64, 1],
              }}
            >
              {/* Winner Avatar & Info */}
              <motion.div
                className="mb-4 text-center"
                initial={showAnimation ? { opacity: 0, scale: 0.5, y: 50 } : false}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{
                  duration: 0.6,
                  delay: config.delay + 0.4,
                  ease: [0.34, 1.56, 0.64, 1],
                }}
              >
                {/* Crown for 1st place */}
                {winner.rank === 1 && (
                  <motion.div
                    className="text-5xl mb-2"
                    initial={{ opacity: 0, y: -30, scale: 0 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: config.delay + 0.8, type: 'spring', stiffness: 300 }}
                  >
                    <motion.span
                      animate={{
                        y: [0, -8, 0],
                        rotateZ: [0, -5, 5, 0],
                        filter: [
                          'drop-shadow(0 0 10px rgba(255,215,0,0.5))',
                          'drop-shadow(0 0 20px rgba(255,215,0,0.8))',
                          'drop-shadow(0 0 10px rgba(255,215,0,0.5))',
                        ],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                      style={{ display: 'inline-block' }}
                    >
                      👑
                    </motion.span>
                  </motion.div>
                )}

                {/* Medals for 2nd and 3rd */}
                {winner.rank === 2 && (
                  <motion.div
                    className="text-3xl mb-2"
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: config.delay + 0.6, type: 'spring' }}
                  >
                    🥈
                  </motion.div>
                )}
                {winner.rank === 3 && (
                  <motion.div
                    className="text-3xl mb-2"
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: config.delay + 0.6, type: 'spring' }}
                  >
                    🥉
                  </motion.div>
                )}

                {/* Avatar Circle */}
                <motion.div
                  className={`
                    relative w-16 h-16 md:w-24 md:h-24 rounded-full
                    ${medal.bg} ${medal.border} border-4
                    flex items-center justify-center
                    shadow-2xl ${medal.shadow}
                  `}
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  animate={winner.rank === 1 ? {
                    boxShadow: [
                      '0 0 20px rgba(255, 215, 0, 0.4), 0 0 40px rgba(255, 215, 0, 0.2)',
                      '0 0 40px rgba(255, 215, 0, 0.6), 0 0 80px rgba(255, 215, 0, 0.4)',
                      '0 0 20px rgba(255, 215, 0, 0.4), 0 0 40px rgba(255, 215, 0, 0.2)',
                    ],
                  } : undefined}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  {winner.avatar ? (
                    <img
                      src={winner.avatar}
                      alt={winner.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span className={`text-2xl md:text-4xl font-bold ${medal.text}`}>
                      {winner.name.charAt(0).toUpperCase()}
                    </span>
                  )}

                  {/* Rank Badge */}
                  <motion.div
                    className={`
                      absolute -bottom-2 -right-2 w-8 h-8 md:w-10 md:h-10 rounded-full
                      ${medal.bg} ${medal.border} border-2
                      flex items-center justify-center
                      text-sm md:text-base font-black ${medal.text}
                      shadow-lg
                    `}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: config.delay + 0.6, type: 'spring', stiffness: 300 }}
                  >
                    {winner.rank}
                  </motion.div>
                </motion.div>

                {/* Name */}
                <motion.p
                  className="mt-4 font-bold text-white text-base md:text-lg truncate max-w-28 md:max-w-36"
                  style={{ textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: config.delay + 0.7 }}
                >
                  {winner.name}
                </motion.p>

                {/* Score */}
                <motion.p
                  className="text-yellow-400 font-mono font-black text-xl md:text-2xl"
                  style={{ textShadow: '0 0 20px rgba(255, 215, 0, 0.5)' }}
                  animate={winner.rank === 1 ? {
                    scale: [1, 1.08, 1],
                    textShadow: [
                      '0 0 10px rgba(255, 215, 0, 0.5)',
                      '0 0 30px rgba(255, 215, 0, 1)',
                      '0 0 10px rgba(255, 215, 0, 0.5)',
                    ],
                  } : undefined}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <AnimatedScore score={winner.score} delay={config.delay} />
                </motion.p>
              </motion.div>

              {/* 3D Podium Block */}
              <motion.div
                className="relative"
                style={{
                  width: winner.rank === 1 ? '140px' : '110px',
                  height: config.height,
                  transformStyle: 'preserve-3d',
                  transformOrigin: 'bottom',
                }}
                initial={showAnimation ? { scaleY: 0 } : false}
                animate={{ scaleY: 1 }}
                transition={{
                  duration: 0.6,
                  delay: config.delay,
                  ease: [0.34, 1.56, 0.64, 1],
                }}
              >
                {/* Front face */}
                <div
                  className={`absolute inset-0 bg-gradient-to-b ${config.color} rounded-t-xl`}
                  style={{
                    transform: 'translateZ(35px)',
                    boxShadow: 'inset 0 2px 30px rgba(255,255,255,0.3), inset 0 -10px 30px rgba(0,0,0,0.2)',
                  }}
                >
                  {/* Rank number on podium */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <motion.span
                      className="text-6xl md:text-7xl font-black"
                      style={{
                        color: winner.rank === 1 ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.15)',
                        textShadow: '0 2px 4px rgba(0,0,0,0.1)',
                      }}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: config.delay + 0.3, type: 'spring' }}
                    >
                      {winner.rank}
                    </motion.span>
                  </div>

                  {/* Shimmer effect for 1st place */}
                  {winner.rank === 1 && (
                    <motion.div
                      className="absolute inset-0 rounded-t-xl overflow-hidden"
                      style={{
                        background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.4) 45%, rgba(255,255,255,0.4) 50%, transparent 55%)',
                        backgroundSize: '200% 100%',
                      }}
                      animate={{
                        backgroundPosition: ['200% 0%', '-200% 0%'],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        repeatDelay: 2,
                        ease: 'linear',
                      }}
                    />
                  )}
                </div>

                {/* Top face */}
                <div
                  className={`absolute w-full h-[70px] bg-gradient-to-b ${config.color}`}
                  style={{
                    transform: 'rotateX(90deg) translateZ(-35px)',
                    transformOrigin: 'top',
                    filter: 'brightness(1.3)',
                  }}
                />

                {/* Left face */}
                <div
                  className={`absolute h-full w-[70px] bg-gradient-to-b ${config.color}`}
                  style={{
                    transform: 'rotateY(-90deg) translateZ(35px)',
                    transformOrigin: 'left',
                    filter: 'brightness(0.65)',
                  }}
                />

                {/* Right face */}
                <div
                  className={`absolute h-full w-[70px] right-0 bg-gradient-to-b ${config.color}`}
                  style={{
                    transform: 'rotateY(90deg) translateZ(35px)',
                    transformOrigin: 'right',
                    filter: 'brightness(0.85)',
                  }}
                />

                {/* Glow effect for 1st place */}
                {winner.rank === 1 && (
                  <motion.div
                    className="absolute inset-0 rounded-t-xl"
                    style={{
                      background: 'radial-gradient(circle at 50% 0%, rgba(255,215,0,0.5) 0%, transparent 60%)',
                      transform: 'translateZ(36px)',
                    }}
                    animate={{
                      opacity: [0.4, 0.8, 0.4],
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
              </motion.div>
            </motion.div>
          );
        })}
      </div>

      {/* Base platform with 3D effect */}
      <motion.div
        className="mt-6 relative mx-auto"
        style={{
          width: '95%',
          height: '20px',
          transformStyle: 'preserve-3d',
        }}
        initial={showAnimation ? { scaleX: 0, opacity: 0 } : false}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        {/* Top of base */}
        <div
          className="absolute inset-0 bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 rounded-lg"
          style={{
            transform: 'translateZ(10px)',
            boxShadow: '0 10px 50px rgba(0,0,0,0.6)',
          }}
        />
        {/* Front of base */}
        <div
          className="absolute inset-x-0 bottom-0 h-[20px] bg-gradient-to-b from-gray-600 to-gray-800 rounded-b-lg"
          style={{
            transform: 'rotateX(-90deg) translateZ(10px)',
            transformOrigin: 'bottom',
          }}
        />
      </motion.div>
    </div>
  );
}
