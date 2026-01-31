import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface BeeIconProps {
  className?: string;
  animate?: boolean;
}

export function BeeIcon({ className, animate = true }: BeeIconProps) {
  return (
    <motion.div
      className={cn("relative", className)}
      whileHover={animate ? { scale: 1.1 } : undefined}
      transition={{ type: "spring", stiffness: 400, damping: 10 }}
    >
      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Glow filter */}
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <linearGradient id="bodyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(66, 100%, 50%)" />
            <stop offset="100%" stopColor="hsl(66, 100%, 40%)" />
          </linearGradient>
        </defs>

        {/* Antenne */}
        <motion.path
          d="M24 18 Q20 10 16 8"
          stroke="hsl(66, 100%, 50%)"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
          animate={animate ? { 
            d: ["M24 18 Q20 10 16 8", "M24 18 Q20 10 14 9", "M24 18 Q20 10 16 8"]
          } : undefined}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.path
          d="M40 18 Q44 10 48 8"
          stroke="hsl(66, 100%, 50%)"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
          animate={animate ? { 
            d: ["M40 18 Q44 10 48 8", "M40 18 Q44 10 50 9", "M40 18 Q44 10 48 8"]
          } : undefined}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
        />
        
        {/* Pallini antenne */}
        <circle cx="16" cy="8" r="3" fill="hsl(66, 100%, 50%)" />
        <circle cx="48" cy="8" r="3" fill="hsl(66, 100%, 50%)" />

        {/* Ali sinistra */}
        <motion.ellipse
          cx="18"
          cy="32"
          rx="12"
          ry="8"
          fill="hsl(66, 100%, 50%)"
          fillOpacity="0.2"
          stroke="hsl(66, 100%, 50%)"
          strokeWidth="1.5"
          filter="url(#glow)"
          animate={animate ? { 
            ry: [8, 10, 8],
            opacity: [0.8, 1, 0.8]
          } : undefined}
          transition={{ duration: 0.3, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Ali destra */}
        <motion.ellipse
          cx="46"
          cy="32"
          rx="12"
          ry="8"
          fill="hsl(66, 100%, 50%)"
          fillOpacity="0.2"
          stroke="hsl(66, 100%, 50%)"
          strokeWidth="1.5"
          filter="url(#glow)"
          animate={animate ? { 
            ry: [8, 10, 8],
            opacity: [0.8, 1, 0.8]
          } : undefined}
          transition={{ duration: 0.3, repeat: Infinity, ease: "easeInOut", delay: 0.1 }}
        />

        {/* Corpo principale */}
        <ellipse
          cx="32"
          cy="36"
          rx="14"
          ry="18"
          fill="url(#bodyGradient)"
        />

        {/* Strisce nere */}
        <path
          d="M20 30 Q32 28 44 30"
          stroke="black"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M19 38 Q32 36 45 38"
          stroke="black"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M21 46 Q32 44 43 46"
          stroke="black"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />

        {/* Testa */}
        <circle
          cx="32"
          cy="20"
          r="8"
          fill="hsl(66, 100%, 50%)"
        />

        {/* Occhi */}
        <circle cx="28" cy="19" r="2.5" fill="black" />
        <circle cx="36" cy="19" r="2.5" fill="black" />
        
        {/* Riflessi occhi */}
        <circle cx="29" cy="18" r="0.8" fill="white" />
        <circle cx="37" cy="18" r="0.8" fill="white" />

        {/* Sorriso */}
        <path
          d="M29 23 Q32 26 35 23"
          stroke="black"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    </motion.div>
  );
}

export default BeeIcon;
