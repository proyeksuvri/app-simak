/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // === SURFACE HIERARCHY (No-Line Rule) ===
        'surface':                    '#f7f9fb',
        'surface-bright':             '#f7f9fb',
        'surface-container-lowest':   '#ffffff',
        'surface-container-low':      '#f2f4f6',
        'surface-container':          '#eceef0',
        'surface-container-high':     '#e6e8ea',
        'surface-container-highest':  '#e0e3e5',
        'surface-dim':                '#d8dadc',
        'surface-variant':            '#e0e3e5',
        'surface-tint':               '#046b5e',

        // === PRIMARY — Emerald UIN Palopo ===
        'primary':                    '#004f45',
        'primary-container':          '#00695c',
        'primary-fixed':              '#a0f2e1',
        'primary-fixed-dim':          '#84d5c5',
        'on-primary':                 '#ffffff',
        'on-primary-container':       '#94e5d5',
        'on-primary-fixed':           '#00201b',
        'on-primary-fixed-variant':   '#005046',
        'inverse-primary':            '#84d5c5',

        // === SECONDARY — Slate ===
        'secondary':                  '#515f74',
        'secondary-container':        '#d5e3fc',
        'on-secondary':               '#ffffff',
        'on-secondary-container':     '#57657a',

        // === TERTIARY ===
        'tertiary':                   '#3b4559',
        'tertiary-container':         '#525d71',
        'on-tertiary':                '#ffffff',
        'on-tertiary-container':      '#cbd6ee',

        // === ON-SURFACE ===
        'on-surface':                 '#191c1e',
        'on-surface-variant':         '#3e4946',
        'background':                 '#f7f9fb',
        'on-background':              '#191c1e',

        // === ERROR ===
        'error':                      '#ba1a1a',
        'error-container':            '#ffdad6',
        'on-error':                   '#ffffff',
        'on-error-container':         '#93000a',

        // === OUTLINE ===
        'outline':                    '#6e7976',
        'outline-variant':            '#bec9c5',

        // === INVERSE ===
        'inverse-surface':            '#2d3133',
        'inverse-on-surface':         '#eff1f3',
        'inverse-primary':            '#84d5c5',
      },

      fontFamily: {
        sans:     ['Public Sans', 'system-ui', 'sans-serif'],
        headline: ['Public Sans', 'system-ui', 'sans-serif'],
        body:     ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        data:     ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },

      borderRadius: {
        'sm':    '0.125rem',
        DEFAULT: '0.25rem',
        'md':    '0.375rem',
        'lg':    '0.5rem',
        'xl':    '0.75rem',
        '2xl':   '1rem',
        'full':  '9999px',
      },

      boxShadow: {
        'card':    '0 4px 16px 0 rgba(0, 79, 69, 0.06)',
        'float':   '0 8px 32px 0 rgba(0, 79, 69, 0.08)',
        'popover': '0 16px 40px 0 rgba(0, 79, 69, 0.10)',
        'lifted':  '0 12px 40px 0 rgba(0, 79, 69, 0.14), 0 2px 8px 0 rgba(0, 79, 69, 0.06)',
      },

      backgroundImage: {
        'emerald-gradient': 'linear-gradient(135deg, #004f45 0%, #00695c 100%)',
      },

      letterSpacing: {
        'financial': '0.02em',
        'label':     '0.05em',
      },

      keyframes: {
        'fade-up': {
          '0%':   { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(186, 26, 26, 0)' },
          '50%':      { boxShadow: '0 0 0 6px rgba(186, 26, 26, 0.18)' },
        },
        'glow-drift': {
          '0%, 100%': { opacity: '0.55', transform: 'scale(1)' },
          '50%':      { opacity: '0.75', transform: 'scale(1.08)' },
        },
      },
      animation: {
        'fade-up':    'fade-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) both',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'glow-drift': 'glow-drift 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
