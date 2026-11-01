import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  UtensilsCrossed,
  CreditCard,
  Banknote,
  QrCode,
  ShieldCheck,
  Sparkles,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import confetti from 'canvas-confetti'
import { Button } from '../components/ui/Button'
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

  // If cart is empty, redirect or display empty state
  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-cream-100 py-16 px-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-beige shadow-soft text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-cream-100 border border-beige flex items-center justify-center text-charcoal-600 mx-auto">
            <UtensilsCrossed className="w-7 h-7 text-gold-700" />
          </div>
          <div className="space-y-1">
            <h2 className="font-serif font-bold text-2xl text-charcoal">Your cart is empty</h2>
            <p className="text-sm text-charcoal-600">
              There are no dishes in your table cart to checkout.
            </p>
          </div>
          <Link to="/menu">
            <Button variant="gold" size="lg" className="w-full">
              Return to Digital Menu
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#B99A62', '#22211F', '#D3BA8D', '#2E7D32'],
      })
    } catch {
      // Ignore if confetti not supported
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
      }
      sessionStorage.removeItem('checkout-idempotency-key')
      if (name.trim()) setGuestDetails(name.trim(), 2)
      idempotencyKey.current = null
      triggerConfetti()
      clearCart()
      toast.success(`Order #${order.id} sent to kitchen!`, {
        description: `Preparing for Table ${currentTable || '07'}. Follow status on the live tracker.`,
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
    <div className="min-h-screen bg-cream-100/70 pb-20">
      {/* Checkout Navbar */}
      <nav aria-label="Checkout navigation" className="sticky top-0 z-30 glass-header border-b border-beige py-4 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link
            to="/menu"
            className="inline-flex items-center gap-2 text-sm font-medium text-charcoal-700 hover:text-charcoal transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Menu</span>
          </Link>

          <div className="text-center">
            <h1 className="font-serif font-bold text-lg sm:text-xl text-charcoal">
              Order Confirmation
            </h1>
            <p className="text-xs text-charcoal-600">
              {restaurantInfo?.name || 'The Olive & Ember'}
            </p>
          </div>

          <div className="text-right">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-gold-50 text-gold-800 border border-gold-200">
              TABLE {currentTable || '07'}
            </span>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left Column: Form & Table Verification (7 cols) */}
          <div className="md:col-span-7 space-y-6">
            {/* Table context banner */}
            <div className="p-4 rounded-2xl bg-white border border-beige shadow-soft flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gold-50 border border-gold-200 flex items-center justify-center text-gold-700">
                  <UtensilsCrossed className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-charcoal-600">
                    Dining Location
                  </div>
                  <div className="font-serif font-bold text-lg text-charcoal">
                    Table {currentTable || '07'}
                  </div>
                  <div className="text-[11px] text-emerald-700 flex items-center gap-1 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Table Confirmed for Service</span>
                  </div>
                </div>
              </div>

              <Link
                to="/select-table"
                className="text-xs text-gold-700 font-semibold hover:underline"
              >
                Change Table
              </Link>
            </div>

            {/* Guest Information (Optional) */}
            <div className="p-6 rounded-3xl bg-white border border-beige shadow-soft space-y-4">
              <div>
                <h2 className="font-serif font-bold text-lg text-charcoal">Guest Details (Optional)</h2>
                <p className="text-xs text-charcoal-600 mt-0.5">
                  No account needed. Provide name if you'd like your server to address you.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-charcoal-600">
                    Your Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Akash"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-beige bg-cream-50/40 text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-gold/30 focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-charcoal-600">
                    Mobile Number (Optional)
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 00000"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-beige bg-cream-50/40 text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-gold/30 focus:bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-charcoal-600">
                  Kitchen Instructions & Allergy Alerts
                </label>
                <textarea
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="e.g. Please bring drinks first, extra spicy, gluten allergy at table..."
                  rows={2}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-beige bg-cream-50/40 text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-gold/30 focus:bg-white resize-none"
                />
              </div>
            </div>

            {/* Payment Options */}
            <div className="p-6 rounded-3xl bg-white border border-beige shadow-soft space-y-4">
              <div>
                <h2 className="font-serif font-bold text-lg text-charcoal">Select Payment Preference</h2>
                <p className="text-xs text-charcoal-600 mt-0.5">
                  Choose how you prefer to settle the bill for Table {currentTable || '07'}.
                </p>
              </div>

              <div className="space-y-2.5">
                {/* Option 1: Pay at Counter */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('counter')}
                  className={`w-full p-4 rounded-2xl border text-left flex items-start gap-3.5 transition-all ${
                    paymentMethod === 'counter'
                      ? 'border-gold bg-gold-50/60 ring-1 ring-gold shadow-sm'
                      : 'border-beige hover:border-gold/40 bg-white'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-cream-200 border border-beige flex items-center justify-center text-charcoal shrink-0 mt-0.5">
                    <Banknote className="w-5 h-5 text-gold-700" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-serif font-bold text-sm sm:text-base text-charcoal">
                        Pay at Counter / Table Settle
                      </span>
                      <span className="text-[11px] font-semibold text-gold-800 bg-gold-100 px-2 py-0.5 rounded">
                        Most Popular
                      </span>
                    </div>
                    <p className="text-xs text-charcoal-600 mt-1 leading-relaxed">
                      Place your order now. Enjoy your meal and pay when finished via cash, card swipe, or UPI at your table.
                    </p>
                  </div>
                </button>

                {/* Option 2: Demo UPI */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('upi')}
                  className={`w-full p-4 rounded-2xl border text-left flex items-start gap-3.5 transition-all ${
                    paymentMethod === 'upi'
                      ? 'border-gold bg-gold-50/60 ring-1 ring-gold shadow-sm'
                      : 'border-beige hover:border-gold/40 bg-white'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-cream-200 border border-beige flex items-center justify-center text-charcoal shrink-0 mt-0.5">
                    <QrCode className="w-5 h-5 text-gold-700" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-serif font-bold text-sm sm:text-base text-charcoal">
                        Instant UPI Payment (Demo)
                      </span>
                      <span className="text-[11px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Zero Contact
                      </span>
                    </div>
                    <p className="text-xs text-charcoal-600 mt-1 leading-relaxed">
                      Instant simulated scan & pay using GPay / PhonePe / Paytm mock flow.
                    </p>
                  </div>
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs text-charcoal-600 pt-1">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Simulated dining transaction • No actual charge made</span>
              </div>
            </div>
          </div>

          {/* Right Column: Order Summary (5 cols) */}
          <div className="md:col-span-5 space-y-6">
            <div className="p-6 rounded-3xl bg-white border border-beige shadow-soft space-y-4">
              <div className="flex items-center justify-between border-b border-beige pb-3">
                <h3 className="font-serif font-bold text-lg text-charcoal">Order Summary</h3>
                <span className="text-xs text-charcoal-600 font-medium">
                  {items.length} {items.length === 1 ? 'item' : 'items'}
                </span>
              </div>

              {/* Items List */}
              <div className="divide-y divide-beige-light max-h-72 overflow-y-auto pr-1 space-y-2">
                {items.map((item) => (
                  <div key={item.cartItemId} className="pt-2 first:pt-0 flex items-start justify-between gap-3 text-sm">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 font-medium text-charcoal">
                        <DietaryBadge isVeg={item.foodItem.isVegetarian} size="sm" />
                        <span className="font-serif font-bold">{item.foodItem.name}</span>
                        <span className="text-xs text-gold-700 font-mono">×{item.quantity}</span>
                      </div>

                      {item.selectedCustomizations.length > 0 && (
                        <div className="text-[11px] text-charcoal-600 pl-4">
                          {item.selectedCustomizations.map((c) => c.optionName).join(', ')}
                        </div>
                      )}

                      {item.specialInstructions && (
                        <div className="text-[10px] text-charcoal-600/80 italic pl-4">
                          Note: "{item.specialInstructions}"
                        </div>
                      )}
                    </div>

                    <div className="text-right font-serif font-bold text-charcoal shrink-0">
                      {formatCurrency(item.lineTotal)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Tax & Total Breakdown */}
              <div className="pt-3 border-t border-beige">
                <CartSummary breakdown={breakdown} />
              </div>

              {/* Place Order CTA */}
              <div className="pt-2 space-y-2">
                <Button
                  variant="gold"
                  size="lg"
                  className="w-full justify-center shadow-gold-glow text-base"
                  isLoading={isSubmitting}
                  onClick={handlePlaceOrder}
                >
                  <Sparkles className="w-4 h-4 mr-1.5" />
                  <span>Place Order • {formatCurrency(breakdown.finalTotal)}</span>
                </Button>

                <p className="text-[11px] text-center text-charcoal-600 leading-normal">
                  Your order is sent directly to the kitchen display for Table {currentTable || '07'}.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
