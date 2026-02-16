'use client'

import React, { useEffect } from 'react';
import { motion } from 'motion/react';

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

  // Fire onComplete after all child animations finish (~1.7s)
  // delayChildren(0.1) + staggerChildren(0.2) * 4 children + path duration(0.8)
  useEffect(() => {
    if (!repeat && onComplete) {
      const timer = setTimeout(onComplete, 1700)
      return () => clearTimeout(timer)
    }
  }, [repeat, onComplete])

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.1
      }
    }
  };

  const pathVariants = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: {
      pathLength: 1,
      opacity: 1,
      transition: {
        duration: 0.8,
        ease: "easeInOut" as const,
        repeat: repeat ? Infinity : 0,
        repeatType: "reverse" as const,
        repeatDelay: 1
      }
    }
  };

  const dotVariants = {
    hidden: { scale: 0, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        type: "spring" as const,
        stiffness: 260,
        damping: 20,
        repeat: repeat ? Infinity : 0,
        repeatType: "reverse" as const,
        repeatDelay: 1
      }
    }
  };

  return (
    <motion.div
      className={`inline-flex items-center justify-center ${className}`}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
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
