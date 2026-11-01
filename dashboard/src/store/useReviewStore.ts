import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { CustomerReview } from '../types'

interface ReviewState {
  reviews: CustomerReview[]
  ratingFilter: number | 'ALL'
  replyFilter: 'ALL' | 'REPLIED' | 'PENDING'
  searchQuery: string
  selectedReview: CustomerReview | null
  setRatingFilter: (rating: number | 'ALL') => void
  setReplyFilter: (filter: 'ALL' | 'REPLIED' | 'PENDING') => void
  setSearchQuery: (query: string) => void
  setSelectedReview: (review: CustomerReview | null) => void
  addReply: (reviewId: string, replyText: string, managerName: string) => void
  resetReviews: () => void
}

export const useReviewStore = create<ReviewState>()(
  persist(
    (set) => ({
      reviews: [],
      ratingFilter: 'ALL',
      replyFilter: 'ALL',
      searchQuery: '',
      selectedReview: null,
      setRatingFilter: (rating) => set({ ratingFilter: rating }),
      setReplyFilter: (filter) => set({ replyFilter: filter }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setSelectedReview: (review) => set({ selectedReview: review }),
      addReply: (reviewId, replyText, managerName) => {
        const now = new Date().toISOString()
        set((state) => ({
          reviews: state.reviews.map((r) =>
            r.id === reviewId
              ? {
                  ...r,
                  reply: {
                    text: replyText,
                    repliedAt: now,
                    repliedBy: managerName || 'Antoine Delacroix (Manager)',
                  },
                }
              : r
          ),
          selectedReview:
            state.selectedReview?.id === reviewId
              ? {
                  ...state.selectedReview,
                  reply: {
                    text: replyText,
                    repliedAt: now,
                    repliedBy: managerName || 'Antoine Delacroix (Manager)',
                  },
                }
              : state.selectedReview,
        }))
      },
      resetReviews: () => set({ reviews: [], selectedReview: null }),
    }),
    {
      name: 'dineflow_reviews_store',
    }
  )
)

