import { cn } from '@/lib/utils'
import { InputHTMLAttributes, forwardRef } from 'react'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'w-full rounded-xl border border-stone-200 bg-stone-50/50 hover:bg-white focus:bg-white px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900/20 focus:border-stone-400 hover:border-stone-300 transition-all duration-200',
        className
      )}
      {...props}
    />
  )
)
Input.displayName = 'Input'
