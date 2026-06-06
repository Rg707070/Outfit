import { cn } from '@/lib/utils'
import { HTMLAttributes } from 'react'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'success' | 'warning'
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        {
          'bg-black text-white': variant === 'default',
          'bg-gray-100 text-gray-700': variant === 'secondary',
          'bg-green-100 text-green-700': variant === 'success',
          'bg-yellow-100 text-yellow-700': variant === 'warning',
        },
        className
      )}
      {...props}
    />
  )
}
