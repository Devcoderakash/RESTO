export type CategoryId = string

export interface MenuCategory {
  id: CategoryId
  name: string
  description?: string
  icon?: string
}

export interface CustomizationOption {
  id: string
  name: string
  price: number
  isDefault?: boolean
}

export interface CustomizationGroup {
  id: string
  name: string
  type: 'single' | 'multiple'
  required: boolean
  maxSelections?: number
  options: CustomizationOption[]
}

export interface FoodItem {
  id: string
  name: string
  description: string
  price: number
  category: CategoryId
  image: string
  isVegetarian: boolean
  dietaryType: 'veg' | 'non-veg'
  isPopular?: boolean
  isChefSpecial?: boolean
  isAvailable: boolean
  preparationTime: string
  calories?: string
  tags?: string[]
  customizationGroups?: CustomizationGroup[]
}
