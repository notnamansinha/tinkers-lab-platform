import type { Config } from 'tailwindcss'

const config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: '',
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      fontFamily: {
        // Apple HIG system stack — SF Pro on Apple, Inter elsewhere
        sans:    ['-apple-system', 'SF Pro Text', 'SF Pro Display', 'Inter', 'Segoe UI', 'sans-serif'],
        display: ['-apple-system', 'SF Pro Display', 'Inter', 'Segoe UI', 'sans-serif'],
        mono:    ['ui-monospace', 'SF Mono', 'JetBrains Mono', 'Courier New', 'monospace'],
      },

      colors: {
        // ── New design-system tokens ──────────────────────────────
        canvas:  '#08090B',   // app background
        surface: '#141518',   // flat card container

        'accent-blue': '#0A84FF', // Apple dark-mode blue — flat Accent

        // Status dots (flat, functional only — no gradient)
        'status-green':  '#34C759',
        'status-orange': '#FF9500',
        'status-red':    '#FF3B30',
        'status-grey':   '#8E8E93',

        // Legacy tokens kept so existing components don't break
        graphite: '#08090B',
        steel:    '#141518',
        hairline: 'rgba(255,255,255,0.10)',
        chalk:    '#F5F5F7',
        hazard:   '#FF9500',

        'signal-green': '#34C759',
        'signal-amber': '#FF9500',
        'signal-red':   '#FF3B30',
        'signal-grey':  '#8E8E93',

        // ── shadcn/ui CSS-var tokens ──────────────────────────────
        border:     'hsl(var(--border))',
        input:      'hsl(var(--input))',
        ring:       'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT:    'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT:    'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT:    'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT:    'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT:    'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT:    'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT:    'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },

      borderRadius: {
        tile: '32px',
        card: '24px',
        lg:   'var(--radius)',
        md:   'calc(var(--radius) - 2px)',
        sm:   'calc(var(--radius) - 4px)',
      },

      keyframes: {
        'status-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%':       { opacity: '0.35' },
        },
        'accordion-down': {
          from: { height: '0' },
          to:   { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to:   { height: '0' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-slow': {
          '0%, 100%': { opacity: '1' },
          '50%':       { opacity: '0.4' },
        },
      },

      animation: {
        'status-pulse':    'status-pulse 2s ease-in-out infinite',
        'accordion-down':  'accordion-down 0.2s ease-out',
        'accordion-up':    'accordion-up 0.2s ease-out',
        'fade-in':         'fade-in 0.35s cubic-bezier(0.32,0.72,0,1) both',
        'pulse-slow':      'pulse-slow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },

      transitionTimingFunction: {
        spring: 'cubic-bezier(0.32, 0.72, 0, 1)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config

export default config
