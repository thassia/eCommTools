const OPENAI_API_KEY = process.env.OPENAI_API_KEY as string

// Prompt pode ser ajustado para cada função:
export async function gerarSugestoesAnuncio({ ean, nome, marca, categoria, urlFabricante }: {
  ean: string; nome: string; marca: string; categoria: string; urlFabricante?: string
}) {
  const prompt = `
Você é um especialista em copywriting para e-commerce e marketplace. Crie uma descrição persuasiva, clara e vendedora para um 
produto pensando na publicação em marketplaces líderes como Mercado Livre, Shopee e TikTok Shop.

Com base em boas práticas e políticas dessas plataformas, gere sugestões otimizadas de conteúdo para vendas do seguinte produto:
EAN: ${ean}
Nome: ${nome}
Marca: ${marca}
Categoria: ${categoria}

Responda SEM incluir instruções, contato, links externos de lojas, marcas concorrentes ou informações proibidas pelas políticas dos marketplaces.
Empregue linguagem clara, profissional e atraente, voltada para conversão rápida e confiança.

1. Título otimizado, persuasivo, com marca e palavras-chave relevantes (máx. 60 caracteres)

2. Descrição comercial curta, focada nos tópicos:
    Características principais:
    Diferenciais: (benefícios, inovação, materiais)
    Modo de uso: (modo de uso ou aplicação)

3. De 5 a 10 palavras-chave eficazes para busca do produto

4. Ficha técnica resumida, em tópicos, apenas com dados concretos e relevantes

No fim, inclua (nessa ordem) FAQ com 2 dúvidas comuns e respostas objetivas, e um lembrete “garantia de procedência e envio rápido. Tudo a pronta entrega!
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
      max_tokens: 600,
      temperature: 0.8
    })
  })

  const data = await response.json()
  return data.choices?.[0]?.message?.content?.trim() || "Falha na geração"
}
