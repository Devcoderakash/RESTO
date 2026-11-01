import React, { useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Table } from '../../types'
import { useRestaurantStore } from '../../store/useRestaurantStore'
import { Download, ExternalLink, QrCode, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'

export interface TableQRModalProps {
  table: Table | null
  isOpen: boolean
  onClose: () => void
}

export const TableQRModal: React.FC<TableQRModalProps> = ({ table, isOpen, onClose }) => {
  const { settings } = useRestaurantStore()
  const qrRef = useRef<SVGSVGElement>(null)

  if (!table) return null

  // Format full target URL e.g. https://grandbistrolounge.dineflow.app/menu?table=01
  const baseUrl = settings.profile.website.replace(/\/$/, '')
  const fullUrl = `${baseUrl}${table.qrUrl}`

  const handleCopyLink = () => {
    navigator.clipboard.writeText(fullUrl)
    toast.success('Table QR link copied to clipboard')
  }

  const handleDownloadSVG = () => {
    if (!qrRef.current) return
    const svgData = new XMLSerializer().serializeToString(qrRef.current)
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `DineFlow-Table-${table.tableNumber}-QR.svg`
    link.click()
    URL.revokeObjectURL(url)
    toast.success(`Downloaded SVG QR Code for Table ${table.tableNumber}`)
  }

  const handleDownloadPNG = () => {
    if (!qrRef.current) return
    const svgData = new XMLSerializer().serializeToString(qrRef.current)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()
    canvas.width = 600
    canvas.height = 700

    img.onload = () => {
      if (!ctx) return
      // White background with border
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Header text
      ctx.fillStyle = '#201F1C'
      ctx.font = 'bold 24px Playfair Display, serif'
      ctx.textAlign = 'center'
      ctx.fillText(settings.profile.name, 300, 50)

      ctx.fillStyle = '#B99A62'
      ctx.font = 'bold 18px Plus Jakarta Sans, sans-serif'
      ctx.fillText(`TABLE ${table.tableNumber} • SCAN TO ORDER`, 300, 85)

      // Draw QR Image
      ctx.drawImage(img, 100, 120, 400, 400)

      // Footer
      ctx.fillStyle = '#85827A'
      ctx.font = '14px Plus Jakarta Sans, sans-serif'
      ctx.fillText('Powered by DineFlow QR Dining System', 300, 570)
      ctx.fillText(fullUrl, 300, 600)

      const pngUrl = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.href = pngUrl
      link.download = `DineFlow-Table-${table.tableNumber}-Stand.png`
      link.click()
      toast.success(`Downloaded Table ${table.tableNumber} Print Stand PNG`)
    }

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <div className="space-y-6 text-center">
        {/* Printable Stand Preview Card */}
        <div className="bg-canvas/50 p-6 rounded-2xl border border-beige flex flex-col items-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 border border-brand/20 text-brand text-xs font-semibold mb-3">
            <QrCode className="w-3.5 h-3.5" />
            <span>Official Dining Stand Standee</span>
          </div>

          <h3 className="text-xl font-bold font-serif text-charcoal">
            Table {table.tableNumber}
          </h3>
          <p className="text-xs text-charcoal-muted mt-0.5">{table.zone} ({table.capacity} Guests)</p>

          {/* Render real SVG QR Code */}
          <div className="bg-white p-5 rounded-2xl shadow-card border border-beige my-5 flex items-center justify-center">
            <QRCodeSVG
              ref={qrRef}
              value={fullUrl}
              size={200}
              level="H"
              includeMargin={false}
              fgColor="#201F1C"
              bgColor="#FFFFFF"
            />
          </div>

          <p className="text-xs text-charcoal-muted max-w-xs leading-relaxed">
            Guests scan this QR code using their smartphone camera to open the live interactive menu and submit orders directly to your kitchen.
          </p>

          <div className="mt-3 flex items-center gap-1.5 text-xs text-charcoal font-mono bg-white px-3 py-1.5 rounded-xl border border-beige max-w-full truncate">
            <span className="truncate">{fullUrl}</span>
            <button
              onClick={handleCopyLink}
              className="text-brand hover:text-brand-dark p-1 shrink-0"
              title="Copy link"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="w-full sm:w-auto"
            leftIcon={<Download className="w-4 h-4" />}
            onClick={handleDownloadSVG}
          >
            Download SVG QR
          </Button>

          <Button
            variant="primary"
            size="sm"
            className="w-full sm:w-auto"
            leftIcon={<Download className="w-4 h-4" />}
            onClick={handleDownloadPNG}
          >
            Download Table Stand PNG
          </Button>
        </div>
      </div>
    </Modal>
  )
}

