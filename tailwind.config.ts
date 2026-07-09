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
        // Brand/display: Fredoka ExtraBold for wordmark and large headlines
        brand:   ['Fredoka', 'PP Mori', 'Arial Black', 'sans-serif'],
        // Body/labels: Inter for all UI text, inputs, numbers, helper text
        sans:    ['Inter', 'PP Mori', 'Arial', 'sans-serif'],
        // Legacy display fallback
        display: ['PP Mori', 'Arial Black', 'Arial', 'sans-serif'],
        mono:    ['ui-monospace', 'SF Mono', 'JetBrains Mono', 'Courier New', 'monospace'],
      },

      colors: {
        // ── FigJam Palette Tokens ──────────────────────────────
        black: '#000000',
        'near-black': '#101010',
        charcoal: '#191919',
        pink: '#EC68D8',
        indigo: '#514AF1',
        'electric-blue': '#4C48F2',
        lime: '#DDF237',
        orange: '#FFB13F',
        cream: '#FFF4BE',
        sand: '#A9957A',
        beige: '#E1D7A8',
        'modal-blue': '#5A53F4',
        'track-purple': '#746EF8',
        white: '#FFFFFF',

        // Legacy compatibility
        canvas:  '#08090B',
        surface: '#141518',
        'accent-blue': '#0A84FF',
        graphite: '#08090B',
        steel:    '#141518',
        hairline: 'rgba(255,255,255,0.10)',
        chalk:    '#F5F5F7',
        hazard:   '#FF9500',
        'signal-green': '#34C759',
        'signal-amber': '#FF9500',
        'signal-red':   '#FF3B30',
        'signal-grey':  '#8E8E93',

        // Status dots
        'status-green':  '#DDF237', // lime for available/success
        'status-orange': '#FFB13F', // orange for pending/warning
        'status-red':    '#EC68D8', // pink for destructive/attention
        'status-grey':   '#191919', // charcoal for disabled

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
        panel: '12px',
        chip:  '999px',
        lg:   'var(--radius)',
        md:   'calc(var(--radius) - 2px)',
        sm:   'calc(var(--radius) - 4px)',
      },

      // 8px grid spacing tokens: 1u = 8px, 2u = 16px, etc.
      spacing: {
        '1u': '8px',
        '2u': '16px',
        '3u': '24px',
        '4u': '32px',
        '5u': '40px',
        '6u': '48px',
        '7u': '56px',
        '8u': '64px',
        '10u': '80px',
        '11u': '88px',
        '12u': '96px',
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
