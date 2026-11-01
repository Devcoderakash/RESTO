import React, { useState, useEffect } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Table, TableStatus } from '../../types'

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

  useEffect(() => {
    if (table) {
      setTableNumber(table.tableNumber)
      setCapacity(String(table.capacity))
      setZone(table.zone)
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
    if (!tableNumber.trim()) return

    const saved = await onSave({
      tableNumber: tableNumber.trim(),
      capacity: parseInt(capacity) || 4,
      zone,
      status,
    })
    if (saved !== false) onClose()
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
        <Input
          label="Table Number"
          placeholder="e.g. 14, 15, 16"
          value={tableNumber}
          onChange={(e) => setTableNumber(e.target.value)}
          required
        />

        <Select
          label="Seating Capacity (Guests)"
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
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
          <Button variant="outline" size="sm" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit">
            {table ? 'Update Table' : 'Create Table'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
