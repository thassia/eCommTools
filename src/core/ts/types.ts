// Adicione tipos comuns e compartilhe entre módulos
export type Product = {
  sku: string
  name: string
  cost: number
}

export type PricingConfig = {
  fee: number
  tax: number
}
