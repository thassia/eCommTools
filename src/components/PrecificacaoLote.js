import { useState } from "react";
import * as XLSX from "xlsx";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { Card, CardContent, Button, Typography, Alert, Box } from "@mui/material";
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';

import {
  calcularTarifaFixaML,
  calcularPrecoVenda
} from "@/core/precificacao/precificacaoCalculos";

export default function PrecificacaoLote({ usuario }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [success, setSuccess] = useState(false);
  const [msg, setMsg] = useState("");

  // Download do modelo igual ao exemplo anterior
  function downloadModeloPlanilha(e) {
    e.preventDefault();
    const header = [
      "descricao", "sku", "ean", "precoCusto", "canal",
      "tipoAnuncio", "comissao", "tarifaFixa", "custoFixo", "imposto", "lucro"
    ];
    const exemplos = [
      ["Shampoo Exemplo 1", "1234567", "000000111111", "10.00", "Mercado Livre", "Clássico", "12", "6.75", "6", "10", "10"],
      ["Shampoo Exemplo 2", "7654321", "111111000000", "25.00", "Shopee", "", "20", "4.00", "6", "10", "10"],
      ["Kit Exemplo", "11223344", "333222111000", "90.00", "TikTok", "", "12", "2.00", "6", "10", "10"]
    ];
    let csv = [header.join(",")].concat(exemplos.map(row => row.join(","))).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "modelo_precificacao.csv";
    document.body.appendChild(a); // faz funcionar no Safari
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function calcularLinha(row) {
    const descricao = row["descricao"] ?? "";
    const sku = row["sku"] ?? "";
    const ean = row["ean"] ?? "";
    const canal = row["canal"] ?? "";
    const tipoAnuncio = row["tipoAnuncio"] ?? "";
    const precoCusto = row["precoCusto"] ?? "";
    const comissao = row["comissao"] ?? "";
    const tarifaFixa = row["tarifaFixa"] ?? "";
    const custoFixo = row["custoFixo"] ?? "";
    const imposto = row["imposto"] ?? "";
    const lucro = row["lucro"] ?? "";

    const dadosLinha = {
      precoCusto,
      frete: "",
      comissao,
      imposto,
      lucro,
      custoFixo,
      tarifaFixa,
      canal
    };

    let precoVenda = calcularPrecoVenda(dadosLinha);
    let tarifaFixaFinal = canal === "Mercado Livre"
      ? calcularTarifaFixaML(precoVenda)
      : tarifaFixa;

    return {
      descricao,
      sku,
      ean,
      canal,
      tipoAnuncio,
      precoCusto,
      comissao,
      tarifaFixa: tarifaFixaFinal,
      custoFixo,
      imposto,
      lucro,
      precoVenda: precoVenda.toFixed(2),
      tipo: "lote"
    };
  }

  async function processarLinhas(planilha) {
    const required = ["descricao", "sku", "ean", "precoCusto", "canal"];
    const faltaCabecalho = planilha.length === 0 || required.some(col => !Object.keys(planilha[0]).includes(col));
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
      // SheetJS usa , por padrão; para arquivos exportados com ;, tente { FS: ';' }
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
    <Card sx={{ maxWidth: 760, mx: 'auto', my: 2 }}>
      <CardContent>
        <Typography variant="h6" fontWeight={700} gutterBottom>
          Precificação em Lote
        </Typography>
        <Alert severity="info" sx={{ mb: 2 }}>
          Faça o download do <b>modelo de planilha</b> abaixo, preencha com seus produtos e importe sem alterar os nomes das colunas!
        </Alert>
        <Typography variant="body2" sx={{ mt: 1 }}>
          Baixe o&nbsp;
          <a
            href="#"
            style={{
              color: "#1976d2",
              textDecoration: "underline",
              fontWeight: 600
            }}
            onClick={downloadModeloPlanilha}
          >
            modelo de planilha CSV <DownloadIcon fontSize="small" style={{marginBottom: 5}}/>
          </a>
        </Typography>
        <Box display="flex" flexDirection={{ xs: "column", sm: "row" }} alignItems="center" gap={2} mb={2}>
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
            <Box component="table" sx={{ width: '100%', borderSpacing: 0 }}>
              <Box component="thead">
                <Box component="tr">
                  {Object.keys(preview[0]).map((k, idx) => (
                    <Box
                      component="th"
                      key={idx}
                      sx={{ textAlign: "left", pr: 2, borderBottom: 1, fontWeight: 700, fontSize: 12 }}
                    >
                      {k}
                    </Box>
                  ))}
                </Box>
              </Box>
              <Box component="tbody">
                {preview.map((row, idx) => (
                  <Box component="tr" key={idx}>
                    {Object.values(row).map((val, j) =>
                      <Box
                        component="td"
                        key={j}
                        sx={{ fontSize: 12, pr: 2, py: 0.5 }}
                      >{val?.toString()}</Box>
                    )}
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
