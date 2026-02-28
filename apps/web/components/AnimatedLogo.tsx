'use client'

import React, { useEffect } from 'react';
import { motion, useAnimationControls } from 'motion/react';

interface AnimatedLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'white' | 'dark';
  className?: string;
  repeat?: boolean;
  onComplete?: () => void;
}

export const AnimatedLogo: React.FC<AnimatedLogoProps> = ({
  size = 'md',
  color = 'primary',
  className = '',
  repeat = true,
  onComplete,
}) => {
  const iconSizes = {
    sm: '24',
    md: '32',
    lg: '64',
    xl: '120',
  };

  const colors = {
    primary: {
      text: '#312E81',
      accent: '#FB7185',
    },
    white: {
      text: '#FFFFFF',
      accent: '#FB7185',
    },
    dark: {
      text: '#1E1B4B',
      accent: '#312E81',
    }
  };

  const activeColor = colors[color];
  const controls = useAnimationControls();

  // Orchestrate the full loop manually so stagger fires correctly on every
  // cycle — both draw-in and draw-out — instead of each element looping
  // independently and falling out of sync.
  useEffect(() => {
    let active = true;
    // Durations derived from variant config:
    // draw-in:  delayChildren(0.1) + stagger(0.2)*4 + path duration(0.8) ≈ 1.7s
    // draw-out: stagger(0.1)*4 + path duration(0.8) ≈ 1.2s
    const DRAW_IN_MS = 1800;
    const HOLD_MS = 1000;
    const DRAW_OUT_MS = 1300;
    const PAUSE_MS = 400;

    async function runLoop() {
      controls.set('hidden');
      controls.start('visible'); // fire but don't await — resolves immediately on container

      await new Promise(r => setTimeout(r, DRAW_IN_MS));

      if (!repeat) {
        await new Promise(r => setTimeout(r, HOLD_MS));
        if (!active) return;
        controls.start('hidden');
        await new Promise(r => setTimeout(r, DRAW_OUT_MS));
        if (active) onComplete?.();
        return;
      }

      while (active) {
        await new Promise(r => setTimeout(r, HOLD_MS));
        if (!active) break;
        controls.start('hidden');
        await new Promise(r => setTimeout(r, DRAW_OUT_MS));
        if (!active) break;
        await new Promise(r => setTimeout(r, PAUSE_MS));
        if (!active) break;
        controls.start('visible');
        await new Promise(r => setTimeout(r, DRAW_IN_MS));
      }
    }

    runLoop();
    return () => { active = false; };
  }, [repeat, onComplete]);

  const containerVariants = {
    hidden: {
      transition: {
        staggerChildren: 0.1,
      }
    },
    visible: {
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.1,
      }
    }
  };

  const pathVariants = {
    hidden: {
      pathLength: 0,
      opacity: 0,
      transition: {
        duration: 0.8,
        ease: "easeInOut" as const,
      }
    },
    visible: {
      pathLength: 1,
      opacity: 1,
      transition: {
        duration: 0.8,
        ease: "easeInOut" as const,
      }
    }
  };

  const dotVariants = {
    hidden: {
      scale: 0,
      opacity: 0,
      transition: {
        duration: 0.3,
      }
    },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        type: "spring" as const,
        stiffness: 260,
        damping: 20,
      }
    }
  };

  return (
    <motion.div
      className={`inline-flex items-center justify-center ${className}`}
      variants={containerVariants}
      initial="hidden"
      animate={controls}
    >
      <svg
        width={iconSizes[size]}
        height={iconSizes[size]}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <motion.path
          d="M12 8V32"
          stroke={activeColor.text}
          strokeWidth="4"
          strokeLinecap="round"
          variants={pathVariants}
        />
        <motion.path
          d="M28 8C28 8 18 14 18 20C18 26 28 32 28 32"
          stroke={activeColor.accent}
          strokeWidth="4"
          strokeLinecap="round"
          variants={pathVariants}
        />

        <motion.circle
          cx="12"
          cy="8"
          r="3"
          fill={activeColor.accent}
          variants={dotVariants}
        />
        <motion.circle
          cx="28"
          cy="8"
          r="3"
          fill={activeColor.accent}
          variants={dotVariants}
        />
        <motion.circle
          cx="28"
          cy="32"
          r="3"
          fill={activeColor.accent}
          variants={dotVariants}
        />
      </svg>
    </motion.div>
  );
};
