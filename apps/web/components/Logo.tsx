import React from 'react'

interface LogoProps {
  className?: string
  variant?: 'full' | 'icon' | 'stacked'
  color?: 'primary' | 'white' | 'dark'
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizeClasses: Record<string, string> = {
  sm: 'h-6 text-xl',
  md: 'h-8 text-2xl',
  lg: 'h-12 text-4xl',
  xl: 'h-20 text-6xl',
}

const iconSizes: Record<string, string> = {
  sm: '24',
  md: '32',
  lg: '48',
  xl: '80',
}

const colors = {
  primary: {
    text: 'text-[#312E81]',
    accent: 'text-[#FB7185]',
    icon: 'fill-[#FB7185]',
  },
  white: {
    text: 'text-white',
    accent: 'text-[#FB7185]',
    icon: 'fill-[#FB7185]',
  },
  dark: {
    text: 'text-[#1E1B4B]',
    accent: 'text-[#312E81]',
    icon: 'fill-[#312E81]',
  },
}

export function Logo({
  className = '',
  variant = 'full',
  color = 'primary',
  size = 'md',
}: LogoProps) {
  const activeColor = colors[color]

  const Icon = () => (
    <svg
      width={iconSizes[size]}
      height={iconSizes[size]}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="inline-block flex-shrink-0"
    >
      <path
        d="M12 8V32"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        className={activeColor.text}
      />
      <path
        d="M28 8C28 8 18 14 18 20C18 26 28 32 28 32"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        className={activeColor.accent}
      />
      <circle cx="12" cy="8" r="3" className={`${activeColor.icon} ${activeColor.accent}`} />
      <circle cx="28" cy="8" r="3" className={`${activeColor.icon} ${activeColor.accent}`} />
      <circle cx="28" cy="32" r="3" className={`${activeColor.icon} ${activeColor.accent}`} />
    </svg>
  )

  if (variant === 'icon') return <Icon />

  if (variant === 'stacked') {
    return (
      <div className={`flex flex-col items-center font-bold tracking-tight ${sizeClasses[size]} ${activeColor.text} ${className}`}>
        <Icon />
        <div className="mt-2">
          <span>Kin</span>
          <span className={activeColor.accent}>nect</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-2 font-bold tracking-tight ${sizeClasses[size]} ${activeColor.text} ${className}`}>
      <Icon />
      <div>
        <span>Kin</span>
        <span className={activeColor.accent}>nect</span>
      </div>
    </div>
  )
}
