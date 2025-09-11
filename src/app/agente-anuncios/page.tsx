'use client'

import { useState } from "react"
import Link from 'next/link'
import {
  Container, Typography, Box, TextField, Button,
  Card, CardContent, CircularProgress, Breadcrumbs,
  IconButton, Snackbar
} from '@mui/material'
import HomeIcon from '@mui/icons-material/Home'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'

function textoAteFichaTecnica(texto: string) {
  // Match "Ficha Técnica" como título e pega até a próxima quebra dupla de linha OU final
  const fichaIdx = texto.search(/(Ficha Técnica|Ficha técnica|FICHA TÉCNICA)[:：]?/i)
  if (fichaIdx === -1) return texto
  const resto = texto.slice(fichaIdx)
  // Procura onde termina o bloco (duas quebras de linha ou fim do texto)
  const fimBloco = resto.search(/\n{2,}/)
  if (fimBloco === -1) return texto.slice(0, fichaIdx) + resto
  return texto.slice(0, fichaIdx) + resto.slice(0, fimBloco)
}

function CopiarBtn({ texto }: { texto: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <IconButton
        aria-label="Copiar"
        size="small"
        onClick={async (e) => {
          e.preventDefault()
          await navigator.clipboard.writeText(texto)
          setOpen(true)
        }}
      >
        <ContentCopyIcon fontSize="small" />
      </IconButton>
      <Snackbar
        open={open}
        autoHideDuration={1200}
        onClose={() => setOpen(false)}
        message="Copiado!"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </>
  )
}

export default function AgenteAnunciosPage() {
  const [inputs, setInputs] = useState({ nome: '', marca: '', categoria: '', ean: '', urlFabricante: '' })
  const [rawText, setRawText] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState("")

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputs({ ...inputs, [e.target.name]: e.target.value })
    setErro("")
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setRawText("")
    setErro("")
    // Validação básica: Nome e Marca obrigatórios
    if (!inputs.nome.trim() || !inputs.marca.trim()) {
      setErro("Preencha os campos obrigatórios: Nome do Produto e Marca.")
      setLoading(false)
      return
    }
    try {
      const apiResp = await fetch("/api/agente-anuncios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inputs)
      })
      const data = await apiResp.json()
      if (data.result) {
        setRawText(data.result)
      } else {
        setErro(data.error || "erro desconhecido")
      }
    } catch (err) {
      setErro("Erro de conexão na requisição.")
    }
    setLoading(false)
  }

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 3 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', color: '#1976d2', textDecoration: 'none', fontWeight: 500 }}>
          <HomeIcon fontSize="small" sx={{ mr: 0.5 }} />
          Home
        </Link>
        <Typography color="text.primary" fontWeight={500}>
          Agente de Anúncios
        </Typography>
      </Breadcrumbs>

      <Typography variant="h4" align="center" gutterBottom>
        Agente de Anúncios por IA
      </Typography>
      <Box component="form" onSubmit={handleSubmit} sx={{ my: 4 }}>
        <TextField
          name="ean"
          label="EAN (Código de barras)"
          fullWidth
          sx={{ mb: 2 }}
          value={inputs.ean}
          onChange={handleChange}
        />
        <TextField
          name="nome"
          label="Nome do Produto"
          fullWidth
          required
          sx={{ mb: 2 }}
          value={inputs.nome}
          onChange={handleChange}
        />
        <TextField
          name="marca"
          label="Marca"
          fullWidth
          required
          sx={{ mb: 2 }}
          value={inputs.marca}
          onChange={handleChange}
        />
        <TextField
          name="categoria"
          label="Categoria"
          fullWidth
          sx={{ mb: 2 }}
          value={inputs.categoria}
          onChange={handleChange}
        />
        <TextField
          name="urlFabricante"
          label="URL do fabricante (opcional)"
          fullWidth
          sx={{ mb: 2 }}
          value={inputs.urlFabricante}
          onChange={handleChange}
        />
        <Button type="submit" variant="contained" disabled={loading} fullWidth>
          {loading ? <CircularProgress size={24} /> : "Gerar recomendações"}
        </Button>
      </Box>
      {erro && <Typography color="error" align="center" mb={2}>{erro}</Typography>}

      {rawText && (
        <Card sx={{ mb: 4, background: "#f7f7fa" }}>
          <CardContent>
            <Typography variant="subtitle1" color="primary" mb={2} fontWeight={600}>
              Sugestão para o anúncio (OpenAI 3.5):
            </Typography>
            <Typography
            sx={{
              whiteSpace: "pre-wrap",
              fontSize: 15,
              fontFamily: 'Menlo, JetBrains Mono, monospace',
              wordBreak: "break-word",
              mb: 2
            }}>
            {textoAteFichaTecnica(rawText)}
          </Typography>
          <Box sx={{ textAlign: 'right' }}>
            <Button
              variant="outlined"
              startIcon={<ContentCopyIcon />}
              onClick={() => navigator.clipboard.writeText(textoAteFichaTecnica(rawText))}
            >
              Copiar texto completo
            </Button>
          </Box>
          </CardContent>
        </Card>
      )}

      {rawText && (
        <Typography color="text.secondary" variant="body2" align="center">
          Dica: selecione, copie e cole os blocos diretamente nos Marketplaces!
        </Typography>
      )}
    </Container>
  )
}
