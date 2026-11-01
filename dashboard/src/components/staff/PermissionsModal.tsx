import React, { useState, useEffect } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Switch } from '../ui/Switch'
import { StaffMember } from '../../types'
import { Shield, ShieldAlert, Check } from 'lucide-react'

export interface PermissionsModalProps {
  staff: StaffMember | null
  isOpen: boolean
  onClose: () => void
  onSave: (id: string, permissions: StaffMember['permissions']) => void
}

export const PermissionsModal: React.FC<PermissionsModalProps> = ({
  staff,
  isOpen,
  onClose,
  onSave,
}) => {
  const [permissions, setPermissions] = useState<StaffMember['permissions']>({
    orders: true,
    tables: true,
    menu: false,
    billing: false,
    reports: false,
    settings: false,
  })

  useEffect(() => {
    if (staff) {
      setPermissions(staff.permissions)
    }
  }, [staff, isOpen])

  if (!staff) return null

  const handleToggle = (key: keyof StaffMember['permissions']) => {
    setPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const handleSave = () => {
    onSave(staff.id, permissions)
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title={
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-brand" />
          <span>Permissions: {staff.name}</span>
        </div>
      }
      description={`Role: ${staff.role} • Granular access rights to dashboard modules.`}
    >
      <div className="space-y-4 text-xs">
        <div className="p-3 bg-brand-50 rounded-xl border border-brand/20 text-brand-900 leading-relaxed">
          Configure module privileges for this employee. Managers have comprehensive access by default.
        </div>

        <div className="divide-y divide-beige/70">
          <div className="py-3 flex items-center justify-between">
            <div>
              <p className="font-semibold text-charcoal">Order Operations</p>
              <p className="text-[11px] text-charcoal-muted">
                Accept, prepare, serve, and modify live dining orders
              </p>
            </div>
            <Switch
              checked={permissions.orders}
              onChange={() => handleToggle('orders')}
            />
          </div>

          <div className="py-3 flex items-center justify-between">
            <div>
              <p className="font-semibold text-charcoal">Table & Floor Control</p>
              <p className="text-[11px] text-charcoal-muted">
                Seat guests, clear tables, and generate QR stand links
              </p>
            </div>
            <Switch
              checked={permissions.tables}
              onChange={() => handleToggle('tables')}
            />
          </div>

          <div className="py-3 flex items-center justify-between">
            <div>
              <p className="font-semibold text-charcoal">Menu & Pricing Editor</p>
              <p className="text-[11px] text-charcoal-muted">
                Edit prices, mark dishes out of stock, add recipes
              </p>
            </div>
            <Switch
              checked={permissions.menu}
              onChange={() => handleToggle('menu')}
            />
          </div>

          <div className="py-3 flex items-center justify-between">
            <div>
              <p className="font-semibold text-charcoal">Billing & Payment Settlements</p>
              <p className="text-[11px] text-charcoal-muted">
                Collect cash/card payments, view bills, issue refunds
              </p>
            </div>
            <Switch
              checked={permissions.billing}
              onChange={() => handleToggle('billing')}
            />
          </div>

          <div className="py-3 flex items-center justify-between">
            <div>
              <p className="font-semibold text-charcoal">Financial Reports & Analytics</p>
              <p className="text-[11px] text-charcoal-muted">
                View revenue charts, export daily sales CSV, margin logs
              </p>
            </div>
            <Switch
              checked={permissions.reports}
              onChange={() => handleToggle('reports')}
            />
          </div>

          <div className="py-3 flex items-center justify-between">
            <div>
              <p className="font-semibold text-charcoal">Restaurant Settings & Wi-Fi</p>
              <p className="text-[11px] text-charcoal-muted">
                Edit restaurant profile, taxes, Wi-Fi password, shifts
              </p>
            </div>
            <Switch
              checked={permissions.settings}
              onChange={() => handleToggle('settings')}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-beige">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleSave}>
            Save Permissions
          </Button>
        </div>
      </div>
    </Modal>
  )
}

