import React, { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { StaffMember, StaffRole } from '../../types'

export interface StaffModalProps {
  staff: StaffMember | null
  isOpen: boolean
  onClose: () => void
  onSave: (data: Omit<StaffMember, 'id' | 'joiningDate'>) => void | boolean | Promise<void | boolean>
}

export const StaffModal: React.FC<StaffModalProps> = ({ isOpen, onClose, onSave }) => {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<StaffRole>('Waiter')

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!name.trim() || !email.trim()) return

    const saved = await onSave({
      name: name.trim(),
      email: email.trim(),
      phone: '',
      role,
      avatar: '',
      status: 'Active',
      shift: 'Not set',
      permissions: {
        orders: false,
        tables: false,
        menu: false,
        billing: false,
        reports: false,
        settings: false,
      },
    })
    if (saved !== false) {
      setName('')
      setEmail('')
      setRole('Waiter')
      onClose()
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title="Invite Staff Member"
      description="An invitation will be sent to this email address. Choose the staff role for this restaurant."
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <Input
          label="Full Name"
          placeholder="Staff member name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
        <Input
          label="Email Address"
          type="email"
          autoComplete="email"
          placeholder="staff@restaurant.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <Select label="Staff Role" value={role} onChange={(event) => setRole(event.target.value as StaffRole)}>
          <option value="Manager">Manager</option>
          <option value="Chef">Chef</option>
          <option value="Waiter">Waiter</option>
        </Select>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-beige">
          <Button variant="outline" size="sm" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit">
            Send Invitation
          </Button>
        </div>
      </form>
    </Modal>
  )
}
