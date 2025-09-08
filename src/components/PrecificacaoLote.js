import { useState } from "react";
import * as XLSX from "xlsx";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { Card, CardContent, Button, Typography, Alert, Box } from "@mui/material";
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';

export default function PrecificacaoLote({ usuario }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [success, setSuccess] = useState(false);
  const [msg, setMsg] = useState("");

  function calcularLinha(row) {
    // Exemplo simples, ajuste conforme sua lógica real
    let precoCusto = parseFloat(row['PreçoCusto'] || 0);
    let frete = parseFloat(row['CustoLogistico'] || 0);
    let comissao = parseFloat(row['ComissaoCanal(%)'] || 0);
    let imposto = parseFloat(row['Imposto(%)'] || 0);
    let lucro = parseFloat(row['LucroDesejado(%)'] || 0);
    let custoFixo = parseFloat(row['CustoFixo(%)'] || 0);
    let taxaTotal = (comissao + imposto + lucro + custoFixo) / 100;
    let precoVenda = (precoCusto + frete) / (1 - taxaTotal);
    return {...row, PrecoVenda: precoVenda.toFixed(2)};
  }

  async function processarPlanilha() {
    if (!file) return setMsg("Selecione um arquivo.");
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const wb = XLSX.read(evt.target.result, {type: 'array'});
      const ws = wb.Sheets[wb.SheetNames[0]];
      let planilha = XLSX.utils.sheet_to_json(ws, {defval: ""});
      const processada = planilha.map(calcularLinha);
      setPreview(processada.slice(0,5));
      setSuccess(true);

      // Salva cada linha no Firestore (pode otimizar com batch)
      for (const produto of processada) {
        await addDoc(collection(db, "historico_precificacao"), {
          ...produto,
          usuario: usuario.email,
          tipo: "lote",
          criadoEm: new Date().toISOString()
        });
      }
    };
    reader.readAsArrayBuffer(file);
  }

  return (
    <Card sx={{mb:2}}>
      <CardContent>
        <Typography variant="h6" gutterBottom>Precificação em Lote (Planilha)</Typography>
        <Button
          component="label"
          variant="outlined"
          startIcon={<UploadFileIcon />}
          sx={{mr:2}}
        >
          Anexar planilha
          <input type="file" accept=".xlsx,.xls" hidden onChange={e => setFile(e.target.files[0])} />
        </Button>
        <Button
          color="success"
          variant="contained"
          onClick={processarPlanilha}
          startIcon={<DownloadIcon />}
          sx={{ml:1}}
        >
          Processar e Salvar
        </Button>
        {success && <Alert severity="success" sx={{mt:2}}>Processado e salvo! Veja prévia abaixo.</Alert>}
        {msg && <Alert severity="info" sx={{mt:2}}>{msg}</Alert>}
        {preview.length > 0 &&
          <Box sx={{mt:2,overflow:'auto',maxHeight:200}}>
            <table style={{width:'100%', fontSize:13, borderCollapse:'collapse'}}>
              <thead>
                <tr>
                  {Object.keys(preview[0]).map(k => (
                    <th key={k} style={{textAlign:'left', borderBottom:'1px solid #eee', padding:'4px 8px'}}>{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((row, idx) => (
                  <tr key={idx} style={{background: idx%2?'#f9f9f9':''}}>
                    {Object.values(row).map((val,j) =>
                      <td key={j} style={{padding:'4px 8px'}}>{val?.toString()}</td>)}
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
