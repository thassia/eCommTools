'use client';

import Link from 'next/link';
import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import {
  Container, Breadcrumbs, Typography, Box, Button, Paper,
  Table, TableBody, TableCell, TableHead, TableRow, Grid, Alert
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import HomeIcon from '@mui/icons-material/Home';

// --- Tipagens e utilidades da base ---
type NcmMonofasico = {
  Codigo?: string;
  monofasico: boolean;
};
const ncmData = require('../../../data/ncm_monofasico_flag.json') as NcmMonofasico[];
const ncmMap: Record<string, boolean> = (() => {
  const out: Record<string, boolean> = {};
  ncmData.forEach((item: NcmMonofasico) => {
    if (item.Codigo) {
      out[item.Codigo.replace(/\D/g, '')] = item.monofasico;
    }
  });
  return out;
})();

function parseValorBrasileiro(valor: any): number {
  if (typeof valor === 'number') return valor;
  let valorStr = String(valor || '0').trim()
    .replace(/\s/g, '') // Remove espaços
    .replace(/\./g, ''); // Remove pontos de milhar
  const idx = valorStr.lastIndexOf(',');
  if (idx !== -1) {
    valorStr = valorStr.slice(0, idx) + '.' + valorStr.slice(idx + 1);
  }
  return Number(valorStr) || 0;
}

// --- Componente principal ---
export default function AnaliseMonofasicoPage() {
  const [dados, setDados] = useState<any[]>([]);
  const [resumo, setResumo] = useState<{ mono: number; nao: number }>({ mono: 0, nao: 0 });
  const [loading, setLoading] = useState(false);

  async function onUpload(evt: React.ChangeEvent<HTMLInputElement>) {
    const file = evt.target.files?.[0];
    if (!file) return;
    setLoading(true);

    let linhas: any[] = [];
    if (file.name.endsWith('.csv')) {
      // Leitura correta para CSV
      const data = await file.arrayBuffer();
      const text = new TextDecoder('utf-8').decode(data);
      const wb = XLSX.read(text, { type: 'string', FS: ';' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      linhas = XLSX.utils.sheet_to_json(ws, { header: 0 });
    } else {
      // XLSX padrão
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      linhas = XLSX.utils.sheet_to_json(ws, { header: 0 });
    }

    const results: any[] = [];
    let totalMono = 0;
    let totalNao = 0;

    for (const linha of linhas) {
      const produto = linha['Produto'] || '';
      const ncm = String(linha['NCM'] || '').replace(/\D/g, '');
      const valorTotal = parseValorBrasileiro(linha['Valor total']);
      const monofasico = ncmMap[ncm] ?? false;
      results.push({
        produto,
        ncm,
        valor: valorTotal,
        monofasico
      });
      if (monofasico) totalMono += valorTotal;
      else totalNao += valorTotal;
    }
    setDados(results);
    setResumo({ mono: totalMono, nao: totalNao });
    setLoading(false);
  }

  function exportarResultadoExcel(dados: any[], resumo: { mono: number; nao: number }) {
    if (!Array.isArray(dados) || dados.length === 0) return;

    const headerRows = [
      [{ v: `Total faturado (monofásicos): R$ ${resumo.mono.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` }],
      [{ v: `Total faturado (não monofásicos): R$ ${resumo.nao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` }],
      []
    ];
    const dataRows = dados.map(item => ({
      'Produto': item.produto,
      'NCM': item.ncm,
      'Valor total': item.valor,
      'Monofásico': item.monofasico ? 'Sim' : 'Não'
    }));
    const wsData = [
      ...headerRows,
      Object.keys(dataRows[0]),
      ...dataRows.map(obj => Object.values(obj))
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Relatório');
    XLSX.writeFile(wb, 'analise-monofasico.xlsx');
  }

  // --- Renderização orientada ao padrão do projeto ---
  return (
    <Container maxWidth="sm" sx={{ py: 3 }}>
      {/* Breadcrumb */}
      <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 3 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', color: '#1976d2', textDecoration: 'none', fontWeight: 500 }}>
          <HomeIcon fontSize="small" sx={{ mr: 0.5 }} />
          Início
        </Link>
        <Typography color="text.primary" fontWeight={500}>
          Cálculo Produtos Não Monofásicos
        </Typography>
      </Breadcrumbs>

      <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5 }}>
        Análise de Vendas x Monofásico (PIS/COFINS)
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Fonte: Notas fiscais de operação por itens vendidos
      </Typography>

      {/* Ações */}
      <Box display="flex" gap={2} mb={3} flexDirection={{ xs: "column", sm: "row" }}>
        <Button
          variant="contained"
          color="primary"
          component="label"
          startIcon={<UploadFileIcon />}
          sx={{ fontWeight: 600, minWidth: 200, fontSize: 16, py: 1.3 }}
          aria-label="Importar planilha"
        >
          Importar planilha
          <input
            type="file"
            hidden
            onChange={onUpload}
            accept=".csv, .xlsx"
          />
        </Button>
        <Button
          variant="outlined"
          color="inherit"
          startIcon={<DownloadIcon />}
          disabled={dados.length === 0}
          onClick={() => exportarResultadoExcel(dados, resumo)}
          sx={{ minWidth: 200, fontSize: 16, py: 1.3 }}
          aria-label="Exportar resultado para Excel"
        >
          Exportar resultado
        </Button>
      </Box>

      {/* Totais em caixa Paper */}
      <Paper sx={{ p: 2, mb: 2, background: "#f8fafc" }}>
        <Typography variant="subtitle1" fontWeight={500} sx={{ mb: 0.5 }}>
          Total Monofásicos: <b>R$ {resumo.mono.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</b>
        </Typography>
        <Typography variant="subtitle1" fontWeight={500}>
          Total Não Monofásicos: <b>R$ {resumo.nao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</b>
        </Typography>
      </Paper>

      {/* Orientação */}
      <Alert severity="info" sx={{ mb: 3, fontSize: 15, lineHeight: 1.6 }}>
        <b>Orientação para apuração PIS/COFINS:</b><br />
        <b>Produtos monofásicos:</b> revendas <b>NÃO geram débito</b> de PIS/COFINS no Simples Nacional.<br /><br />
        <b>Produtos <span style={{ textDecoration: 'underline' }}>não monofásicos</span>:</b> aplique metodologia padrão de cálculo do PIS/COFINS conforme o regime e faixa no Simples Nacional.
      </Alert>

      {loading && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Processando... Aguarde
        </Alert>
      )}

      {/* Tabela resultado */}
      {dados.length > 0 && (
        <Paper sx={{ mt: 2, p: 1, overflow: "auto" }}>
          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
            Relatório detalhado:
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Produto</TableCell>
                <TableCell>NCM</TableCell>
                <TableCell align="right">Valor total</TableCell>
                <TableCell align="center">Monofásico?</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {dados.map((linha, i) => (
                <TableRow key={i}>
                  <TableCell>{linha.produto}</TableCell>
                  <TableCell>{linha.ncm}</TableCell>
                  <TableCell align="right">
                    {typeof window !== "undefined"
                      ? `R$ ${linha.valor?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                      : `R$ ${linha.valor}`}
                  </TableCell>
                  <TableCell align="center">{linha.monofasico ? 'Sim' : 'Não'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}
    </Container>
  );
}
