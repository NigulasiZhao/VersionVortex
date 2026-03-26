'use client'

import { FC } from 'react'
import { ArrowRight, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: any[]) { return twMerge(clsx(inputs)) }

interface MotionButtonProps {
  label: string
  to: string
  variant?: 'primary' | 'secondary'
  classes?: string
}

const MotionButton: FC<MotionButtonProps> = ({ label, to, variant = 'secondary', classes }) => {
  const isPrimary = variant === 'primary'

  return (
    <Link
      to={to}
      className={cn(
        'group relative flex items-center h-8 px-3 cursor-pointer rounded-full no-underline outline-none overflow-hidden transition-all duration-300',
        classes
      )}
      style={{
        background: isPrimary ? 'linear-gradient(135deg, #6C3FF5 0%, #8B5CF6 100%)' : 'rgba(108, 63, 245, 0.08)',
        border: isPrimary ? 'none' : '1px solid rgba(108, 63, 245, 0.2)',
      }}
    >
      <span
        className='absolute inset-0 w-0 rounded-full transition-all duration-500 group-hover:w-full'
        style={{
          background: isPrimary ? 'transparent' : 'rgba(108, 63, 245, 0.15)',
          left: 0,
        }}
      />
      <span
        className={cn(
          'relative z-10 flex items-center gap-1.5 text-xs font-medium transition-colors duration-300',
          isPrimary ? 'text-white' : 'text-[#6C3FF5]'
        )}
      >
        {isPrimary ? <ArrowLeft className="size-3" /> : <ArrowRight className="size-3" />}
        {label}
      </span>
    </Link>
  )
}

export default MotionButton
