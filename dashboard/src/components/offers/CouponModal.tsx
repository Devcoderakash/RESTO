import React, { useState, useEffect } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input, Textarea } from '../ui/Input'
import { Select } from '../ui/Select'
import { Switch } from '../ui/Switch'
import { Coupon } from '../../types'

export interface CouponModalProps {
  coupon: Coupon | null
  isOpen: boolean
  onClose: () => void
  onSave: (data: Omit<Coupon, 'id' | 'timesUsed'>) => void
}

export const CouponModal: React.FC<CouponModalProps> = ({
  coupon,
  isOpen,
  onClose,
  onSave,
}) => {
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage')
  const [discountValue, setDiscountValue] = useState('20')
  const [minOrderValue, setMinOrderValue] = useState('50')
  const [maxDiscount, setMaxDiscount] = useState('25')
  const [startDate, setStartDate] = useState('2026-10-01')
  const [endDate, setEndDate] = useState('2026-12-31')
  const [usageLimit, setUsageLimit] = useState('500')
  const [isActive, setIsActive] = useState(true)

  useEffect(() => {
    if (coupon) {
      setCode(coupon.code)
      setDescription(coupon.description)
      setDiscountType(coupon.discountType)
      setDiscountValue(String(coupon.discountValue))
      setMinOrderValue(String(coupon.minOrderValue))
      setMaxDiscount(coupon.maxDiscount ? String(coupon.maxDiscount) : '')
      setStartDate(coupon.startDate)
      setEndDate(coupon.endDate)
      setUsageLimit(String(coupon.usageLimit))
      setIsActive(coupon.isActive)
    } else {
      setCode('')
      setDescription('')
      setDiscountType('percentage')
      setDiscountValue('15')
      setMinOrderValue('40')
      setMaxDiscount('20')
      setStartDate(new Date().toISOString().slice(0, 10))
      setEndDate('2026-12-31')
      setUsageLimit('500')
      setIsActive(true)
    }
  }, [coupon, isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim()) return

    onSave({
      code: code.trim().toUpperCase(),
      description: description.trim(),
      discountType,
      discountValue: parseFloat(discountValue) || 0,
      minOrderValue: parseFloat(minOrderValue) || 0,
      maxDiscount: maxDiscount ? parseFloat(maxDiscount) : undefined,
      startDate,
      endDate,
      usageLimit: parseInt(usageLimit) || 100,
      isActive,
    })
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title={coupon ? `Edit Promotion: ${coupon.code}` : 'Create Discount Voucher'}
      description="Configure QR promotion codes, percentage or fixed deductions, and validity window."
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <Input
          label="Coupon Code"
          placeholder="e.g. DINEGOLD20"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          required
        />

        <Textarea
          label="Offer Description"
          placeholder="Describe perk, e.g. 20% off dinner orders above $80..."
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Discount Type"
            value={discountType}
            onChange={(e) => setDiscountType(e.target.value as any)}
          >
            <option value="percentage">Percentage Discount (%)</option>
            <option value="fixed">Fixed Deduction ($)</option>
          </Select>

          <Input
            label={discountType === 'percentage' ? 'Discount Percentage (%)' : 'Discount Amount ($)'}
            type="number"
            min="1"
            value={discountValue}
            onChange={(e) => setDiscountValue(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Min. Order Value ($)"
            type="number"
            min="0"
            value={minOrderValue}
            onChange={(e) => setMinOrderValue(e.target.value)}
            required
          />
          <Input
            label="Max Discount Cap ($) (Optional)"
            type="number"
            placeholder="No cap"
            value={maxDiscount}
            onChange={(e) => setMaxDiscount(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Valid From"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
          <Input
            label="Valid Until"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />
        </div>

        <Input
          label="Total Redemption Limit"
          type="number"
          min="1"
          value={usageLimit}
          onChange={(e) => setUsageLimit(e.target.value)}
          required
        />

        <div className="p-3 bg-canvas/60 rounded-xl border border-beige">
          <Switch
            label="Activate Coupon Instantly"
            description="When enabled, guests can enter this promo code during QR table checkout."
            checked={isActive}
            onChange={setIsActive}
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-beige">
          <Button variant="outline" size="sm" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit">
            {coupon ? 'Save Promotion' : 'Publish Coupon'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

