import React, { useState } from 'react'
import { Wifi, Copy, Check, ShieldCheck, Smartphone } from 'lucide-react'
import { Dialog } from '../ui/Dialog'
import { Button } from '../ui/Button'
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
  const instructions = 'Connect and enter the password or scan the guest Wi-Fi QR.'

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
      description="Enjoy seamless high-speed internet while dining at The Olive & Ember."
      maxWidth="sm"
    >
      <div className="space-y-5 text-center">
        {/* Decorative Wi-Fi Emblem */}
        <div className="mx-auto w-16 h-16 rounded-full bg-gold-50 border border-gold-200 flex items-center justify-center text-gold-700 shadow-soft">
          <Wifi className="w-8 h-8" />
        </div>

        {/* Credentials Cards */}
        <div className="space-y-3 text-left">
          {/* Network Name */}
          <div className="p-3.5 rounded-2xl bg-cream-100/80 border border-beige flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-charcoal-600">
                Network Name (SSID)
              </div>
              <div className="text-base font-serif font-bold text-charcoal tracking-wide mt-0.5">
                {network}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(network, 'network', 'Network Name')}
              className="bg-white hover:bg-cream-200"
            >
              {copiedField === 'network' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </Button>
          </div>

          {/* Password */}
          <div className="p-3.5 rounded-2xl bg-cream-100/80 border border-beige flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-charcoal-600">
                Wi-Fi Password
              </div>
              <div className="text-base font-mono font-bold text-charcoal tracking-wider mt-0.5">
                {password}
              </div>
            </div>
            <Button
              variant="gold"
              size="sm"
              onClick={() => copyToClipboard(password, 'password', 'Password')}
            >
              {copiedField === 'password' ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Info badges */}
        <div className="flex items-center justify-center gap-4 text-xs text-charcoal-600 pt-1">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Secure 5G Fiber</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Smartphone className="w-4 h-4 text-gold-700" />
            <span>No login portal required</span>
          </div>
        </div>

        <p className="text-xs text-charcoal-600 leading-relaxed px-2">
          {instructions}
        </p>

        <Button variant="primary" size="md" className="w-full" onClick={onClose}>
          Done
        </Button>
      </div>
    </Dialog>
  )
}
