// /app/api/agente-anuncios/route.ts

import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const body = await req.json()
  const { nome, marca, categoria, ean, urlFabricante } = body
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY as string

  const prompt = `
Como especialista em e-commerce de marketplaces (Mercado Livre, Shopee, Amazon, Tiktok Shope),
 gere sugestões persuasivas e otimizadas de forma a gerar engajamento, vendas e evitando infrações. 
 Considere as melhores práticas de especialistas em vendas eficientes em marketplaces e SEO. Utilize 
 as seguintes informações do produto para criar a sugestão:

EAN: ${ean}
Nome do produto: ${nome}
Marca: ${marca}
Categoria: ${categoria}
${urlFabricante ? `Site ou referência: ${urlFabricante}` : ""}

Responda com:
TÍTULO: título de até 60 caracteres com marca e palavras-chave com alta probabilidade de busca
DESCRIÇÃO: Descritivo curto do produto 
  Benefícios: 5 principais beneficios que potenciais clientes se encantariam com o produto
  Soluções: 5 soluções para possíveis objeções da compra como segurança na compra, eficiência do produto, etc
  Perguntas frequentes: 5 Perguntas e respostas frequentes para evitar dúvidas e inseguranças dos clientes
PALAVRAS-CHAVE: 5 a 10 para busca
FICHA TÉCNICA: principais tópicos, dimensões, formato, especificidades, etc
`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {role: "system", content: "Gere anúncios profissionais e otimizados para marketplaces do Brasil, com copywriting e SEO."},
          {role: "user", content: prompt}
        ],
        max_tokens: 600,
        temperature: 0.8
      })
    })

    const data = await response.json()
    if (data.error) {
      return NextResponse.json({ error: data.error.message }, { status: 400 })
    }

    const content = data.choices?.[0]?.message?.content?.trim()
    return NextResponse.json({ result: content })
  } catch (err) {
    return NextResponse.json({ error: "Erro de conexão (server)" }, { status: 500 })
  }
}
