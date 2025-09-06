export type CartItemType = 'repair' | 'accessory' | 'device' | 'plan'


export type CartItem = {
id: string
title: string
type: CartItemType
unitPrice: number 
qty: number
image?: string
meta?: Record<string, unknown>
}


export type CartState = {
items: CartItem[]
updatedAt: number // epoch ms
}


export type CartContextValue = {
items: CartItem[]
count: number
subtotal: number 
addItem: (item: CartItem) => void
removeItem: (id: string) => void
updateQty: (id: string, qty: number) => void
clearCart: () => void
}