import React from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { BookOpen, Command, Phone, ShieldCheck, Sparkles } from 'lucide-react'

export interface HelpModalProps {
  isOpen: boolean
  onClose: () => void
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" title="DineFlow Pro Operations Guide">
      <div className="space-y-6">
        {/* Intro Banner */}
        <div className="p-4 rounded-xl bg-brand-50 border border-brand/20 flex items-start gap-3">
          <div className="p-2 rounded-lg bg-brand text-sidebar shrink-0 mt-0.5">
            <Sparkles className="w-4 h-4 fill-sidebar" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-charcoal">
              Welcome to DineFlow Restaurant Operations
            </h4>
            <p className="text-xs text-charcoal-muted mt-1 leading-relaxed">
              This admin panel empowers management with real-time QR ordering orchestration, interactive table floor management, live kitchen order routing, billing, inventory usage tracking, and multi-branch controls.
            </p>
          </div>
        </div>

        {/* Shortcuts */}
        <div>
          <h4 className="text-xs font-bold text-charcoal uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Command className="w-4 h-4 text-brand" /> Quick Tips & Shortcuts
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="p-3 rounded-xl border border-beige bg-canvas/40 flex items-center justify-between">
              <span className="text-charcoal-muted">Global Quick Search</span>
              <kbd className="px-2 py-0.5 rounded bg-white border border-beige text-charcoal font-mono font-semibold">
                Ctrl / ⌘ + K
              </kbd>
            </div>
            <div className="p-3 rounded-xl border border-beige bg-canvas/40 flex items-center justify-between">
              <span className="text-charcoal-muted">Table QR Generation</span>
              <span className="font-semibold text-charcoal">Auto-generated</span>
            </div>
            <div className="p-3 rounded-xl border border-beige bg-canvas/40 flex items-center justify-between">
              <span className="text-charcoal-muted">Demo Order Updates</span>
              <span className="font-semibold text-charcoal">Direct click on order status</span>
            </div>
            <div className="p-3 rounded-xl border border-beige bg-canvas/40 flex items-center justify-between">
              <span className="text-charcoal-muted">State Persistence</span>
              <span className="font-semibold text-emerald-700">LocalStorage Synced</span>
            </div>
          </div>
        </div>

        {/* Contact info */}
        <div className="border-t border-beige pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-charcoal-muted">
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-brand" />
            <span>Dedicated Concierge: +1 (800) 555-DINE (24/7)</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>DineFlow Cloud SLA 99.98%</span>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="primary" size="sm" onClick={onClose}>
            Got it, thanks
          </Button>
        </div>
      </div>
    </Modal>
  )
}

