export function validarLinhaPrecificacao(obj) {
  const erros = {};
  if (!obj.descricao) erros.descricao = "Descrição obrigatória";
  if (!obj.precoCusto || isNaN(obj.precoCusto)) erros.precoCusto = "Preço de custo inválido";
  // ... Outros campos
  return erros;
}
