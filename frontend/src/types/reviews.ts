export interface CustomerReview {
  id: string
  author: string
  rating: number // 1 to 5
  date: string
  comment: string
  recommendedDish?: string
  isVerifiedGuest: boolean
}

export interface ReviewStats {
  averageRating: number
  totalReviews: number
  ratingDistribution: {
    5: number
    4: number
    3: number
    2: number
    1: number
  }
}
