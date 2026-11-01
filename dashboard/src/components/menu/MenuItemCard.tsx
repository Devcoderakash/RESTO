import React from 'react'
import { Card } from '../ui/Card'
import { MenuItem } from '../../types'
import { formatCurrency } from '../../lib/utils'
import {
  Clock,
  Flame,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Sparkles,
} from 'lucide-react'

export interface MenuItemCardProps {
  item: MenuItem
  onEdit: (item: MenuItem) => void
  onDelete: (item: MenuItem) => void
  onToggleAvailability: (id: string) => void
  onTogglePopular: (id: string) => void
}

export const MenuItemCard: React.FC<MenuItemCardProps> = ({
  item,
  onEdit,
  onDelete,
  onToggleAvailability,
  onTogglePopular,
}) => {
  return (
    <Card hoverEffect className="overflow-hidden flex flex-col justify-between group">
      {/* Top Image & Badges */}
      <div className="relative h-44 w-full bg-stone-100 overflow-hidden">
        <img
          src={item.imageUrl}
          alt={item.name}
          className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${
            !item.isAvailable ? 'grayscale opacity-60' : ''
          }`}
        />

        {/* Dietary Tag */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          <span
            className={`w-5 h-5 rounded-md flex items-center justify-center border-2 shadow-xs ${
              item.isVeg
                ? 'bg-white border-emerald-600'
                : 'bg-white border-rose-600'
            }`}
            title={item.isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                item.isVeg ? 'bg-emerald-600' : 'bg-rose-600'
              }`}
            />
          </span>

          {item.isPopular && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sidebar text-brand shadow-xs border border-brand/30">
              <Flame className="w-3 h-3 fill-brand" /> Best Seller
            </span>
          )}
        </div>

        {/* Availability Overlay Badge */}
        {!item.isAvailable && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="px-3 py-1 rounded-full bg-rose-600 text-white font-bold text-xs uppercase tracking-wider shadow-md">
              Sold Out
            </span>
          </div>
        )}

        {/* Action icons hover menu */}
        <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(item)}
            className="p-1.5 rounded-lg bg-white/90 text-charcoal hover:bg-white hover:text-brand shadow-sm transition-all"
            title="Edit item"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(item)}
            className="p-1.5 rounded-lg bg-white/90 text-charcoal hover:bg-white hover:text-rose-600 shadow-sm transition-all"
            title="Delete item"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-charcoal-muted">
                {item.categoryName}
              </p>
              <h4 className="text-sm font-bold text-charcoal mt-0.5 line-clamp-1">
                {item.name}
              </h4>
            </div>
            <span className="text-sm font-bold font-serif text-brand shrink-0">
              {formatCurrency(item.price)}
            </span>
          </div>

          <p className="text-xs text-charcoal-muted line-clamp-2 mt-2 leading-relaxed">
            {item.description}
          </p>
        </div>

        {/* Item footer & quick toggles */}
        <div className="mt-4 pt-3 border-t border-beige/60 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 text-[11px] text-charcoal-muted">
            <Clock className="w-3 h-3 text-brand" />
            <span>{item.prepTimeMinutes} min</span>
            {item.calories && (
              <>
                <span>•</span>
                <span>{item.calories} kcal</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onTogglePopular(item.id)}
              className={`p-1 rounded-md transition-colors ${
                item.isPopular ? 'text-amber-500' : 'text-charcoal-muted/50 hover:text-charcoal'
              }`}
              title={item.isPopular ? 'Remove from popular' : 'Mark as popular'}
            >
              <Flame className={`w-3.5 h-3.5 ${item.isPopular ? 'fill-amber-400' : ''}`} />
            </button>

            <button
              onClick={() => onToggleAvailability(item.id)}
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border transition-colors ${
                item.isAvailable
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
              }`}
            >
              {item.isAvailable ? 'In Stock' : 'Out of Stock'}
            </button>
          </div>
        </div>
      </div>
    </Card>
  )
}

