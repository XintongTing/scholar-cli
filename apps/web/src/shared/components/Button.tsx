import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '../utils/cn';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-colors rounded-md',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          {
            'bg-primary text-white hover:bg-primary-hover': variant === 'primary',
            'bg-white border border-border text-text-primary hover:bg-bg-muted': variant === 'secondary',
            'hover:bg-bg-muted text-text-primary': variant === 'ghost',
            'bg-danger text-white hover:bg-red-700': variant === 'danger',
          },
          {
            'h-7 px-3 text-sm': size === 'sm',
            'h-9 px-4 text-base': size === 'md',
            'h-10 px-6 text-base': size === 'lg',
          },
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
