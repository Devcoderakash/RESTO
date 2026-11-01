import React, { useState } from 'react'
import { BellRing, GlassWater, Utensils, Sparkles, HelpCircle, CheckCircle2 } from 'lucide-react'
import { Dialog } from '../ui/Dialog'
import { Button } from '../ui/Button'
import { useTableStore } from '../../store/tableStore'
import { ServiceRequestType } from '../../types/order'
import { toast } from 'sonner'
import { createServiceRequest } from '../../services/api'

interface CallWaiterModalProps {
  isOpen: boolean
  onClose: () => void
}

const SERVICE_OPTIONS: { type: ServiceRequestType; label: string; icon: React.ReactNode }[] = [
  { type: 'Request Water', label: 'Fresh Water (Still/Sparkling)', icon: <GlassWater className="w-4 h-4 text-sky-600" /> },
  { type: 'Need Assistance', label: 'Captain / Server Assistance', icon: <BellRing className="w-4 h-4 text-amber-600" /> },
  { type: 'Extra Plates', label: 'Extra Plates & Bowls', icon: <Utensils className="w-4 h-4 text-gold-700" /> },
  { type: 'Napkins', label: 'Fresh Linen Napkins', icon: <Sparkles className="w-4 h-4 text-emerald-600" /> },
  { type: 'Cutlery', label: 'Extra Silverware / Cutlery', icon: <Utensils className="w-4 h-4 text-indigo-600" /> },
  { type: 'Other Request', label: 'Special Hospitality Request', icon: <HelpCircle className="w-4 h-4 text-charcoal-600" /> },
]

export const CallWaiterModal: React.FC<CallWaiterModalProps> = ({ isOpen, onClose }) => {
  const { currentTable } = useTableStore()
  const [selectedType, setSelectedType] = useState<ServiceRequestType>('Request Water')
  const [note, setNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return
    setIsSubmitting(true)
    try {
      await createServiceRequest({
        tableNumber: currentTable,
        type: 'call_waiter',
        detail: selectedType,
        note: note.trim() || undefined,
      })
      toast.success(`Service request sent to Table ${currentTable}! A server is on the way.`, {
        description: selectedType,
        icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
      })
      setNote('')
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to send your request. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Call Table Server"
      description={`Table ${currentTable} • How may we enhance your dining experience?`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Table prompt */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-gold-50/70 border border-gold-200/80 text-xs text-charcoal">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-gold animate-ping" />
            <span className="font-semibold text-gold-800">Assisting Table {currentTable}</span>
          </div>
          <span className="text-charcoal-600">Captain on duty: Marco S.</span>
        </div>

        {/* Options grid */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-charcoal-600">
            Select Service Type
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SERVICE_OPTIONS.map((opt) => {
              const isSelected = selectedType === opt.type
              return (
                <button
                  type="button"
                  key={opt.type}
                  onClick={() => setSelectedType(opt.type)}
                  className={`flex items-center gap-2.5 p-3 rounded-xl border text-left text-sm transition-all ${
                    isSelected
                      ? 'border-gold bg-gold-50/80 text-charcoal font-medium shadow-sm ring-1 ring-gold'
                      : 'border-beige hover:border-gold/40 bg-white text-charcoal-700 hover:bg-cream-50'
                  }`}
                >
                  <div className="shrink-0">{opt.icon}</div>
                  <span className="truncate">{opt.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Optional message input */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-charcoal-600">
            Optional Note for Server
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Please bring warm water with lemon, or baby high chair..."
            rows={2}
            className="w-full px-3.5 py-2.5 rounded-xl border border-beige bg-cream-50/40 text-charcoal text-sm placeholder:text-charcoal-600/50 focus:outline-none focus:ring-2 focus:ring-gold/30 focus:bg-white resize-none"
          />
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="button" variant="outline" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="gold"
            size="md"
            isLoading={isSubmitting}
            className="min-w-[140px]"
          >
            Ring Bell
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
