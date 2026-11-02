import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  UtensilsCrossed,
  Banknote,
  QrCode,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  Clock,
} from 'lucide-react'
import confetti from 'canvas-confetti'
import { DietaryBadge } from '../components/menu/DietaryBadge'
import { CartSummary } from '../components/cart/CartSummary'
import { useCartStore } from '../store/cartStore'
import { useTableStore } from '../store/tableStore'
import { useRestaurantStore } from '../store/restaurantStore'
import { formatCurrency } from '../lib/formatters'
import { PaymentMethod } from '../types/order'
import { toast } from 'sonner'
import { createCustomerOrder } from '../services/api'

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate()
  const restaurantInfo = useRestaurantStore((s) => s.info)
  const { items, getBreakdown, clearCart } = useCartStore()
  const { currentTable, hasSelectedTable, guestName, setGuestDetails } = useTableStore()

  const [name, setName] = useState(guestName || '')
  const [phone, setPhone] = useState('')
  const [orderNotes, setOrderNotes] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('counter')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const idempotencyKey = useRef<string | null>(sessionStorage.getItem('checkout-idempotency-key'))

  const breakdown = getBreakdown()

  useEffect(() => {
    if (!hasSelectedTable || !currentTable) navigate('/select-table', { replace: true })
  }, [currentTable, hasSelectedTable, navigate])

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-canvas py-16 px-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-beige shadow-soft text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-cream-100 border border-beige flex items-center justify-center text-charcoal-600/70 mx-auto">
            <UtensilsCrossed className="w-7 h-7 text-gold-700" />
          </div>
          <div className="space-y-1">
            <h2 className="font-serif font-bold text-xl text-charcoal">Your cart is empty</h2>
            <p className="text-xs text-charcoal-600">
              There are no dishes in your table cart to place an order.
            </p>
          </div>
          <Link
            to="/menu"
            className="inline-flex items-center justify-center w-full py-3 px-5 rounded-xl bg-charcoal hover:bg-emerald text-white text-xs font-semibold transition-colors"
          >
            Return to Digital Menu
          </Link>
        </div>
      </div>
    )
  }

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#C5A265', '#191816', '#0E3A2F', '#15803D'],
      })
    } catch {
      // Confetti fallback
    }
  }

  const handlePlaceOrder = async () => {
    if (isSubmitting) return
    setIsSubmitting(true)
    idempotencyKey.current ??= crypto.randomUUID()
    sessionStorage.setItem('checkout-idempotency-key', idempotencyKey.current)
    try {
      const order = await createCustomerOrder({
        tableNumber: currentTable,
        customerName: name.trim() || undefined,
        customerPhone: phone.trim() || undefined,
        items,
        paymentMethod,
        specialInstructions: orderNotes.trim() || undefined,
        idempotencyKey: idempotencyKey.current,
      })
      const trackingToken = order.trackingToken ?? order.accessToken
      if (trackingToken) {
        sessionStorage.setItem(`order-tracking:${order.id}`, trackingToken)
        localStorage.setItem(`order-tracking:${order.id}`, trackingToken)
      }
      sessionStorage.removeItem('checkout-idempotency-key')
      if (name.trim()) setGuestDetails(name.trim(), 2)
      idempotencyKey.current = null
      triggerConfetti()
      clearCart()
      toast.success(`Order #${order.orderNumber || order.id} sent to kitchen!`, {
        description: `Preparing for Table ${currentTable || '01'}. Live updates enabled.`,
        icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
      })
      navigate(`/order-tracking/${order.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to place your order. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-canvas text-charcoal pb-32 selection:bg-gold/20 selection:text-charcoal">
      {/* Checkout Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-beige py-3.5 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link
            to="/menu"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-charcoal-600 hover:text-charcoal transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Menu</span>
          </Link>

          <div className="text-center">
            <h1 className="font-serif font-bold text-base sm:text-lg text-charcoal tracking-tight">
              Review & Place Order
            </h1>
            <p className="text-[11px] text-charcoal-600 font-medium">
              {restaurantInfo?.name || 'The Olive & Ember'}
            </p>
          </div>

          <div className="text-right">
            <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold bg-gold-50 text-charcoal border border-gold-300">
              TABLE {currentTable || '01'}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-5 sm:pt-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6">
          {/* Left Column: Guest & Payment Options (7 cols) */}
          <div className="md:col-span-7 space-y-5">
            {/* Table Confirmation Banner */}
            <div className="p-4 rounded-2xl bg-white border border-beige shadow-soft flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gold-50 border border-gold-200 flex items-center justify-center text-gold-700">
                  <UtensilsCrossed className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-charcoal-600">
                    Dining Seating
                  </div>
                  <div className="font-serif font-bold text-base text-charcoal">
                    Table {currentTable || '01'}
                  </div>
                  <div className="text-[11px] text-emerald-700 flex items-center gap-1 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Seating verified for fast service</span>
                  </div>
                </div>
              </div>

              <Link
                to="/select-table"
                className="text-xs text-gold-700 font-semibold hover:underline"
              >
                Change
              </Link>
            </div>

            {/* Guest Details & Kitchen Request */}
            <div className="p-5 rounded-2xl bg-white border border-beige shadow-soft space-y-4">
              <div>
                <h2 className="font-serif font-bold text-base text-charcoal">Guest Details (Optional)</h2>
                <p className="text-[11px] text-charcoal-600 mt-0.5">
                  No login required. Provide your details so servers can address you.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-charcoal-600">
                    Guest Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. John / Sarah"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-beige bg-cream-50/50 text-charcoal text-xs sm:text-sm placeholder:text-charcoal-600/50 focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-charcoal-600">
                    Mobile Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 00000"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-beige bg-cream-50/50 text-charcoal text-xs sm:text-sm placeholder:text-charcoal-600/50 focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-charcoal-600">
                  Kitchen Instructions & Allergy Notes
                </label>
                <textarea
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="e.g. Extra parmesan on pizza, dressings on the side, nut allergy..."
                  rows={2}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-beige bg-cream-50/50 text-charcoal text-xs sm:text-sm placeholder:text-charcoal-600/50 focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold transition-all resize-none"
                />
              </div>
            </div>

            {/* Payment Preference */}
            <div className="p-5 rounded-2xl bg-white border border-beige shadow-soft space-y-3.5">
              <div>
                <h2 className="font-serif font-bold text-base text-charcoal">Payment Preference</h2>
                <p className="text-[11px] text-charcoal-600 mt-0.5">
                  Choose how you prefer to settle your table bill.
                </p>
              </div>

              <div className="space-y-2.5">
                {/* Option 1: Pay at Counter */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('counter')}
                  className={`w-full p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all ${
                    paymentMethod === 'counter'
                      ? 'border-gold bg-gold-50/60 ring-1 ring-gold shadow-xs'
                      : 'border-beige hover:border-gold-300 bg-white'
                  }`}
                >
                  <div className="w-9 h-9 rounded-lg bg-cream-100 border border-beige flex items-center justify-center text-charcoal shrink-0 mt-0.5">
                    <Banknote className="w-4.5 h-4.5 text-gold-700" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-serif font-bold text-sm text-charcoal">
                        Pay at Counter / Table Settle
                      </span>
                      <span className="text-[10px] font-semibold text-charcoal bg-gold-100 px-2 py-0.5 rounded">
                        Standard
                      </span>
                    </div>
                    <p className="text-[11px] text-charcoal-600 mt-0.5 leading-relaxed">
                      Place order now. Enjoy your dining experience and settle upon exit via Cash, Card, or UPI.
                    </p>
                  </div>
                </button>

                {/* Option 2: Instant UPI */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('upi')}
                  className={`w-full p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all ${
                    paymentMethod === 'upi'
                      ? 'border-gold bg-gold-50/60 ring-1 ring-gold shadow-xs'
                      : 'border-beige hover:border-gold-300 bg-white'
                  }`}
                >
                  <div className="w-9 h-9 rounded-lg bg-cream-100 border border-beige flex items-center justify-center text-charcoal shrink-0 mt-0.5">
                    <QrCode className="w-4.5 h-4.5 text-gold-700" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-serif font-bold text-sm text-charcoal">
                        Instant UPI Payment
                      </span>
                      <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Fast Track
                      </span>
                    </div>
                    <p className="text-[11px] text-charcoal-600 mt-0.5 leading-relaxed">
                      Instant contactless table settlement via UPI QR (GPay / PhonePe / Paytm).
                    </p>
                  </div>
                </button>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-charcoal-600 pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Simulated dining transaction • Secure order pipeline</span>
              </div>
            </div>
          </div>

          {/* Right Column: Order Summary (5 cols) */}
          <div className="md:col-span-5 space-y-4">
            <div className="p-5 rounded-2xl bg-white border border-beige shadow-soft space-y-4">
              <div className="flex items-center justify-between border-b border-beige pb-3">
                <h3 className="font-serif font-bold text-base text-charcoal">Order Summary</h3>
                <span className="text-[11px] text-charcoal-600 font-medium">
                  {items.length} {items.length === 1 ? 'item' : 'items'}
                </span>
              </div>

              {/* Items List */}
              <div className="divide-y divide-beige/60 max-h-64 overflow-y-auto pr-1 space-y-2">
                {items.map((item) => (
                  <div key={item.cartItemId} className="pt-2 first:pt-0 flex items-start justify-between gap-2.5 text-xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 font-medium text-charcoal">
                        <DietaryBadge isVeg={item.foodItem.isVegetarian} size="sm" />
                        <span className="font-serif font-bold text-xs sm:text-sm">{item.foodItem.name}</span>
                        <span className="text-gold-700 font-mono font-bold">×{item.quantity}</span>
                      </div>

                      {item.selectedCustomizations.length > 0 && (
                        <div className="text-[10px] text-charcoal-600 pl-4">
                          {item.selectedCustomizations.map((c) => c.optionName).join(', ')}
                        </div>
                      )}

                      {item.specialInstructions && (
                        <div className="text-[10px] text-charcoal-600 italic pl-4">
                          "{item.specialInstructions}"
                        </div>
                      )}
                    </div>

                    <div className="text-right font-serif font-bold text-charcoal shrink-0">
                      {formatCurrency(item.lineTotal)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Price Breakdown */}
              <div className="pt-3 border-t border-beige">
                <CartSummary breakdown={breakdown} />
              </div>

              {/* Submit CTA (Desktop only) */}
              <div className="hidden md:block pt-2 space-y-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handlePlaceOrder}
                  className="w-full py-3.5 px-4 rounded-xl bg-charcoal hover:bg-emerald text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200 shadow-sm active:scale-[0.98] disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4 text-gold" />
                  <span>
                    {isSubmitting
                      ? 'Sending to Kitchen...'
                      : `Confirm & Place Order • ${formatCurrency(breakdown.finalTotal)}`}
                  </span>
                </button>

                <p className="text-[10px] text-center text-charcoal-600">
                  Dishes will be expedited to Table {currentTable || '01'}.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Sticky Place Order Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 p-3.5 bg-white/95 backdrop-blur-md border-t border-beige shadow-elevated safe-bottom z-40">
        <div className="flex items-center justify-between gap-3 max-w-md mx-auto">
          <div>
            <div className="text-[10px] text-charcoal-600 font-medium">Total incl. 5% GST</div>
            <div className="font-serif font-black text-base text-charcoal">
              {formatCurrency(breakdown.finalTotal)}
            </div>
          </div>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={handlePlaceOrder}
            className="flex-1 py-3 px-4 rounded-xl bg-charcoal hover:bg-emerald text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 text-gold" />
            <span>{isSubmitting ? 'Sending...' : 'Place Order →'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
