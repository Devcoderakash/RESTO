import React, { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { InventoryItem } from '../../types'
import { formatDate } from '../../lib/utils'
import { PlusCircle, MinusCircle, History, PackageCheck } from 'lucide-react'

export interface StockUsageModalProps {
  item: InventoryItem | null
  isOpen: boolean
  onClose: () => void
  onRecord: (
    id: string,
    quantity: number,
    type: 'usage' | 'restock' | 'waste',
    note?: string
  ) => void
}

export const StockUsageModal: React.FC<StockUsageModalProps> = ({
  item,
  isOpen,
  onClose,
  onRecord,
}) => {
  const [type, setType] = useState<'usage' | 'restock' | 'waste'>('restock')
  const [quantity, setQuantity] = useState('5')
  const [note, setNote] = useState('')

  if (!item) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const q = parseFloat(quantity)
    if (isNaN(q) || q <= 0) return

    onRecord(item.id, q, type, note)
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title={
        <div className="flex items-center gap-2">
          <PackageCheck className="w-5 h-5 text-brand" />
          <span>Stock Adjustment: {item.name}</span>
        </div>
      }
      description={`Current level: ${item.currentStock} ${item.unit} (Alert threshold: ${item.minStock} ${item.unit})`}
    >
      <div className="space-y-6 text-xs">
        {/* Record Transaction Form */}
        <form onSubmit={handleSubmit} className="p-4 bg-canvas/60 rounded-xl border border-beige space-y-3">
          <h4 className="text-[11px] font-bold text-charcoal uppercase tracking-wider">
            Record Inventory Event
          </h4>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Action Type"
              value={type}
              onChange={(e) => setType(e.target.value as any)}
            >
              <option value="restock">+ Restock Shipment Received</option>
              <option value="usage">- Kitchen Service Usage</option>
              <option value="waste">- Spoilage / Wastage Write-off</option>
            </Select>

            <Input
              label={`Quantity (${item.unit})`}
              type="number"
              step="0.1"
              min="0.1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
          </div>

          <Input
            label="Log Notes / PO Reference"
            placeholder="e.g. Weekly vendor order delivery #892"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          <div className="flex justify-end pt-1">
            <Button variant="primary" size="sm" type="submit">
              Apply Stock Adjustment
            </Button>
          </div>
        </form>

        {/* Stock History Audit Log */}
        <div>
          <h4 className="text-[11px] font-bold text-charcoal-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-brand" /> Recent History Log
          </h4>
          {item.usageHistory.length === 0 ? (
            <p className="text-charcoal-muted py-3 text-center border border-dashed border-beige rounded-xl">
              No previous stock adjustments logged for this item.
            </p>
          ) : (
            <div className="divide-y divide-beige/60 max-h-48 overflow-y-auto">
              {item.usageHistory.map((rec) => (
                <div key={rec.id} className="py-2 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-charcoal capitalize">
                      {rec.type === 'restock' ? (
                        <span className="text-emerald-700 font-bold">
                          +{rec.quantity} {item.unit} Restocked
                        </span>
                      ) : rec.type === 'waste' ? (
                        <span className="text-rose-700 font-bold">
                          -{rec.quantity} {item.unit} Waste Write-off
                        </span>
                      ) : (
                        <span className="text-charcoal-soft">
                          -{rec.quantity} {item.unit} Service Usage
                        </span>
                      )}
                    </p>
                    <p className="text-[10px] text-charcoal-muted mt-0.5">{rec.note}</p>
                  </div>
                  <span className="text-[10px] text-charcoal-muted">{formatDate(rec.date)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2 border-t border-beige">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  )
}

