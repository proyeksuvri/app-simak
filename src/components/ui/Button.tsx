import type { ReactNode, ButtonHTMLAttributes } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'
type ButtonSize    = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:  ButtonVariant
  size?:     ButtonSize
  children:  ReactNode
  icon?:     string   // Material Symbols name
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:   'bg-primary text-on-primary hover:bg-primary-container active:bg-primary-container',
  secondary: 'bg-surface-container text-on-surface hover:bg-surface-container-high active:bg-surface-container-high',
  ghost:     'bg-transparent text-primary hover:bg-primary-fixed/20 active:bg-primary-fixed/30',
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-6 py-3 text-base gap-2',
}

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  icon,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      className={[
        'inline-flex items-center justify-center font-medium font-body rounded-xl',
        'transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed',
        variantStyles[variant],
        sizeStyles[size],
        className,
      ].join(' ')}
      {...props}
    >
      {icon && (
        <span className="material-symbols-outlined" style={{ fontSize: size === 'lg' ? '1.25rem' : '1rem' }}>
          {icon}
        </span>
      )}
      {children}
    </button>
  )
}
