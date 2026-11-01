import React, { useState, useEffect } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { InventoryItem } from '../../types'

export interface IngredientModalProps {
  item: InventoryItem | null
  isOpen: boolean
  onClose: () => void
  onSave: (data: Omit<InventoryItem, 'id' | 'status' | 'lastUpdated' | 'usageHistory'>) => void
}

export const IngredientModal: React.FC<IngredientModalProps> = ({
  item,
  isOpen,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('')
  const [category, setCategory] = useState<InventoryItem['category']>('Produce')
  const [currentStock, setCurrentStock] = useState('10')
  const [minStock, setMinStock] = useState('5')
  const [unit, setUnit] = useState<InventoryItem['unit']>('kg')
  const [costPerUnit, setCostPerUnit] = useState('15')

  useEffect(() => {
    if (item) {
      setName(item.name)
      setCategory(item.category)
      setCurrentStock(String(item.currentStock))
      setMinStock(String(item.minStock))
      setUnit(item.unit)
      setCostPerUnit(String(item.costPerUnit))
    } else {
      setName('')
      setCategory('Produce')
      setCurrentStock('10')
      setMinStock('5')
      setUnit('kg')
      setCostPerUnit('12.50')
    }
  }, [item, isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    onSave({
      name: name.trim(),
      category,
      currentStock: parseFloat(currentStock) || 0,
      minStock: parseFloat(minStock) || 0,
      unit,
      costPerUnit: parseFloat(costPerUnit) || 0,
    })
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title={item ? `Edit Supply: ${item.name}` : 'Add Inventory Item'}
      description="Track kitchen pantry ingredients, threshold alerts, and inventory unit costs."
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <Input
          label="Ingredient / Supply Name"
          placeholder="e.g. San Marzano DOP Tomatoes"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value as any)}
          >
            <option value="Produce">Produce & Fresh Herbs</option>
            <option value="Dairy & Poultry">Dairy & Poultry</option>
            <option value="Meat & Seafood">Meat & Seafood</option>
            <option value="Spices & Pantry">Spices & Dry Pantry</option>
            <option value="Beverages & Bar">Beverages & Craft Bar</option>
          </Select>

          <Select
            label="Stock Unit"
            value={unit}
            onChange={(e) => setUnit(e.target.value as any)}
          >
            <option value="kg">Kilograms (kg)</option>
            <option value="g">Grams (g)</option>
            <option value="L">Liters (L)</option>
            <option value="ml">Milliliters (ml)</option>
            <option value="pcs">Pieces (pcs)</option>
            <option value="cans">Cans</option>
            <option value="bottles">Bottles</option>
            <option value="boxes">Boxes</option>
          </Select>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Input
            label="Current Quantity"
            type="number"
            step="0.1"
            min="0"
            value={currentStock}
            onChange={(e) => setCurrentStock(e.target.value)}
            required
          />
          <Input
            label="Min. Alert Level"
            type="number"
            step="0.1"
            min="0"
            value={minStock}
            onChange={(e) => setMinStock(e.target.value)}
            required
          />
          <Input
            label="Cost per Unit ($)"
            type="number"
            step="0.1"
            min="0"
            value={costPerUnit}
            onChange={(e) => setCostPerUnit(e.target.value)}
            required
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-beige">
          <Button variant="outline" size="sm" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit">
            {item ? 'Save Changes' : 'Add Ingredient'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

