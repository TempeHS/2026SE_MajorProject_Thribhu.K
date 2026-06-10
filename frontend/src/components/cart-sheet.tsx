import { useState } from "react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useCart } from "@/hooks/use-cart"
import { ShoppingCart, Trash2, X, Share2, PackagePlus } from "lucide-react"
import { toast } from "sonner"

interface CartSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CartSheet({ open, onOpenChange }: CartSheetProps) {
  const { items, removeItem, clearCart, totalMarks, createCollection } = useCart()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [collectionTitle, setCollectionTitle] = useState("")
  const [collectionDescription, setCollectionDescription] = useState("")

  function handleCreateCollection() {
    if (!collectionTitle.trim()) return
    const collection = createCollection(collectionTitle.trim(), collectionDescription.trim() || undefined)
    setCreateDialogOpen(false)
    setCollectionTitle("")
    setCollectionDescription("")
    onOpenChange(false)
    toast.success(`Collection "${collection.title}" created with ${collection.items.length} questions`)
  }

  // Group items by source paper
  const groupedItems = items.reduce<Record<string, typeof items>>((acc, item) => {
    const key = item.source_paper_id
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {})

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="flex flex-col w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <ShoppingCart className="size-5" />
              Question Cart
            </SheetTitle>
            <SheetDescription>
              {items.length === 0
                ? "Add questions from papers to build a collection."
                : `${items.length} question${items.length !== 1 ? "s" : ""} • ${totalMarks} marks total`}
            </SheetDescription>
          </SheetHeader>

          <Separator />

          {items.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
              <PackagePlus className="size-10 text-muted-foreground" />
              <div>
                <p className="font-medium">Cart is empty</p>
                <p className="text-sm text-muted-foreground">
                  Browse papers and add questions to your cart.
                </p>
              </div>
            </div>
          ) : (
            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="flex flex-col gap-4 pb-4">
                {Object.entries(groupedItems).map(([paperId, paperItems]) => (
                  <div key={paperId} className="flex flex-col gap-2">
                    <p className="text-xs font-medium text-muted-foreground truncate">
                      From: {paperItems[0].source_paper_title}
                    </p>
                    {paperItems.map((item) => (
                      <div
                        key={item.question.id}
                        className="flex items-center justify-between gap-2 rounded-lg border p-3"
                      >
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span className="text-sm font-medium">
                            Q{item.question.number}
                          </span>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {item.question.marks} {item.question.marks === 1 ? "mark" : "marks"}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {item.question.type.replace("_", " ")}
                            </Badge>
                            {item.question.outcomes && item.question.outcomes.length > 0 && (
                              <span className="text-xs text-muted-foreground">
                                {item.question.outcomes.join(", ")}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => removeItem(item.question.id)}
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {items.length > 0 && (
            <>
              <Separator />
              <SheetFooter className="flex-col gap-2 sm:flex-col">
                <Button onClick={() => setCreateDialogOpen(true)} className="w-full">
                  <Share2 data-icon="inline-start" />
                  Create Collection
                </Button>
                <Button variant="ghost" size="sm" onClick={clearCart} className="w-full">
                  <Trash2 data-icon="inline-start" />
                  Clear cart
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Create collection dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Collection</DialogTitle>
            <DialogDescription>
              Save {items.length} question{items.length !== 1 ? "s" : ""} ({totalMarks} marks) as a shareable collection.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" htmlFor="collection-title">
                Title
              </label>
              <Input
                id="collection-title"
                placeholder="e.g. Calculus Practice Set"
                value={collectionTitle}
                onChange={(e) => setCollectionTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateCollection()
                }}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" htmlFor="collection-desc">
                Description
                <span className="ml-1 text-muted-foreground font-normal">(optional)</span>
              </label>
              <Input
                id="collection-desc"
                placeholder="A brief description..."
                value={collectionDescription}
                onChange={(e) => setCollectionDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateCollection} disabled={!collectionTitle.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
