'use client'

import Link from 'next/link'

import React, { useState } from 'react'

import * as XLSX from 'xlsx'

import { Container, Breadcrumbs, Typography, Box, Button, Paper, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material'

import DownloadIcon from '@mui/icons-material/Download'

import HomeIcon from '@mui/icons-material/Home'

import ncmData from '../../../data/ncm_monofasico_flag.json'

const ncmMap: Record<string, boolean> = (() => {
  const out: Record<string, boolean> = {}
  ncmData.forEach(item => {
    out[item.Codigo?.replace(/\D/g, '')] = item.monofasico
  })
  return out
})()

function parseValorBrasileiro(valor: any): number {
  if (typeof valor === 'number') return valor
  let valorStr = String(valor || '0').trim()
  // Remove espaços
  valorStr = valorStr.replace(/\s/g, '')
  // Remove pontos de milhar
  valorStr = valorStr.replace(/\./g, '')
  // Substitui a última vírgula por ponto (decimal)
  const idx = valorStr.lastIndexOf(',')
  if (idx !== -1) {
    valorStr = valorStr.slice(0, idx) + '.' + valorStr.slice(idx + 1)
  }
  return Number(valorStr) || 0
}

export default function AnaliseMonofasicoPage() {
  const [dados, setDados] = useState<any[]>([])
  const [resumo, setResumo] = useState<{ mono: number; nao: number }>({ mono: 0, nao: 0 })
  const [loading, setLoading] = useState(false)

  async function onUpload(evt: React.ChangeEvent<HTMLInputElement>) {
    const file = evt.target.files?.[0]
    if (!file) return
    setLoading(true)
    const data = await file.arrayBuffer()
    const wb = XLSX.read(data)
    const ws = wb.Sheets[wb.SheetNames[0]]
    const linhas = XLSX.utils.sheet_to_json(ws, { header: 0 }) as any[]
    const results: any[] = []
    let totalMono = 0
    let totalNao = 0

    for (const linha of linhas) {
      const produto = linha['Produto'] || ''
      const ncm = String(linha['NCM'] || '').replace(/\D/g, '')
      const valorTotal = parseValorBrasileiro(linha['Valor total'])
      const monofasico = ncmMap[ncm] ?? false
      results.push({
        produto,
        ncm,
        valor: valorTotal,
        monofasico
      })
      if (monofasico) totalMono += valorTotal
      else totalNao += valorTotal
    }

    setDados(results)
    setResumo({ mono: totalMono, nao: totalNao })
    setLoading(false)
  }

  function exportarResultadoExcel(dados: any[], resumo: { mono: number; nao: number }) {
    if (!Array.isArray(dados)) return
    const headerRows = [
      [{ v: `Total faturado (monofásicos): R$ ${resumo.mono.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` }],
      [{ v: `Total faturado (não monofásicos): R$ ${resumo.nao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` }],
      []
    ]
    const dataRows = dados.map(item => ({
      'Produto': item.produto,
      'NCM': item.ncm,
      'Valor total': item.valor,
      'Monofásico': item.monofasico ? 'Sim' : 'Não'
    }))
    const wsData = [
      ...headerRows,
      Object.keys(dataRows[0]),
      ...dataRows.map(obj => Object.values(obj))
    ]
    const ws = XLSX.utils.aoa_to_sheet(wsData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Relatório')
    XLSX.writeFile(wb, 'analise-monofasico.xlsx')
  }

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      {/* Breadcrumb */}
      <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', color: 'inherit', textDecoration: 'none' }}>
          <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
          Início
        </Link>
        <Typography color="text.primary">Cálculo de PIS/COFINS de produtos Não Monofásicos</Typography>
      </Breadcrumbs>

      <Typography variant="h5" fontWeight={700} gutterBottom>
        Análise Automática de Vendas x Regime Monofásico (PIS/COFINS)
      </Typography>
      <Typography sx={{ mb: 2 }} color="text.secondary">
        Arquivo de notas fiscais de operação por itens vendidos
      </Typography>

      <Box display="flex" gap={2} mb={2}>
        <Button component="label" variant="contained" sx={{ minWidth: 180 }}>
          Importar planilha
          <input type="file" accept=".xlsx,.xls" hidden onChange={onUpload} />
        </Button>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          disabled={dados.length === 0}
          onClick={() => exportarResultadoExcel(dados, resumo)}
          sx={{ minWidth: 180 }}
        >
          Exportar resultado para Excel
        </Button>
      </Box>

      {loading && <Typography color="primary">Processando...</Typography>}

      <Typography fontWeight={700} sx={{ mt: 3 }}>
        Total faturado (monofásicos): R$ {resumo.mono.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
      </Typography>
      <Typography fontWeight={700}>
        Total faturado (não monofásicos): R$ {resumo.nao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
      </Typography>

      <Paper sx={{ my: 4, p: 2 }}>
        <Typography color="primary" fontWeight={700}>
          Orientação para apuração PIS/COFINS:
        </Typography>
        <Typography>
          Produtos <b>monofásicos</b>: revendas <b>NÃO</b> geram débito de PIS/COFINS no Simples Nacional.
        </Typography>
        <Typography>
          Produtos <b>não monofásicos</b>: aplique metodologia padrão de cálculo do PIS/COFINS conforme o regime e faixa no Simples Nacional.
        </Typography>
      </Paper>

      {dados.length > 0 && (
        <Paper sx={{ mt: 3 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Produto</TableCell>
                <TableCell>NCM</TableCell>
                <TableCell>Valor total</TableCell>
                <TableCell>Monofásico?</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {dados.map((linha, i) => (
                <TableRow key={i}>
                  <TableCell>{linha.produto}</TableCell>
                  <TableCell>{linha.ncm}</TableCell>
                  <TableCell>
                    {typeof window !== "undefined"
                      ? `R$ ${linha.valor?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                      : `R$ ${linha.valor}`}
                  </TableCell>
                  <TableCell>{linha.monofasico ? 'Sim' : 'Não'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}
    </Container>
  )
}
