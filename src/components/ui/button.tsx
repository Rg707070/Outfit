'use client'
import { cn } from '@/lib/utils'
import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'brand'
  size?: 'sm' | 'md' | 'lg'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]',
          {
            'bg-stone-900 text-white hover:bg-stone-800 active:bg-stone-950 shadow-[0_2px_10px_-2px_rgba(28,15,10,0.18)] hover:shadow-[0_4px_20px_-4px_rgba(28,15,10,0.22)] focus:ring-stone-900': variant === 'primary',
            'bg-white text-stone-900 border border-stone-200 hover:border-stone-300 hover:bg-stone-50 shadow-[0_1px_4px_-1px_rgba(28,15,10,0.07)] hover:shadow-[0_4px_16px_-4px_rgba(28,15,10,0.10)] focus:ring-stone-300': variant === 'secondary',
            'text-stone-600 hover:bg-rose-50/60 hover:text-stone-900 focus:ring-stone-300': variant === 'ghost',
            'bg-red-500 text-white hover:bg-red-600 shadow-sm hover:shadow-red-200/50 focus:ring-red-500': variant === 'danger',
            'bg-gradient-to-r from-rose-500 to-pink-500 text-white hover:from-rose-600 hover:to-pink-600 shadow-[0_4px_20px_-4px_rgba(244,63,94,0.35)] hover:shadow-[0_6px_24px_-4px_rgba(244,63,94,0.45)] focus:ring-rose-400': variant === 'brand',
          },
          {
            'px-3 py-1.5 text-sm gap-1.5': size === 'sm',
            'px-4 py-2 text-sm gap-2': size === 'md',
            'px-6 py-3 text-base gap-2': size === 'lg',
          },
          className
        )}
        {...props}
      >
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
