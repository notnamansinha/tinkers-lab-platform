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
        brand:   ['Outfit', 'Inter', 'Arial Black', 'sans-serif'],
        sans:    ['Outfit', 'Inter', 'Arial', 'sans-serif'],
        display: ['Outfit', 'Inter', 'Arial Black', 'sans-serif'],
        mono:    ['ui-monospace', 'SF Mono', 'JetBrains Mono', 'Courier New', 'monospace'],
      },

      colors: {
        // ── FigJam Palette Tokens ──────────────────────────────
        black: 'rgb(var(--color-ink-rgb) / <alpha-value>)',
        'near-black': 'rgb(var(--color-surface-dark-rgb) / <alpha-value>)',
        charcoal: 'rgb(var(--color-surface-dark-alt-rgb) / <alpha-value>)',
        pink: 'rgb(var(--color-accent-pink-rgb) / <alpha-value>)',
        'pink-deep': 'rgb(var(--color-accent-pink-deep-rgb) / <alpha-value>)',
        indigo: 'rgb(var(--color-brand-indigo-rgb) / <alpha-value>)',
        'indigo-light': 'rgb(var(--color-brand-indigo-light-rgb) / <alpha-value>)',
        'electric-blue': 'rgb(var(--color-brand-indigo-rgb) / <alpha-value>)',
        lime: 'rgb(var(--color-accent-lime-rgb) / <alpha-value>)',
        orange: 'rgb(var(--color-accent-orange-rgb) / <alpha-value>)',
        cream: 'rgb(var(--color-cream-rgb) / <alpha-value>)',
        sand: 'rgb(var(--color-tan-rgb) / <alpha-value>)',
        beige: 'rgb(var(--color-chart-muted-rgb) / <alpha-value>)',
        'modal-blue': 'rgb(var(--color-brand-indigo-rgb) / <alpha-value>)',
        'track-purple': 'rgb(var(--color-brand-indigo-light-rgb) / <alpha-value>)',
        white: 'rgb(var(--color-paper-rgb) / <alpha-value>)',

        // Legacy compatibility
        canvas: 'rgb(var(--color-ink-rgb) / <alpha-value>)',
        surface: 'rgb(var(--color-surface-dark-rgb) / <alpha-value>)',
        'accent-blue': 'rgb(var(--color-brand-indigo-rgb) / <alpha-value>)',
        graphite: 'rgb(var(--color-ink-rgb) / <alpha-value>)',
        steel: 'rgb(var(--color-surface-dark-alt-rgb) / <alpha-value>)',
        hairline: 'rgb(var(--color-line-dark-rgb) / <alpha-value>)',
        chalk: 'rgb(var(--color-paper-rgb) / <alpha-value>)',
        hazard: 'rgb(var(--color-accent-orange-rgb) / <alpha-value>)',
        'signal-green': 'rgb(var(--color-accent-lime-rgb) / <alpha-value>)',
        'signal-amber': 'rgb(var(--color-accent-orange-rgb) / <alpha-value>)',
        'signal-red': 'rgb(var(--color-accent-pink-deep-rgb) / <alpha-value>)',
        'signal-grey': 'rgb(var(--color-neutral-mid-rgb) / <alpha-value>)',

        // Status dots
        'status-green': 'rgb(var(--color-accent-lime-rgb) / <alpha-value>)',
        'status-orange': 'rgb(var(--color-accent-orange-rgb) / <alpha-value>)',
        'status-red': 'rgb(var(--color-accent-pink-rgb) / <alpha-value>)',
        'status-grey': 'rgb(var(--color-surface-dark-alt-rgb) / <alpha-value>)',

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
        tile: 'var(--radius-lg)',
        card: 'var(--radius-lg)',
        panel: 'var(--radius-md)',
        chip: 'var(--radius-full)',
        lg:   'var(--radius)',
        md:   'var(--radius-md)',
        sm:   'var(--radius-sm)',
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

      fontSize: {
        'hero': ['clamp(64px, 5vw, 72px)', { lineHeight: '1', fontWeight: '900' }],
        'onboarding': ['clamp(40px, 4vw, 56px)', { lineHeight: '1.1', fontWeight: '800' }],
        'empty-state': ['32px', { lineHeight: '1.2', fontWeight: '700' }],
        'dashboard-title': ['28px', { lineHeight: '1.2', fontWeight: '700' }],
        'card-title': ['clamp(22px, 2vw, 24px)', { lineHeight: '1.2', fontWeight: '700' }],
        'widget-title': ['clamp(18px, 1.5vw, 20px)', { lineHeight: '1.2', fontWeight: '600' }],
        'chart-title': ['18px', { lineHeight: '1.2', fontWeight: '700' }],
        'form-heading': ['18px', { lineHeight: '1.2', fontWeight: '700' }],
        
        'sidebar-active': ['15px', { lineHeight: '1.4', fontWeight: '600' }],
        'sidebar-normal': ['15px', { lineHeight: '1.4', fontWeight: '500' }],
        'nav': ['15px', { lineHeight: '1.4', fontWeight: '500' }],
        
        'input-label': ['13px', { lineHeight: '1', fontWeight: '500' }],
        'input-text': ['16px', { lineHeight: '1.5', fontWeight: '400' }],
        'dropdown-text': ['16px', { lineHeight: '1.5', fontWeight: '500' }],
        'placeholder': ['16px', { lineHeight: '1.5', fontWeight: '400' }],
        
        'btn': ['15px', { lineHeight: '1.2', fontWeight: '600' }],
        
        'kpi': ['clamp(32px, 3vw, 42px)', { lineHeight: '1', fontWeight: '700' }],
        'card-stat': ['clamp(24px, 2.5vw, 28px)', { lineHeight: '1', fontWeight: '700' }],
        
        'table-th': ['14px', { lineHeight: '1.4', fontWeight: '600' }],
        'table-td': ['14px', { lineHeight: '1.4', fontWeight: '400' }],
        
        'chart-label': ['12px', { lineHeight: '1.4', fontWeight: '500' }],
        'axis-label': ['11px', { lineHeight: '1.4', fontWeight: '500' }],
        
        'helper': ['12px', { lineHeight: '1.4', fontWeight: '400' }],
        'tooltip': ['13px', { lineHeight: '1.4', fontWeight: '500' }],
        'badge': ['12px', { lineHeight: '1', fontWeight: '600' }],
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
