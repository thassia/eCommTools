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

  function downloadModeloPlanilha(e) {
    e.preventDefault();
    const header = [
      "descricao",
      "sku",
      "ean",
      "precoCusto",
      "canal",
      "tipoAnuncio",
      "comissao",
      "tarifaFixa",
      "custoFixo",
      "imposto",
      "lucro"
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
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }


  // Mapeia campos da planilha para padrão camelCase do sistema
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
      frete: "", // ajuste se quiser receber na planilha futuramente
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

  async function processarPlanilha() {
    if (!file) return setMsg("Selecione um arquivo.");
    setSuccess(false);
    setMsg("");
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const wb = XLSX.read(evt.target.result, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      let planilha = XLSX.utils.sheet_to_json(ws, { defval: "" });
      // Validação: verificar se as colunas mínimas existem
      const required = ["descricao", "sku", "ean", "precoCusto", "canal"];
      const faltaCabecalho = planilha.length === 0 || required.some(col => !Object.keys(planilha[0]).includes(col));
      if (faltaCabecalho) {
        setMsg("O arquivo selecionado não segue o modelo do sistema. Baixe e use o modelo oficial.");
        return;
      }
      const processada = planilha.map(calcularLinha);
      setPreview(processada.slice(0, 5));
      setSuccess(true);
      // Salva cada linha no Firestore
      for (const produto of processada) {
        await addDoc(collection(db, "historico_precificacao"), {
          ...produto,
          usuario: usuario.email,
          criadoEm: new Date().toISOString()
        });
      }
    };
    reader.readAsArrayBuffer(file);
  }

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>Precificação em Lote (Planilha)</Typography>
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
            modelo de planilha CSV <DownloadIcon fontSize="small" style={{marginBottom: -3}}/>
          </a>
          &nbsp;para preenchimento.
        </Typography>

        <Button
          component="label"
          variant="outlined"
          startIcon={<UploadFileIcon />}
          sx={{ mr: 2 }}
        >
          Anexar planilha preenchida
          <input type="file" accept=".xlsx,.xls,.csv" hidden onChange={e => setFile(e.target.files[0])} />
        </Button>

        <Button
          color="success"
          variant="contained"
          onClick={processarPlanilha}
          startIcon={<DownloadIcon />}
          sx={{ ml: 1 }}
        >
          Processar e Salvar
        </Button>
        {success && <Alert severity="success" sx={{ mt: 2 }}>Processado e salvo! Veja prévia abaixo.</Alert>}
        {msg && <Alert severity="warning" sx={{ mt: 2 }}>{msg}</Alert>}
        {preview.length > 0 &&
          <Box sx={{ mt: 2, overflow: 'auto', maxHeight: 220 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Prévia dos primeiros produtos:</Typography>
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {Object.keys(preview[0]).map(k => (
                    <th key={k} style={{ textAlign: 'left', borderBottom: '1px solid #eee', padding: '4px 8px' }}>{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((row, idx) => (
                  <tr key={idx} style={{ background: idx % 2 ? '#f9f9f9' : '' }}>
                    {Object.values(row).map((val, j) =>
                      <td key={j} style={{ padding: '4px 8px' }}>{val?.toString()}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        }
      </CardContent>
    </Card>
  );
}
