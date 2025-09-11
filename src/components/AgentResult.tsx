const OPENAI_API_KEY = process.env.OPENAI_API_KEY as string

// Prompt pode ser ajustado para cada função:
export async function gerarSugestoesAnuncio({ nome, marca, categoria, urlFabricante }: {
  nome: string; marca: string; categoria: string; urlFabricante?: string
}) {
  const prompt = `
Você é um especialista em e-commerce de marketplaces brasileiros (ex: Mercado Livre, Shopee, Amazon, Magazine Luiza, tik tok shop).
Com base nas melhores práticas, gere sugestões otimizadas para vendas para o seguinte produto:

Nome do produto: ${nome}
Marca: ${marca}
Categoria: ${categoria}
${urlFabricante ? `Site ou referência para ficha técnica: ${urlFabricante}` : ""}
  
Responda com:
1. Título otimizado e persuasivo (máx. 60 caracteres)
2. Descrição comercial curta, focada em benefícios e diferenciais
3. Palavras-chave eficazes para busca (5 a 10)
4. Ficha técnica resumida (formato de tópicos)
5. Traga 5 links de vídeos curtos como clips ou vídeos de tiktok, youtube shorts referente a demonstração do produtos

Organize cada parte separadamente, comece cada com o respectivo título em CAPS.
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
