import { createContext, useContext, useState, type ReactNode } from "react"
import type { Question } from "@/types/question"
import type { Collection, CollectionItem } from "@/types/collection"
import { saveCollection } from "@/lib/collection-storage"

export interface CartItem {
  question: Question
  source_paper_id: string
  source_paper_title: string
}

interface CartContextValue {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (questionId: string) => void
  clearCart: () => void
  isInCart: (questionId: string) => boolean
  totalMarks: number
  createCollection: (title: string, description?: string) => Collection
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])

  function addItem(item: CartItem) {
    setItems((prev) => {
      if (prev.some((i) => i.question.id === item.question.id)) return prev
      return [...prev, item]
    })
  }

  function removeItem(questionId: string) {
    setItems((prev) => prev.filter((i) => i.question.id !== questionId))
  }

  function clearCart() {
    setItems([])
  }

  function isInCart(questionId: string) {
    return items.some((i) => i.question.id === questionId)
  }

  const totalMarks = items.reduce((sum, item) => sum + item.question.marks, 0)

  function createCollection(title: string, description?: string): Collection {
    const now = new Date().toISOString()
    const collection: Collection = {
      id: crypto.randomUUID(),
      title,
      description,
      items: items.map((item): CollectionItem => ({
        question: item.question,
        source_paper_id: item.source_paper_id,
        source_paper_title: item.source_paper_title,
      })),
      total_marks: totalMarks,
      created_at: now,
      updated_at: now,
    }
    saveCollection(collection)
    clearCart()
    return collection
  }

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, clearCart, isInCart, totalMarks, createCollection }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error("useCart must be used within CartProvider")
  return ctx
}
