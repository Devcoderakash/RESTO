import React from 'react'
import { Card } from '../ui/Card'
import { Category } from '../../types'
import {
  Layers,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  UtensilsCrossed,
} from 'lucide-react'

export interface CategoryCardProps {
  category: Category
  index: number
  totalCount: number
  onEdit: (cat: Category) => void
  onDelete: (cat: Category) => void
  onToggleActive: (id: string) => void
  onMoveUp: (index: number) => void
  onMoveDown: (index: number) => void
}

export const CategoryCard: React.FC<CategoryCardProps> = ({
  category,
  index,
  totalCount,
  onEdit,
  onDelete,
  onToggleActive,
  onMoveUp,
  onMoveDown,
}) => {
  return (
    <Card hoverEffect className="overflow-hidden flex flex-col justify-between group">
      {/* Category Cover */}
      <div className="relative h-32 w-full bg-stone-100 overflow-hidden">
        {category.image ? (
          <img
            src={category.image}
            alt={category.name}
            className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${
              !category.isActive ? 'grayscale opacity-60' : ''
            }`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-canvas">
            <Layers className="w-8 h-8 text-brand" />
          </div>
        )}

        <div className="absolute top-3 left-3">
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-sidebar/85 backdrop-blur-xs text-white border border-sidebar-border shadow-xs">
            {category.itemCount} item{category.itemCount === 1 ? '' : 's'}
          </span>
        </div>

        <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(category)}
            className="p-1.5 rounded-lg bg-white/90 text-charcoal hover:bg-white hover:text-brand shadow-sm transition-all"
            title="Edit category"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(category)}
            className="p-1.5 rounded-lg bg-white/90 text-charcoal hover:bg-white hover:text-rose-600 shadow-sm transition-all"
            title="Delete category"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-bold text-charcoal truncate">{category.name}</h4>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                category.isActive
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-stone-100 text-stone-600 border-stone-200'
              }`}
            >
              {category.isActive ? 'Active' : 'Hidden'}
            </span>
          </div>
          <p className="text-xs text-charcoal-muted mt-1.5 line-clamp-2 leading-relaxed">
            {category.description || 'No description provided.'}
          </p>
        </div>

        {/* Reorder and toggle bar */}
        <div className="mt-4 pt-3 border-t border-beige/60 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1">
            <button
              disabled={index === 0}
              onClick={() => onMoveUp(index)}
              className="p-1 rounded text-charcoal-muted hover:text-charcoal disabled:opacity-30 disabled:pointer-events-none hover:bg-beige-light transition-colors"
              title="Move Up"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
            <button
              disabled={index === totalCount - 1}
              onClick={() => onMoveDown(index)}
              className="p-1 rounded text-charcoal-muted hover:text-charcoal disabled:opacity-30 disabled:pointer-events-none hover:bg-beige-light transition-colors"
              title="Move Down"
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] text-charcoal-muted ml-1">Order #{index + 1}</span>
          </div>

          <button
            onClick={() => onToggleActive(category.id)}
            className="flex items-center gap-1 text-[11px] font-medium text-charcoal-soft hover:text-brand transition-colors"
          >
            {category.isActive ? (
              <>
                <Eye className="w-3.5 h-3.5 text-emerald-600" /> Visible
              </>
            ) : (
              <>
                <EyeOff className="w-3.5 h-3.5 text-stone-400" /> Hidden
              </>
            )}
          </button>
        </div>
      </div>
    </Card>
  )
}

