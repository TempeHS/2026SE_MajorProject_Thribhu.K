import type { Collection } from "@/types/collection"

const COLLECTIONS_KEY = "tppr_collections"

export function saveCollection(collection: Collection): void {
  const raw = localStorage.getItem(COLLECTIONS_KEY)
  const collections: Collection[] = raw ? JSON.parse(raw) : []
  collections.push(collection)
  localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(collections))
}

export function getCollections(): Collection[] {
  const raw = localStorage.getItem(COLLECTIONS_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw) as Collection[]
  } catch {
    return []
  }
}

export function getCollection(id: string): Collection | undefined {
  return getCollections().find((c) => c.id === id)
}

export function deleteCollection(id: string): void {
  const collections = getCollections().filter((c) => c.id !== id)
  localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(collections))
}
