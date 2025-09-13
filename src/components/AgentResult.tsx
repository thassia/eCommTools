const OPENAI_API_KEY = process.env.OPENAI_API_KEY as string

// Prompt pode ser ajustado para cada função:
export async function gerarSugestoesAnuncio({ ean, nome, marca, categoria, urlFabricante }: {
  ean: string; nome: string; marca: string; categoria: string; urlFabricante?: string
}) {
  const prompt = `
Você é um especialista em copywriting para e-commerce e marketplace.
Crie uma resposta perfeita para cadastro em marketplaces brasileiros, considerando regras e políticas dos marketplaces.

Seguindo a estrutura exata abaixo, responda SOMENTE neste formato e não inclua outras seções ou instruções:

1. Título: Título otimizado, persuasivo, com marca e palavras-chave relevantes (máx. 60 caracteres)
2. Descrição: Descrição comercial curta, focada nos tópicos:
    Características principais: 
    Diferenciais: benefícios, inovação, materiais
    Indicação de uso: modo de uso ou aplicação (se houver informações do fabricante)
3. Palavras-chave: {palavra1, palavra2, ...}
4. Ficha técnica:
- item 1
- item 2
5. FAQ:
- Pergunta 1: resposta concisa
- Pergunta 2: resposta concisa
6. Observação final: Garantia de procedência e envio rápido. Tudo a pronta entrega!

Use os dados do produto a seguir:
EAN: ${ean}
Nome: ${nome}
Marca: ${marca}
Categoria: ${categoria}

Empregue linguagem clara, profissional, acessível, persuasiva e SEM textos a mais.
`
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [
        {role: "system", content: "Seu papel é gerar anúncios de altíssimo nível para marketplaces do Brasil, focando em copywriting profissional e SEO."},
        {role: "user", content: prompt}
      ],
      max_tokens: 900,
      temperature: 0.5
    })
  })

  const data = await response.json()
  return data.choices?.[0]?.message?.content?.trim() || "Falha na geração"
}
