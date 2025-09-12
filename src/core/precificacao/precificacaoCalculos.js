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

// Tarifa Fixa Shopee/TikTok
export function calcularTarifaFixaPadrao(canal) {
  if (canal === "Shopee") return 4;
  if (canal === "TikTok") return 2;
  return 0;
}

// CALCULAR PREÇO DE VENDA - INCLUINDO AFILIADO (se passado)
export function calcularPrecoVenda({
  precoCusto, frete, imposto, comissao, afiliado, lucro, custoFixo, tarifaFixa, canal
}) {
  precoCusto = parseFloat(precoCusto) || 0;
  frete = parseFloat(frete) || 0;
  imposto = parseFloat(imposto) || 0;
  comissao = parseFloat(comissao) || 0;
  afiliado = parseFloat(afiliado) || 0;
  lucro = parseFloat(lucro) || 0;
  custoFixo = parseFloat(custoFixo) || 0;
  tarifaFixa = parseFloat(tarifaFixa) || 0;

  let taxaOutros = (imposto + lucro + afiliado) / 100;
  const taxaComissao = comissao / 100;

  if (canal === "Mercado Livre") {
    return (precoCusto + frete + tarifaFixa + custoFixo) / (1 - taxaOutros - taxaComissao);
  }
  let taxaTotal = taxaOutros + taxaComissao;
  return (precoCusto + frete + tarifaFixa + custoFixo) / (1 - taxaTotal);
}
