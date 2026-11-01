import { FoodItem } from './menu'

export interface SelectedCustomization {
  groupId: string
  groupName: string
  optionId: string
  optionName: string
  price: number
}

export interface CartItem {
  cartItemId: string // unique hash of food id + selected customizations
  foodItem: FoodItem
  quantity: number
  selectedCustomizations: SelectedCustomization[]
  specialInstructions?: string
  unitPriceWithCustomizations: number
  lineTotal: number
}

export interface BillBreakdown {
  subtotal: number
  cgst: number // 2.5%
  sgst: number // 2.5%
  gstTotal: number // 5%
  serviceCharge: number // 5% optional/discretionary
  finalTotal: number
}
