import React from 'react'
import { OrderStatus } from '../../types'
import { getStatusBadgeStyles } from '../../lib/utils'

export interface OrderStatusBadgeProps {
  status: OrderStatus
  className?: string
}

export const OrderStatusBadge: React.FC<OrderStatusBadgeProps> = ({ status, className }) => {
  const styles = getStatusBadgeStyles(status)

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${styles.bg} ${styles.text} ${styles.border} ${className || ''}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />
      {status}
    </span>
  )
}

