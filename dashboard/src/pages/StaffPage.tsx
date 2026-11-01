import React, { useEffect, useState } from 'react'
import {
  Users,
  Plus,
  Search,
  Mail,
  Calendar,
  UserCheck,
} from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card } from '../components/ui/Card'
import { Tabs } from '../components/ui/Tabs'
import { StaffModal } from '../components/staff/StaffModal'
import { EmptyState } from '../components/ui/EmptyState'
import { useStaffStore } from '../store/useStaffStore'
import { StaffMember, StaffRole } from '../types'
import { formatDate } from '../lib/utils'
import { toast } from 'sonner'
import { dashboardApi } from '../services/api'

export const StaffPage: React.FC = () => {
  const {
    staffList,
    searchQuery,
    roleFilter,
    setStaff,
    setSearchQuery,
    setRoleFilter,
    addStaff,
    toggleStaffStatus,
  } = useStaffStore()

  const [activeStaffModal, setActiveStaffModal] = useState(false)

  useEffect(() => {
    dashboardApi.getStaff()
      .then(setStaff)
      .catch((error: unknown) => {
        toast.error(error instanceof Error ? error.message : 'Staff could not be loaded.')
      })
  }, [setStaff])

  const roleTabs = [
    { id: 'ALL', label: 'All Team Members', count: staffList.length },
    { id: 'Manager', label: 'Managers', count: staffList.filter((s) => s.role === 'Manager').length },
    { id: 'Chef', label: 'Chefs & Kitchen', count: staffList.filter((s) => s.role === 'Chef').length },
    { id: 'Waiter', label: 'Floor Waiters', count: staffList.filter((s) => s.role === 'Waiter').length },
  ]

  const filteredStaff = staffList.filter((staff) => {
    if (roleFilter !== 'ALL' && staff.role !== roleFilter) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchName = staff.name.toLowerCase().includes(q)
      const matchEmail = staff.email.toLowerCase().includes(q)
      const matchRole = staff.role.toLowerCase().includes(q)
      if (!matchName && !matchEmail && !matchRole) return false
    }
    return true
  })

  const handleSaveStaff = async (data: Omit<StaffMember, 'id' | 'joiningDate'>) => {
    if (!await addStaff(data)) return false
    toast.success(`Invitation sent to ${data.email}`)
    setActiveStaffModal(false)
    return true
  }

  const handleToggleStaffStatus = async (staff: StaffMember) => {
    if (await toggleStaffStatus(staff.id)) {
      toast.success(`${staff.name}'s access ${staff.status === 'Active' ? 'deactivated' : 'activated'}`)
    }
  }

  const getRoleBadge = (role: StaffRole) => {
    switch (role) {
      case 'Manager':
        return 'bg-purple-50 text-purple-700 border-purple-200'
      case 'Chef':
        return 'bg-amber-50 text-amber-700 border-amber-200'
      case 'Waiter':
        return 'bg-blue-50 text-blue-700 border-blue-200'
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-serif text-charcoal">
            Staff Management
          </h2>
          <p className="text-xs sm:text-sm text-charcoal-muted mt-0.5">
            Oversee restaurant team roles, active shifts, and granular system permissions.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setActiveStaffModal(true)}
        >
          Add Staff Member
        </Button>
      </div>

      {/* Role Tabs */}
      <Tabs
        tabs={roleTabs}
        activeTab={roleFilter}
        onChange={setRoleFilter}
        variant="pills"
      />

      {/* Search Toolbar */}
      <Card className="p-4">
        <Input
          placeholder="Search team members by name, email, or role..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          leftIcon={<Search className="w-4 h-4" />}
        />
      </Card>

      {/* Staff Grid */}
      {filteredStaff.length === 0 ? (
        <EmptyState
          title="No team members found"
          description="Try resetting role filters or adding a new employee to this restaurant location."
          actionLabel="Show All Staff"
          onAction={() => {
            setSearchQuery('')
            setRoleFilter('ALL')
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredStaff.map((staff) => (
            <Card hoverEffect key={staff.id} className="p-5 flex flex-col justify-between group">
              <div>
                {/* Header with avatar & status */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-beige bg-canvas font-serif text-lg font-bold text-brand">
                      {staff.name.trim().charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-charcoal">{staff.name}</h4>
                      <span
                        className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${getRoleBadge(
                          staff.role
                        )}`}
                      >
                        {staff.role}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      staff.status === 'Active'
                        ? 'bg-emerald-50 text-emerald-800'
                        : staff.status === 'On Leave'
                        ? 'bg-amber-50 text-amber-800'
                        : 'bg-stone-100 text-stone-600'
                    }`}
                  >
                    {staff.status}
                  </span>
                </div>

                {/* Contact info & Shift */}
                <div className="mt-4 pt-3 border-t border-beige/60 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-charcoal-muted">
                    <Mail className="w-3.5 h-3.5 text-brand shrink-0" />
                    <span className="truncate">{staff.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-charcoal-muted/80">
                    <Calendar className="w-3.5 h-3.5 text-charcoal-muted shrink-0" />
                    <span>Joined: {formatDate(staff.joiningDate)}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-beige/60 flex items-center justify-between text-xs">
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<UserCheck className="w-3.5 h-3.5 text-brand" />}
                  onClick={() => void handleToggleStaffStatus(staff)}
                >
                  {staff.status === 'Active' ? 'Deactivate' : 'Activate'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Staff Modal */}
      <StaffModal
        staff={null}
        isOpen={!!activeStaffModal}
        onClose={() => setActiveStaffModal(false)}
        onSave={handleSaveStaff}
      />
    </div>
  )
}
