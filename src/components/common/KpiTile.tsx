import React from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

interface KpiTileProps {
  label: string
  value: number | string
  icon?: React.ElementType
  href?: string
  color: string
  textColor?: 'light' | 'dark'
  footer?: string
  className?: string
  onClick?: () => void
}

export function KpiTile({
  label,
  value,
  icon: Icon,
  href,
  color,
  textColor = 'dark',
  footer,
  className,
  onClick,
}: KpiTileProps) {
  const isLight = textColor === 'light'
  const labelClass = isLight ? 'text-[#7D9FC2] text-[11px] font-semibold tracking-[0.1em] uppercase mb-1' : 'text-[#7D9FC2] text-[11px] font-semibold tracking-[0.1em] uppercase mb-1'
  const valueClass = isLight ? 'tl-kpi-value text-[#56779D] text-[32px] md:text-[40px]' : 'tl-kpi-value text-[#56779D] text-[32px] md:text-[40px]'
  const iconClass = isLight ? 'text-white/30 group-hover:text-[#7D9FC2]' : 'text-white/30 group-hover:text-[#7D9FC2]'
  const footerClass = isLight
    ? 'text-[11px] font-semibold text-[#7D9FC2] uppercase tracking-wider group-hover:text-[#7D9FC2] mt-2'
    : 'text-[11px] font-semibold text-[#7D9FC2] uppercase tracking-wider group-hover:text-[#7D9FC2] mt-2'

  const inner = (
    <div className="flex flex-col h-full justify-between">
      <div className="flex items-start justify-between">
        <span className={labelClass}>{label}</span>
        {Icon && <Icon size={18} className={cn(iconClass, 'transition-colors shrink-0')} />}
      </div>
      <div>
        <span className={valueClass}>{value}</span>
        {footer && <div className={cn(footerClass, 'transition-colors')}>{footer}</div>}
      </div>
    </div>
  )

  const baseStyle = 'rounded-[24px] p-6 flex flex-col group transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(0,0,0,0.3)] shadow-[0_4px_24px_rgba(0,0,0,0.1)]'
  const tileClass = cn(baseStyle, className)

  if (href) {
    return (
      <Link to={href} className={tileClass} style={{ backgroundColor: color }}>
        {inner}
      </Link>
    )
  }

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? e => e.key === 'Enter' && onClick() : undefined}
      className={cn(tileClass, onClick && 'cursor-pointer')}
      style={{ backgroundColor: color }}
    >
      {inner}
    </div>
  )
}
