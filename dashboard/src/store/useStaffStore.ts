import { create } from 'zustand'
import { toast } from 'sonner'
import { StaffMember } from '../types'
import { dashboardApi } from '../services/api'

interface StaffState {
  staffList: StaffMember[]
  selectedStaff: StaffMember | null
  searchQuery: string
  roleFilter: string
  setStaff: (staff: StaffMember[]) => void
  setSelectedStaff: (staff: StaffMember | null) => void
  setSearchQuery: (query: string) => void
  setRoleFilter: (role: string) => void
  addStaff: (staff: Omit<StaffMember, 'id' | 'joiningDate'>) => Promise<boolean>
  toggleStaffStatus: (id: string) => Promise<boolean>
}

export const useStaffStore = create<StaffState>((set, get) => ({
  staffList: [],
  selectedStaff: null,
  searchQuery: '',
  roleFilter: 'ALL',
  setStaff: (staffList) => set({ staffList }),
  setSelectedStaff: (staff) => set({ selectedStaff: staff }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setRoleFilter: (role) => set({ roleFilter: role }),
  addStaff: async (staffData) => {
    try {
      const staff = await dashboardApi.inviteStaff(staffData)
      set((state) => ({ staffList: [...state.staffList, staff] }))
      return true
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Staff invitation could not be sent.')
      return false
    }
  },
  toggleStaffStatus: async (id) => {
    const staff = get().staffList.find((member) => member.id === id)
    if (!staff) {
      toast.error('Staff member not found.')
      return false
    }
    const isActive = staff.status !== 'Active'
    try {
      await dashboardApi.setStaffActive(id, isActive)
      set((state) => ({
        staffList: state.staffList.map((member) =>
          member.id === id ? { ...member, status: isActive ? 'Active' : 'Inactive' } : member,
        ),
      }))
      return true
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Staff status could not be updated.')
      return false
    }
  },
}))
