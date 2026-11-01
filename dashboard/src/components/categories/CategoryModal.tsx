import React, { useState, useEffect } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input, Textarea } from '../ui/Input'
import { Switch } from '../ui/Switch'
import { Category } from '../../types'

export interface CategoryModalProps {
  category: Category | null
  isOpen: boolean
  onClose: () => void
  onSave: (data: Omit<Category, 'id' | 'itemCount'>) => void | boolean | Promise<void | boolean>
}

const sampleCategoryImages = [
  'https://images.unsplash.com/photo-1541529086526-db283c563270?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=400&auto=format&fit=crop&q=80',
]

export const CategoryModal: React.FC<CategoryModalProps> = ({
  category,
  isOpen,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [image, setImage] = useState(sampleCategoryImages[0])
  const [isActive, setIsActive] = useState(true)
  const [sortOrder, setSortOrder] = useState('1')

  useEffect(() => {
    if (category) {
      setName(category.name)
      setSlug(category.slug)
      setDescription(category.description || '')
      setImage(category.image || sampleCategoryImages[0])
      setIsActive(category.isActive)
      setSortOrder(String(category.sortOrder))
    } else {
      setName('')
      setSlug('')
      setDescription('')
      setImage(sampleCategoryImages[0])
      setIsActive(true)
      setSortOrder('1')
    }
  }, [category, isOpen])

  const handleNameChange = (val: string) => {
    setName(val)
    if (!category) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    const saved = await onSave({
      name: name.trim(),
      slug: slug.trim() || name.toLowerCase().replace(/\s+/g, '-'),
      description: description.trim(),
      image,
      isActive,
      sortOrder: parseInt(sortOrder) || 1,
    })
    if (saved !== false) onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title={category ? `Edit Category: ${category.name}` : 'Create Menu Category'}
      description="Organize your dishes into sections that appear on the customer QR menu."
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <Input
          label="Category Name"
          placeholder="e.g. Artisanal Pizza & Pasta"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="URL Slug"
            placeholder="e.g. pizza-pasta"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
          />
          <Input
            label="Display Sort Order"
            type="number"
            min="1"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          />
        </div>

        <Textarea
          label="Category Description"
          placeholder="Short overview shown in menu header..."
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-charcoal-soft mb-1.5">
            Category Cover Image
          </label>
          <div className="flex items-center gap-3">
            <img
              src={image}
              alt="Category Preview"
              className="w-14 h-14 rounded-xl object-cover border border-beige shrink-0"
            />
            <div className="flex-1 space-y-1.5">
              <Input
                placeholder="Image URL"
                value={image}
                onChange={(e) => setImage(e.target.value)}
              />
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-charcoal-muted">Presets:</span>
                {sampleCategoryImages.map((src, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setImage(src)}
                    className="w-5 h-5 rounded overflow-hidden border border-beige hover:border-brand shrink-0"
                  >
                    <img src={src} alt="preset" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="p-3 bg-canvas/60 rounded-xl border border-beige">
          <Switch
            label="Category Active on QR Menu"
            description="When disabled, this category and its dishes are hidden from diners."
            checked={isActive}
            onChange={setIsActive}
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-beige">
          <Button variant="outline" size="sm" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit">
            {category ? 'Save Changes' : 'Create Category'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
