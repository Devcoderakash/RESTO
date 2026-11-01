import React from 'react'
import { Link } from 'react-router-dom'
import { UtensilsCrossed, ArrowLeft } from 'lucide-react'
import { Button } from '../components/ui/Button'

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-cream-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white p-8 sm:p-10 rounded-3xl border border-beige shadow-soft text-center space-y-5">
        <div className="w-16 h-16 rounded-full bg-cream-200 border border-beige flex items-center justify-center text-charcoal mx-auto">
          <UtensilsCrossed className="w-7 h-7 text-gold-700" />
        </div>
        <div className="space-y-1">
          <span className="text-xs uppercase font-bold text-gold-700 tracking-wider">
            Error 404
          </span>
          <h2 className="font-serif font-bold text-2xl text-charcoal">Page Not Found</h2>
          <p className="text-sm text-charcoal-600">
            The table or dining page you are looking for does not exist.
          </p>
        </div>
        <Link to="/">
          <Button variant="gold" size="lg" className="w-full">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Return to The Olive & Ember
          </Button>
        </Link>
      </div>
    </div>
  )
}
