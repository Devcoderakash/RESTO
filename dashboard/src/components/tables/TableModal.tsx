import React, { useState, useEffect } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Table, TableStatus } from '../../types'
import { AlertCircle } from 'lucide-react'

export interface TableModalProps {
  table: Table | null
  isOpen: boolean
  onClose: () => void
  onSave: (data: {
    tableNumber: string
    capacity: number
    zone: 'Main Dining' | 'Patio & Outdoor' | 'VIP Lounge' | 'Rooftop Terrace'
    status: TableStatus
  }) => void | boolean | Promise<void | boolean>
}

export const TableModal: React.FC<TableModalProps> = ({ table, isOpen, onClose, onSave }) => {
  const [tableNumber, setTableNumber] = useState('')
  const [capacity, setCapacity] = useState('4')
  const [zone, setZone] = useState<'Main Dining' | 'Patio & Outdoor' | 'VIP Lounge' | 'Rooftop Terrace'>('Main Dining')
  const [status, setStatus] = useState<TableStatus>('Available')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    setErrorMessage(null)
    setIsSubmitting(false)
    if (table) {
      setTableNumber(table.tableNumber)
      setCapacity(String(table.capacity))
      setZone(table.zone as any)
      setStatus(table.status)
    } else {
      setTableNumber('')
      setCapacity('4')
      setZone('Main Dining')
      setStatus('Available')
    }
  }, [table, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanNumber = tableNumber.trim()
    if (!cleanNumber) {
      setErrorMessage('Table number is required.')
      return
    }

    setErrorMessage(null)
    setIsSubmitting(true)

    try {
      const saved = await onSave({
        tableNumber: cleanNumber,
        capacity: parseInt(capacity) || 4,
        zone,
        status,
      })
      if (saved !== false) {
        onClose()
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to save table. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      title={table ? `Edit Table ${table.tableNumber}` : 'Add New Table'}
      description="Configure table identity, seating capacity, and floor dining zone."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <Input
          label="Table Number"
          placeholder="e.g. 14, 15, 16"
          value={tableNumber}
          onChange={(e) => {
            setTableNumber(e.target.value)
            if (errorMessage) setErrorMessage(null)
          }}
          disabled={isSubmitting}
          required
        />

        <Select
          label="Seating Capacity (Guests)"
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          disabled={isSubmitting}
        >
          <option value="2">2 Guests (Intimate / Bistro)</option>
          <option value="4">4 Guests (Standard Dining)</option>
          <option value="6">6 Guests (Family Table)</option>
          <option value="8">8 Guests (Large Group)</option>
          <option value="12">12 Guests (Banquet / Long Table)</option>
        </Select>

        <Select
          label="Dining Floor Zone"
          value={zone}
          onChange={(e) => setZone(e.target.value as any)}
          disabled={isSubmitting}
        >
          <option value="Main Dining">Main Dining Hall</option>
          <option value="Patio & Outdoor">Patio & Outdoor Garden</option>
          <option value="VIP Lounge">VIP Private Lounge</option>
          <option value="Rooftop Terrace">Rooftop Terrace</option>
        </Select>

        <Select
          label="Initial Status"
          value={status}
          onChange={(e) => setStatus(e.target.value as any)}
          disabled={isSubmitting}
        >
          <option value="Available">Available</option>
          <option value="Occupied">Occupied</option>
          <option value="Ordering">Ordering</option>
          <option value="Food Preparing">Food Preparing</option>
          <option value="Food Ready">Food Ready</option>
          <option value="Bill Requested">Bill Requested</option>
          <option value="Cleaning">Cleaning</option>
        </Select>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-beige">
          <Button variant="outline" size="sm" type="button" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit" disabled={isSubmitting} isLoading={isSubmitting}>
            {table ? 'Update Table' : 'Create Table'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
