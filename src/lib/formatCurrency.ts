export const formatEUR = (cents: number) => {
const value = cents / 100
return new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR' }).format(value)
}