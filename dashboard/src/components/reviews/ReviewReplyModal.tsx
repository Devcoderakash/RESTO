import React, { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Textarea } from '../ui/Input'
import { CustomerReview } from '../../types'
import { MessageSquare, Star, Send } from 'lucide-react'

export interface ReviewReplyModalProps {
  review: CustomerReview | null
  isOpen: boolean
  onClose: () => void
  onSubmitReply: (reviewId: string, replyText: string, managerName: string) => void
}

export const ReviewReplyModal: React.FC<ReviewReplyModalProps> = ({
  review,
  isOpen,
  onClose,
  onSubmitReply,
}) => {
  const [replyText, setReplyText] = useState('')
  const [managerName, setManagerName] = useState('Antoine Delacroix (General Manager)')

  if (!review) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!replyText.trim()) return

    onSubmitReply(review.id, replyText.trim(), managerName)
    setReplyText('')
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title={
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-brand" />
          <span>Respond to {review.customerName}'s Feedback</span>
        </div>
      }
      description={`Order: ${review.orderId} • Rated ${review.rating} Stars`}
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Customer review quote */}
        <div className="p-3.5 bg-canvas/60 rounded-xl border border-beige space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-charcoal">{review.customerName}</span>
            <div className="flex text-amber-500">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`w-3.5 h-3.5 ${
                    i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-stone-300'
                  }`}
                />
              ))}
            </div>
          </div>
          <p className="text-charcoal-soft italic leading-relaxed">"{review.comment}"</p>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-charcoal-soft mb-1.5">
            Your Official Management Reply
          </label>
          <Textarea
            rows={4}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Thank the guest for their visit and address any specific feedback..."
            required
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-beige">
          <Button variant="outline" size="sm" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            type="submit"
            leftIcon={<Send className="w-3.5 h-3.5" />}
          >
            Post Management Reply
          </Button>
        </div>
      </form>
    </Modal>
  )
}

