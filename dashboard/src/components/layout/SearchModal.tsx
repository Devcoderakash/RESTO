import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ShoppingBag, Grid3X3, Utensils, Users, ArrowRight, X } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { useOrderStore } from '../../store/useOrderStore'
import { useTableStore } from '../../store/useTableStore'
import { useMenuStore } from '../../store/useMenuStore'
import { useCustomerStore } from '../../store/useCustomerStore'
import { useStaffStore } from '../../store/useStaffStore'
import { formatCurrency } from '../../lib/utils'

export interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
}

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  const orders = useOrderStore((s) => s.orders)
  const tables = useTableStore((s) => s.tables)
  const menuItems = useMenuStore((s) => s.items)
  const customers = useCustomerStore((s) => s.customers)
  const staff = useStaffStore((s) => s.staffList)

  useEffect(() => {
    if (!isOpen) {
      setQuery('')
    }
  }, [isOpen])

  const q = query.trim().toLowerCase()

  const matchedOrders = q
    ? orders.filter(
        (o) =>
          o.id.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          o.tableNumber.includes(q)
      ).slice(0, 3)
    : []

  const matchedTables = q
    ? tables.filter(
        (t) =>
          t.tableNumber.includes(q) ||
          t.zone.toLowerCase().includes(q) ||
          t.status.toLowerCase().includes(q)
      ).slice(0, 3)
    : []

  const matchedMenu = q
    ? menuItems.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.categoryName.toLowerCase().includes(q) ||
          m.description.toLowerCase().includes(q)
      ).slice(0, 3)
    : []

  const matchedCustomers = q
    ? customers.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          c.email.toLowerCase().includes(q)
      ).slice(0, 3)
    : []

  const matchedStaff = q
    ? staff.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.role.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q)
      ).slice(0, 3)
    : []

  const hasResults =
    matchedOrders.length > 0 ||
    matchedTables.length > 0 ||
    matchedMenu.length > 0 ||
    matchedCustomers.length > 0 ||
    matchedStaff.length > 0

  const handleNavigate = (path: string) => {
    onClose()
    navigate(path)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="-m-6">
        {/* Search Input Bar */}
        <div className="p-4 sm:p-5 border-b border-beige flex items-center gap-3 bg-canvas/30">
          <Search className="w-5 h-5 text-brand shrink-0" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search orders, tables, dishes, guests, staff..."
            className="w-full bg-transparent text-charcoal text-base focus:outline-none placeholder:text-charcoal-muted"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-charcoal-muted hover:text-charcoal p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Results Area */}
        <div className="max-h-[60vh] overflow-y-auto p-4 sm:p-5 space-y-5">
          {!q ? (
            <div className="py-8 text-center text-charcoal-muted text-xs sm:text-sm">
              <p className="font-medium text-charcoal">Quick Global Lookup</p>
              <p className="text-charcoal-muted mt-1">
                Type an order number like <code className="bg-canvas px-1.5 py-0.5 rounded text-charcoal">ORD-2841</code>, table like <code className="bg-canvas px-1.5 py-0.5 rounded text-charcoal">02</code>, or dish name.
              </p>
            </div>
          ) : !hasResults ? (
            <div className="py-8 text-center text-charcoal-muted text-sm">
              No matching records found for "{query}"
            </div>
          ) : (
            <>
              {/* Orders */}
              {matchedOrders.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-bold text-charcoal-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <ShoppingBag className="w-3.5 h-3.5 text-brand" /> Orders
                  </h4>
                  <div className="space-y-1.5">
                    {matchedOrders.map((order) => (
                      <div
                        key={order.id}
                        onClick={() => handleNavigate('/orders')}
                        className="flex items-center justify-between p-3 rounded-xl bg-canvas/60 hover:bg-brand-50/50 cursor-pointer transition-colors"
                      >
                        <div>
                          <p className="text-sm font-semibold text-charcoal">
                            {order.id} — Table {order.tableNumber}
                          </p>
                          <p className="text-xs text-charcoal-muted">
                            {order.customerName} • {order.items.length} items • {formatCurrency(order.total)}
                          </p>
                        </div>
                        <span className="text-xs font-medium text-brand flex items-center gap-1">
                          {order.orderStatus} <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tables */}
              {matchedTables.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-bold text-charcoal-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Grid3X3 className="w-3.5 h-3.5 text-brand" /> Tables
                  </h4>
                  <div className="space-y-1.5">
                    {matchedTables.map((table) => (
                      <div
                        key={table.id}
                        onClick={() => handleNavigate('/tables')}
                        className="flex items-center justify-between p-3 rounded-xl bg-canvas/60 hover:bg-brand-50/50 cursor-pointer transition-colors"
                      >
                        <div>
                          <p className="text-sm font-semibold text-charcoal">
                            Table {table.tableNumber} ({table.capacity} Pax)
                          </p>
                          <p className="text-xs text-charcoal-muted">{table.zone}</p>
                        </div>
                        <span className="text-xs font-medium text-brand flex items-center gap-1">
                          {table.status} <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Menu Items */}
              {matchedMenu.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-bold text-charcoal-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Utensils className="w-3.5 h-3.5 text-brand" /> Menu Items
                  </h4>
                  <div className="space-y-1.5">
                    {matchedMenu.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleNavigate('/menu')}
                        className="flex items-center justify-between p-3 rounded-xl bg-canvas/60 hover:bg-brand-50/50 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                          <div>
                            <p className="text-sm font-semibold text-charcoal">{item.name}</p>
                            <p className="text-xs text-charcoal-muted">
                              {item.categoryName} • {formatCurrency(item.price)}
                            </p>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-charcoal-muted" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Customers & Staff */}
              {(matchedCustomers.length > 0 || matchedStaff.length > 0) && (
                <div>
                  <h4 className="text-[11px] font-bold text-charcoal-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-brand" /> Guests & Team
                  </h4>
                  <div className="space-y-1.5">
                    {matchedCustomers.map((cust) => (
                      <div
                        key={cust.id}
                        onClick={() => handleNavigate('/customers')}
                        className="flex items-center justify-between p-3 rounded-xl bg-canvas/60 hover:bg-brand-50/50 cursor-pointer transition-colors"
                      >
                        <div>
                          <p className="text-sm font-semibold text-charcoal">{cust.name} (Guest)</p>
                          <p className="text-xs text-charcoal-muted">
                            {cust.phone} • {cust.totalOrders} visits
                          </p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-charcoal-muted" />
                      </div>
                    ))}
                    {matchedStaff.map((st) => (
                      <div
                        key={st.id}
                        onClick={() => handleNavigate('/staff')}
                        className="flex items-center justify-between p-3 rounded-xl bg-canvas/60 hover:bg-brand-50/50 cursor-pointer transition-colors"
                      >
                        <div>
                          <p className="text-sm font-semibold text-charcoal">
                            {st.name} ({st.role})
                          </p>
                          <p className="text-xs text-charcoal-muted">{st.email}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-charcoal-muted" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Modal>
  )
}

