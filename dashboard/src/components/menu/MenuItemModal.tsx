import React, { useState, useEffect, useRef } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input, Textarea } from '../ui/Input'
import { Select } from '../ui/Select'
import { Switch } from '../ui/Switch'
import { MenuItem, Category } from '../../types'
import { Upload, Image as ImageIcon, Plus, Trash2, Loader2 } from 'lucide-react'
import { api } from '../../services/api'

export interface MenuItemModalProps {
  item: MenuItem | null
  categories: Category[]
  isOpen: boolean
  onClose: () => void
  onSave: (data: Omit<MenuItem, 'id' | 'createdAt'>) => void | boolean | Promise<void | boolean>
}

const sampleImages = [
  'https://images.unsplash.com/photo-1541529086526-db283c563270?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1558030006-450675393462?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&auto=format&fit=crop&q=80',
]

export const MenuItemModal: React.FC<MenuItemModalProps> = ({
  item,
  categories,
  isOpen,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [isVeg, setIsVeg] = useState(true)
  const [isAvailable, setIsAvailable] = useState(true)
  const [isPopular, setIsPopular] = useState(false)
  const [prepTimeMinutes, setPrepTimeMinutes] = useState('15')
  const [calories, setCalories] = useState('')
  const [imageUrl, setImageUrl] = useState(sampleImages[0])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [customizationName, setCustomizationName] = useState('')
  const [customizationChoice, setCustomizationChoice] = useState('')
  const [customizationPrice, setCustomizationPrice] = useState('0')

  useEffect(() => {
    if (item) {
      setName(item.name)
      setDescription(item.description)
      setPrice(String(item.price))
      setCategoryId(item.categoryId)
      setIsVeg(item.isVeg)
      setIsAvailable(item.isAvailable)
      setIsPopular(item.isPopular)
      setPrepTimeMinutes(String(item.prepTimeMinutes))
      setCalories(item.calories ? String(item.calories) : '')
      setImageUrl(item.imageUrl)
    } else {
      setName('')
      setDescription('')
      setPrice('18.00')
      setCategoryId(categories[0]?.id || '')
      setIsVeg(true)
      setIsAvailable(true)
      setIsPopular(false)
      setPrepTimeMinutes('15')
      setCalories('450')
      setImageUrl(sampleImages[0])
    }
  }, [item, categories, isOpen])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image exceeds 5MB limit.')
      return
    }
    setIsUploading(true)
    setUploadError(null)
    try {
      const res = await api.uploadImage(file)
      if (res?.url) {
        setImageUrl(res.url)
      }
    } catch (err: any) {
      setUploadError(err.message || 'Image upload failed')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    const selectedCategory = categories.find((c) => c.id === categoryId) || categories[0]

    const saved = await onSave({
      name: name.trim(),
      description: description.trim(),
      price: parseFloat(price) || 0,
      categoryId: selectedCategory?.id || '',
      categoryName: selectedCategory?.name || 'General',
      isVeg,
      isAvailable,
      isPopular,
      prepTimeMinutes: parseInt(prepTimeMinutes) || 15,
      calories: calories ? parseInt(calories) : undefined,
      imageUrl: imageUrl.trim() || sampleImages[0],
    })
    if (saved !== false) onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={item ? `Edit Dish: ${item.name}` : 'Add New Menu Item'}
      description="Update food recipe details, pricing, dietary flags, and image."
    >
      <form onSubmit={handleSubmit} className="space-y-5 text-xs">
        {/* Name & Price */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <Input
              label="Dish Name"
              placeholder="e.g. Truffle Burrata Bruschetta"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <Input
              label="Price ($)"
              type="number"
              step="0.5"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Category & Dietary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <Select
              label="Menu Category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Select
              label="Dietary Type"
              value={isVeg ? 'veg' : 'nonveg'}
              onChange={(e) => setIsVeg(e.target.value === 'veg')}
            >
              <option value="veg">Vegetarian</option>
              <option value="nonveg">Non-Vegetarian</option>
            </Select>
          </div>
        </div>

        {/* Description */}
        <Textarea
          label="Menu Description & Ingredients"
          placeholder="Describe ingredients, cooking technique, and tasting notes..."
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />

        {/* Prep Time & Calories */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Prep Time (Minutes)"
            type="number"
            min="1"
            value={prepTimeMinutes}
            onChange={(e) => setPrepTimeMinutes(e.target.value)}
          />
          <Input
            label="Approx. Calories (kcal)"
            type="number"
            placeholder="e.g. 480"
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
          />
        </div>

        {/* Image upload UI with preview */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-charcoal-soft">
              Dish Image
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="h-7 text-[11px] gap-1.5 py-0 px-2.5"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  Upload Image
                </>
              )}
            </Button>
          </div>
          {uploadError && (
            <p className="text-[11px] text-red-500 mb-1.5 font-medium">{uploadError}</p>
          )}
          <div className="flex items-center gap-4">
            <img
              src={imageUrl}
              alt="Preview"
              className="w-16 h-16 rounded-xl object-cover border border-beige shadow-xs shrink-0"
            />
            <div className="flex-1 space-y-1.5">
              <Input
                placeholder="Paste Image URL or pick preset below"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
              <div className="flex items-center gap-1.5 overflow-x-auto">
                <span className="text-[10px] text-charcoal-muted">Presets:</span>
                {sampleImages.map((src, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setImageUrl(src)}
                    className="w-6 h-6 rounded-md overflow-hidden border border-beige hover:border-brand shrink-0"
                  >
                    <img src={src} alt="preset" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Availability & Popular Toggles */}
        <div className="p-3.5 bg-canvas/60 rounded-xl border border-beige grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Switch
            label="Available in Menu"
            description="Toggle to mark as In Stock or Sold Out"
            checked={isAvailable}
            onChange={setIsAvailable}
          />
          <Switch
            label="Highlight as Best Seller"
            description="Shows popular flame badge on QR menu"
            checked={isPopular}
            onChange={setIsPopular}
          />
        </div>

        {/* Form actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-beige">
          <Button variant="outline" size="sm" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit">
            {item ? 'Save Changes' : 'Create Item'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
