import { useState } from "react";
import * as XLSX from "xlsx";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { Card, CardContent, Button, Typography, Alert, Box, Paper, Table, TableHead, TableRow, TableCell, TableBody } from "@mui/material";
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import { formatarReal } from '@/utils/format';

import {
  calcularTarifaFixaML,
  calcularTarifaFixaPadrao,
  calcularPrecoVenda
} from "@/core/precificacao/precificacaoCalculos";

// PT-BR number normalization (vírgula e ponto)
function normalizaNumero(valor) {
  if (typeof valor === "number") return valor;
  if (!valor) return 0;
  let val = String(valor)
    .replace(/[^\d.,\-]+/g, "")
    .replace(/\s/g, "")
    .replace(/\./g, "");
  const idx = val.lastIndexOf(",");
  if (idx !== -1) {
    val = val.slice(0, idx) + "." + val.slice(idx + 1);
  }
  return Number(val) || 0;
}

// Modelo CSV atualizado
function downloadModeloPlanilha(e) {
  e.preventDefault();
  const header = [
    "descricao", "sku", "ean", "precoCusto", "canal",
    "tipoAnuncio", "comissao", "afiliado", "frete", "tarifaFixa", "custoFixo", "imposto", "lucro"
  ];
  const exemplos = [
    ["Shampoo Exemplo 1", "1234567", "000000111111", "10.00", "Mercado Livre", "Clássico", "12", "0", "10.00", "6.75", "6", "10", "10"],
    ["Shampoo Exemplo 2", "7654321", "111111000000", "25.00", "Shopee", "", "20", "2", "8.5", "4.00", "6", "10", "10"],
    ["Kit Exemplo", "11223344", "333222111000", "90.00", "TikTok", "", "12", "2", "7", "2.00", "6", "10", "10"]
  ];
  let csv = [header.join(",")].concat(exemplos.map(row => row.join(","))).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = "modelo_precificacao.csv";
  document.body.appendChild(a); // Safari fix
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Função para cada linha da planilha
function calcularLinha(row) {
  const canal = row["canal"] ?? "";
  const tipoAnuncio = row["tipoAnuncio"] ?? "";
  const precoCusto = row["precoCusto"] ?? "";
  const frete = row["frete"] ?? "";
  const imposto = row["imposto"] ?? "";
  const comissao = row["comissao"] ?? "";
  const afiliado = row["afiliado"] ?? "0";
  const lucro = row["lucro"] ?? "";
  const custoFixo = row["custoFixo"] ?? "";
  let tarifaFixa = row["tarifaFixa"] ?? "";
  let tarifaFixaFinal =
    canal === "Mercado Livre"
      ? calcularTarifaFixaML(precoCusto)
      : calcularTarifaFixaPadrao(canal);

  let precoVenda = calcularPrecoVenda({
    precoCusto,
    frete,
    imposto,
    comissao,
    afiliado,
    lucro,
    custoFixo,
    tarifaFixa: tarifaFixaFinal,
    canal,
  });

  return {
    descricao: row["descricao"] ?? "",
    sku: row["sku"] ?? "",
    ean: row["ean"] ?? "",
    canal,
    tipoAnuncio,
    precoCusto,
    comissao,
    afiliado,
    frete,
    tarifaFixa: tarifaFixaFinal,
    custoFixo,
    imposto,
    lucro,
    precoVenda: precoVenda?.toFixed(2),
    tipo: "lote"
  };
}

export default function PrecificacaoLote({ usuario }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [success, setSuccess] = useState(false);
  const [msg, setMsg] = useState("");

  async function processarLinhas(planilha) {
    const required = ["descricao", "sku", "ean", "precoCusto", "canal"];
    const faltaCabecalho =
      planilha.length === 0 ||
      required.some(col => !Object.keys(planilha[0]).includes(col));
    if (faltaCabecalho) {
      setMsg("O arquivo selecionado não segue o modelo do sistema. Baixe e use o modelo oficial.");
      setSuccess(false);
      return;
    }

    const processada = planilha.map(calcularLinha);
    setPreview(processada.slice(0, 5));
    setSuccess(true);
    setMsg("");

    for (const produto of processada) {
      await addDoc(collection(db, "historico_precificacao"), {
        ...produto,
        usuario: usuario.email,
        criadoEm: new Date().toISOString()
      });
    }
  }

  async function processarPlanilha() {
    if (!file) {
      setMsg("Selecione um arquivo.");
      setSuccess(false);
      return;
    }
    setSuccess(false);
    setMsg("");

    if (file.name.endsWith('.csv')) {
      const data = await file.arrayBuffer();
      const text = new TextDecoder('utf-8').decode(data);
      const wb = XLSX.read(text, { type: 'string', FS: ';' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      let planilha = XLSX.utils.sheet_to_json(ws, { defval: "" });
      await processarLinhas(planilha);
    } else {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        const wb = XLSX.read(evt.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        let planilha = XLSX.utils.sheet_to_json(ws, { defval: "" });
        await processarLinhas(planilha);
      };
      reader.readAsArrayBuffer(file);
    }
  }

  return (
    <Card sx={{ maxWidth: 1100, mx: 'auto', my: 2 }}>
      <CardContent>
        <Typography variant="h6" fontWeight={700} gutterBottom>
          Precificação em Lote
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Faça o download do modelo de planilha abaixo, preencha com seus produtos e importe sem alterar os nomes das colunas!
        </Typography>
        <Box display="flex" flexDirection={{ xs: "column", sm: "row" }} alignItems="center" gap={2} mb={2}>
          <Button
            color="primary"
            variant="outlined"
            onClick={downloadModeloPlanilha}
            startIcon={<DownloadIcon />}
            sx={{
                minWidth: 180,
                textTransform: 'none',
                fontWeight: 500,
                mb: { xs: 2, sm: 2 }
              }}
          >
            Download modelo
          </Button>
          <Button
            variant="outlined"
            color="primary"
            component="label"
            startIcon={<UploadFileIcon />}
            sx={{
              minWidth: 180,
              textTransform: 'none',
              fontWeight: 500,
              mb: { xs: 2, sm: 0 }
            }}
          >
            Anexar planilha
            <input
              type="file"
              hidden
              onChange={e => setFile(e.target.files[0])}
              accept=".csv, .xlsx"
            />
          </Button>
          <Button
            variant="contained"
            color="success"
            startIcon={<DownloadIcon />}
            sx={{
              minWidth: 180,
              textTransform: 'none',
              fontWeight: 500,
              boxShadow: 2
            }}
            onClick={processarPlanilha}
          >
            Processar e Salvar
          </Button>
        </Box>
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Processado e salvo! Veja prévia abaixo.
          </Alert>
        )}
        {msg && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {msg}
          </Alert>
        )}
        {preview.length > 0 && (
          <Box mt={2}>
            <Typography variant="subtitle2" mb={1}>
              Prévia dos primeiros produtos:
            </Typography>
            <Paper sx={{ overflow: "auto" }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Descrição</TableCell>
                    <TableCell>SKU</TableCell>
                    <TableCell>EAN</TableCell>
                    <TableCell>Canal</TableCell>
                    <TableCell>Tipo Anúncio</TableCell>
                    <TableCell>Comissão (%)</TableCell>
                    <TableCell>% Afiliado</TableCell>
                    <TableCell>Frete (R$)</TableCell>
                    <TableCell>Tarifa Fixa</TableCell>
                    <TableCell>Custo Fixo</TableCell>
                    <TableCell>Imposto (%)</TableCell>
                    <TableCell>Lucro (%)</TableCell>
                    <TableCell>Preço Venda</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {preview.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{row.descricao}</TableCell>
                      <TableCell>{row.sku}</TableCell>
                      <TableCell>{row.ean}</TableCell>
                      <TableCell>{row.canal}</TableCell>
                      <TableCell>{row.tipoAnuncio}</TableCell>
                      <TableCell>{row.comissao}</TableCell>
                      <TableCell>{row.afiliado}</TableCell>
                      <TableCell>{row.frete}</TableCell>
                      <TableCell>{row.tarifaFixa}</TableCell>
                      <TableCell>{row.custoFixo}</TableCell>
                      <TableCell>{row.imposto}</TableCell>
                      <TableCell>{row.lucro}</TableCell>
                      <TableCell>R$ {row.precoVenda}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
