import React, { useState } from 'react'
import { Wifi, Copy, Check, Smartphone } from 'lucide-react'
import { Dialog } from '../ui/Dialog'
import { useRestaurantStore } from '../../store/restaurantStore'
import { toast } from 'sonner'

interface WifiModalProps {
  isOpen: boolean
  onClose: () => void
}

export const WifiModal: React.FC<WifiModalProps> = ({ isOpen, onClose }) => {
  const [copiedField, setCopiedField] = useState<'network' | 'password' | null>(null)
  const info = useRestaurantStore((s) => s.info)
  const network = info?.wifiSsid || 'OliveEmber-Guest'
  const password = info?.wifiPassword || 'FiredWood2026'

  const copyToClipboard = (text: string, field: 'network' | 'password', label: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    toast.success(`${label} copied to clipboard!`)
    setTimeout(() => setCopiedField(null), 2500)
  }

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Complimentary Guest Wi-Fi"
      description="Enjoy seamless high-speed internet while dining with us."
      maxWidth="sm"
    >
      <div className="space-y-4 text-center">
        {/* Wi-Fi Icon Badge */}
        <div className="mx-auto w-14 h-14 rounded-2xl bg-gold-50 border border-gold-200 flex items-center justify-center text-gold-700 shadow-soft">
          <Wifi className="w-7 h-7" />
        </div>

        {/* Credentials Cards */}
        <div className="space-y-2.5 text-left">
          {/* Network Name */}
          <div className="p-3.5 rounded-xl bg-canvas border border-beige flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-charcoal-600">
                Network SSID
              </div>
              <div className="text-sm font-serif font-bold text-charcoal mt-0.5">
                {network}
              </div>
            </div>
            <button
              onClick={() => copyToClipboard(network, 'network', 'Network Name')}
              className="p-2 rounded-lg bg-white border border-beige text-charcoal text-xs font-semibold hover:bg-cream-100 transition-colors flex items-center gap-1 active:scale-95"
            >
              {copiedField === 'network' ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-charcoal-600" />
              )}
              <span className="text-[11px]">{copiedField === 'network' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          {/* Password */}
          <div className="p-3.5 rounded-xl bg-canvas border border-beige flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-charcoal-600">
                WPA2 Password
              </div>
              <div className="text-sm font-mono font-bold text-charcoal mt-0.5">
                {password}
              </div>
            </div>
            <button
              onClick={() => copyToClipboard(password, 'password', 'Password')}
              className="p-2 rounded-lg bg-white border border-beige text-charcoal text-xs font-semibold hover:bg-cream-100 transition-colors flex items-center gap-1 active:scale-95"
            >
              {copiedField === 'password' ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-charcoal-600" />
              )}
              <span className="text-[11px]">{copiedField === 'password' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-charcoal text-white hover:bg-emerald text-xs font-semibold transition-colors mt-2"
        >
          Done
        </button>
      </div>
    </Dialog>
  )
}
