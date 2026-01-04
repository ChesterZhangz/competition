import { motion } from 'framer-motion';

interface Winner {
  rank: number;
  name: string;
  score: number;
  avatar?: string;
  teamName?: string;
}

interface WinnerCardProps {
  winner: Winner;
  index: number;
  showAnimation?: boolean;
}

// Medal icons for different ranks
const MEDAL_ICONS = {
  1: '🥇',
  2: '🥈',
  3: '🥉',
};

// Rank colors with gradients
const RANK_STYLES = {
  1: {
    gradient: 'from-yellow-400 via-amber-400 to-yellow-500',
    glow: 'shadow-yellow-500/50',
    border: 'border-yellow-400/50',
    text: 'text-yellow-400',
  },
  2: {
    gradient: 'from-gray-300 via-slate-300 to-gray-400',
    glow: 'shadow-gray-400/50',
    border: 'border-gray-400/50',
    text: 'text-gray-300',
  },
  3: {
    gradient: 'from-amber-600 via-orange-600 to-amber-700',
    glow: 'shadow-amber-600/50',
    border: 'border-amber-600/50',
    text: 'text-amber-500',
  },
};

export function WinnerCard({ winner, index, showAnimation = true }: WinnerCardProps) {
  const isTopThree = winner.rank <= 3;
  const style = isTopThree ? RANK_STYLES[winner.rank as 1 | 2 | 3] : null;
  const medal = isTopThree ? MEDAL_ICONS[winner.rank as 1 | 2 | 3] : null;

  return (
    <motion.div
      className={`
        relative flex items-center gap-4 p-4 rounded-2xl
        backdrop-blur-xl
        ${isTopThree
          ? `bg-gradient-to-r ${style?.gradient} bg-opacity-10 border-2 ${style?.border} shadow-xl ${style?.glow}`
          : 'bg-white/5 border border-white/10'
        }
      `}
      initial={showAnimation ? { opacity: 0, x: -100, scale: 0.8 } : false}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{
        duration: 0.6,
        delay: index * 0.15,
        type: 'spring',
        stiffness: 100,
        damping: 15,
      }}
      whileHover={{
        scale: 1.02,
        boxShadow: isTopThree
          ? '0 0 40px rgba(255, 215, 0, 0.3)'
          : '0 0 20px rgba(255, 255, 255, 0.1)',
      }}
    >
      {/* Rank Badge */}
      <motion.div
        className={`
          flex-shrink-0 w-12 h-12 rounded-full
          flex items-center justify-center
          font-black text-xl
          ${isTopThree
            ? `bg-gradient-to-br ${style?.gradient} text-black`
            : 'bg-white/10 text-white/70'
          }
        `}
        animate={winner.rank === 1 ? {
          scale: [1, 1.1, 1],
          rotate: [0, 5, -5, 0],
        } : undefined}
        transition={{ duration: 2, repeat: Infinity }}
      >
        {isTopThree ? medal : winner.rank}
      </motion.div>

      {/* Avatar */}
      <motion.div
        className={`
          relative flex-shrink-0 w-14 h-14 rounded-full
          overflow-hidden
          ${isTopThree
            ? `border-2 ${style?.border}`
            : 'border border-white/20'
          }
        `}
        whileHover={{ scale: 1.1 }}
      >
        {winner.avatar ? (
          <img
            src={winner.avatar}
            alt={winner.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className={`
            w-full h-full flex items-center justify-center
            bg-gradient-to-br from-cyan-500 to-blue-600
            text-white font-bold text-xl
          `}>
            {winner.name.charAt(0).toUpperCase()}
          </div>
        )}

        {/* Glow effect for top 3 */}
        {isTopThree && (
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: `radial-gradient(circle, rgba(255,215,0,0.3) 0%, transparent 70%)`,
            }}
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
      </motion.div>

      {/* Info */}
      <div className="flex-grow min-w-0">
        <motion.h3
          className={`
            font-bold text-lg truncate
            ${isTopThree ? style?.text : 'text-white/90'}
          `}
          style={{
            textShadow: isTopThree ? '0 0 20px currentColor' : 'none',
          }}
        >
          {winner.name}
        </motion.h3>
        {winner.teamName && (
          <p className="text-sm text-white/50 truncate">{winner.teamName}</p>
        )}
      </div>

      {/* Score */}
      <motion.div
        className={`
          flex-shrink-0 font-mono font-bold text-2xl
          ${isTopThree ? style?.text : 'text-white/70'}
        `}
        animate={winner.rank === 1 ? {
          scale: [1, 1.05, 1],
          textShadow: [
            '0 0 10px rgba(255,215,0,0.5)',
            '0 0 30px rgba(255,215,0,0.8)',
            '0 0 10px rgba(255,215,0,0.5)',
          ],
        } : undefined}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        {winner.score}
      </motion.div>

      {/* Sparkles for 1st place */}
      {winner.rank === 1 && (
        <>
          {[...Array(4)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute text-yellow-400 text-sm"
              style={{
                top: `${20 + Math.random() * 60}%`,
                left: `${10 + Math.random() * 80}%`,
              }}
              animate={{
                opacity: [0, 1, 0],
                scale: [0, 1, 0],
                y: [0, -20, -40],
              }}
              transition={{
                duration: 2,
                delay: i * 0.5,
                repeat: Infinity,
              }}
            >
              ✨
            </motion.div>
          ))}
        </>
      )}
    </motion.div>
  );
}
