import React from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Table } from '../../types'
import { useOrderStore } from '../../store/useOrderStore'
import { formatCurrency, formatDateTime } from '../../lib/utils'
import { OrderStatusBadge } from '../orders/OrderStatusBadge'
import { History, ShoppingBag } from 'lucide-react'

export interface TableHistoryModalProps {
  table: Table | null
  isOpen: boolean
  onClose: () => void
}

export const TableHistoryModal: React.FC<TableHistoryModalProps> = ({
  table,
  isOpen,
  onClose,
}) => {
  const orders = useOrderStore((s) => s.orders)

  if (!table) return null

  const tableOrders = orders.filter((o) => o.tableNumber === table.tableNumber)

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title={`Order History: Table ${table.tableNumber}`}
      description={`${table.zone} • ${tableOrders.length} recorded orders`}
    >
      <div className="space-y-4">
        {tableOrders.length === 0 ? (
          <div className="py-8 text-center text-charcoal-muted text-xs">
            No previous dining sessions recorded for Table {table.tableNumber} today.
          </div>
        ) : (
          <div className="divide-y divide-beige/60">
            {tableOrders.map((order) => (
              <div key={order.id} className="py-3 flex items-start justify-between gap-3 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-charcoal font-mono">{order.id}</span>
                    <OrderStatusBadge status={order.orderStatus} />
                  </div>
                  <p className="text-charcoal-soft font-medium mt-1">
                    Guest: {order.customerName}
                  </p>
                  <p className="text-[11px] text-charcoal-muted mt-0.5">
                    {order.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}
                  </p>
                  <p className="text-[10px] text-charcoal-muted mt-1">
                    {formatDateTime(order.createdAt)}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <p className="font-bold text-charcoal">{formatCurrency(order.total)}</p>
                  <span
                    className={`inline-block text-[10px] font-semibold mt-1 px-1.5 py-0.2 rounded ${
                      order.paymentStatus === 'Paid'
                        ? 'bg-emerald-50 text-emerald-800'
                        : 'bg-amber-50 text-amber-800'
                    }`}
                  >
                    {order.paymentStatus}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end pt-3 border-t border-beige">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  )
}

