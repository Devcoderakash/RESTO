import React from 'react'
import { Card } from '../ui/Card'
import { MenuItem } from '../../types'
import { formatCurrency } from '../../lib/utils'
import { Edit2, Trash2, Flame, Clock } from 'lucide-react'

export interface MenuTableViewProps {
  items: MenuItem[]
  onEdit: (item: MenuItem) => void
  onDelete: (item: MenuItem) => void
  onToggleAvailability: (id: string) => void
  onTogglePopular: (id: string) => void
}

export const MenuTableView: React.FC<MenuTableViewProps> = ({
  items,
  onEdit,
  onDelete,
  onToggleAvailability,
  onTogglePopular,
}) => {
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-canvas/70 text-charcoal-muted uppercase text-[10px] tracking-wider border-b border-beige">
            <tr>
              <th className="py-3.5 px-5 font-semibold">Dish</th>
              <th className="py-3.5 px-4 font-semibold">Category</th>
              <th className="py-3.5 px-4 font-semibold">Diet</th>
              <th className="py-3.5 px-4 font-semibold">Price</th>
              <th className="py-3.5 px-4 font-semibold">Prep Time</th>
              <th className="py-3.5 px-4 font-semibold">Popular</th>
              <th className="py-3.5 px-4 font-semibold">Status</th>
              <th className="py-3.5 px-5 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-beige/60">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-canvas/40 transition-colors">
                <td className="py-3.5 px-5">
                  <div className="flex items-center gap-3">
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-10 h-10 rounded-xl object-cover border border-beige shrink-0"
                    />
                    <div>
                      <p className="font-semibold text-charcoal">{item.name}</p>
                      <p className="text-[11px] text-charcoal-muted max-w-[200px] truncate">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="py-3.5 px-4 text-charcoal font-medium">
                  {item.categoryName}
                </td>
                <td className="py-3.5 px-4">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                      item.isVeg
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border-rose-200'
                    }`}
                  >
                    {item.isVeg ? 'Veg' : 'Non-Veg'}
                  </span>
                </td>
                <td className="py-3.5 px-4 font-bold text-charcoal font-serif">
                  {formatCurrency(item.price)}
                </td>
                <td className="py-3.5 px-4 text-charcoal-muted">
                  {item.prepTimeMinutes} min
                </td>
                <td className="py-3.5 px-4">
                  <button
                    onClick={() => onTogglePopular(item.id)}
                    className={`p-1 rounded-md transition-colors ${
                      item.isPopular ? 'text-amber-500' : 'text-stone-300 hover:text-charcoal'
                    }`}
                  >
                    <Flame className={`w-4 h-4 ${item.isPopular ? 'fill-amber-400' : ''}`} />
                  </button>
                </td>
                <td className="py-3.5 px-4">
                  <button
                    onClick={() => onToggleAvailability(item.id)}
                    className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border transition-colors ${
                      item.isAvailable
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border-rose-200'
                    }`}
                  >
                    {item.isAvailable ? 'In Stock' : 'Sold Out'}
                  </button>
                </td>
                <td className="py-3.5 px-5 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => onEdit(item)}
                      className="p-1.5 rounded-lg text-charcoal-muted hover:text-charcoal hover:bg-beige-light transition-colors"
                      title="Edit Item"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDelete(item)}
                      className="p-1.5 rounded-lg text-charcoal-muted hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Delete Item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

