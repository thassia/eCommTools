// Tabela de comissão sugerida por canal
export const sugestaoComissoes = {
  "Mercado Livre": { Clássico: 12, Premium: 17 },
  Shopee: 20,
  TikTok: 12,
};

// Tarifa Fixa Mercado Livre conforme faixa do preço de venda
export function calcularTarifaFixaML(precoVenda) {
  precoVenda = parseFloat(precoVenda || 0);
  if (precoVenda < 12.5) return (precoVenda / 2).toFixed(2);
  if (precoVenda >= 12.5 && precoVenda <= 29) return 6.25;
  if (precoVenda > 29 && precoVenda <= 50) return 6.5;
  if (precoVenda > 50 && precoVenda <= 79) return 6.75;
  return 0;
}

// Função PURE para preço de venda
export function calcularPrecoVenda({
  precoCusto, frete, imposto, comissao, lucro, custoFixo, tarifaFixa, canal
}) {
  precoCusto = parseFloat(precoCusto) || 0;
  frete = parseFloat(frete) || 0;
  imposto = parseFloat(imposto) || 0;
  comissao = parseFloat(comissao) || 0;
  lucro = parseFloat(lucro) || 0;
  custoFixo = parseFloat(custoFixo) || 0;
  tarifaFixa = parseFloat(tarifaFixa) || 0;
  let taxaOutros = (imposto + lucro + custoFixo) / 100;

  if (canal === "Mercado Livre") {
    const taxaComissao = comissao / 100;
    return (precoCusto + frete + tarifaFixa) / (1 - taxaOutros - taxaComissao);
  }
  let taxaTotal = taxaOutros + (comissao / 100);
  return (precoCusto + frete + tarifaFixa) / (1 - taxaTotal);
}
