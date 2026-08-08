import * as React from 'react'
import { cn } from '@/lib/utils'

type BarColor = 'lime' | 'orange' | 'pink' | 'indigo'

export interface RoundedBarDatum {
  label: string
  value: number
  color?: BarColor
}

const COLOR_VARS: Record<BarColor, string> = {
  lime: 'var(--color-accent-lime)',
  orange: 'var(--color-accent-orange)',
  pink: 'var(--color-accent-pink)',
  indigo: 'var(--color-brand-indigo)',
}

const COLOR_CYCLE: BarColor[] = ['lime', 'orange', 'pink']

interface RoundedBarChartProps extends React.SVGProps<SVGSVGElement> {
  data: RoundedBarDatum[]
  title: string
  description?: string
  trackColor?: 'dark' | 'cream'
}

export function RoundedBarChart({
  data,
  title,
  description,
  trackColor = 'dark',
  className,
  ...props
}: RoundedBarChartProps) {
  const titleId = React.useId()
  const descriptionId = React.useId()
  const maxValue = Math.max(...data.map(item => item.value), 1)
  const chartWidth = Math.max(240, data.length * 64)
  const chartBottom = 162
  const maximumBarHeight = 122
  const barWidth = Math.min(34, (chartWidth - 40) / Math.max(data.length * 1.8, 1))
  const gap = data.length > 1
    ? (chartWidth - 40 - data.length * barWidth) / (data.length - 1)
    : 0
  const trackFill = trackColor === 'cream'
    ? 'var(--color-chart-muted)'
    : 'var(--color-surface-dark-alt)'

  return (
    <svg
      viewBox={`0 0 ${chartWidth} 190`}
      className={cn('h-auto w-full overflow-visible', className)}
      role="img"
      aria-labelledby={`${titleId} ${description ? descriptionId : ''}`.trim()}
      {...props}
    >
      <title id={titleId}>{title}</title>
      {description && <desc id={descriptionId}>{description}</desc>}
      {data.map((item, index) => {
        const x = 20 + index * (barWidth + gap)
        const scale = Math.max(item.value / maxValue, 0.07)
        const color = item.color ?? COLOR_CYCLE[index % COLOR_CYCLE.length]

        return (
          <g key={`${item.label}-${index}`}>
            <rect
              x={x}
              y={chartBottom - maximumBarHeight}
              width={barWidth}
              height={maximumBarHeight}
              rx={barWidth / 2}
              ry={barWidth / 2}
              fill={trackFill}
              opacity={trackColor === 'cream' ? 0.8 : 1}
            />
            <rect
              x={x}
              y={chartBottom - maximumBarHeight}
              width={barWidth}
              height={maximumBarHeight}
              rx={barWidth / 2}
              ry={barWidth / 2}
              fill={COLOR_VARS[color]}
              style={{
                transform: `scaleY(${scale})`,
                transformOrigin: `${x + barWidth / 2}px ${chartBottom}px`,
                transition: 'transform var(--chart-transition)',
              }}
            />
            <text
              x={x + barWidth / 2}
              y="184"
              textAnchor="middle"
              fill={trackColor === 'cream' ? 'var(--color-ink)' : 'var(--color-neutral-mid)'}
              fontSize="9"
              fontWeight="700"
            >
              {item.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
