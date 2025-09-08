import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, getDocs, limit } from "firebase/firestore";
import { Card, CardContent, Typography, Box, TextField, Button } from "@mui/material";

export default function HistoricoConsultas({ usuario }) {
  const [termo, setTermo] = useState("");
  const [historico, setHistorico] = useState([]);
  const [filtro, setFiltro] = useState("descricao");

  async function buscar() {
    let q = collection(db, "historico_precificacao");
    const filtros = [ where("usuario","==",usuario.email) ];
    if (termo) {
      filtros.push(where(filtro, "==", termo));
    }
    q = query(q, ...filtros, orderBy("criadoEm", "desc"), limit(20));
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setHistorico(data);
  }

  useEffect(() => { buscar();/* autocomplete histórico usuário ao abrir */ }, []);

  return (
    <Card sx={{mb:2}}>
      <CardContent>
        <Typography variant="h6" gutterBottom>Histórico de Precificações</Typography>
        <Box sx={{display:'flex', mb:2, gap:2}}>
          <TextField label="Buscar por" select SelectProps={{native:true}}
            value={filtro} onChange={e=>setFiltro(e.target.value)} sx={{width:120}}>
            <option value="descricao">Descrição</option>
            <option value="sku">SKU</option>
            <option value="ean">EAN</option>
          </TextField>
          <TextField label="Termo" value={termo} onChange={e=>setTermo(e.target.value)} sx={{width:200}} />
          <Button variant="contained" onClick={buscar}>Buscar</Button>
        </Box>
        <Box sx={{overflow:'auto', maxHeight:200}}>
          <table style={{width:'100%', fontSize:13, borderCollapse:'collapse'}}>
            <thead>
              <tr>
                <th>Descrição</th><th>Canal</th><th>PreçoVenda</th><th>Data/hora</th>
              </tr>
            </thead>
            <tbody>
              {historico.map(h =>
                <tr key={h.id}>
                  <td>{h.descricao}</td>
                  <td>{h.canal || ''}</td>
                  <td>{h.precoVenda || h.PrecoVenda}</td>
                  <td>{h.criadoEm ? new Date(h.criadoEm).toLocaleString() : ''}</td>
                </tr>
              )}
            </tbody>
          </table>
          {!historico.length && <Typography variant="caption">Nenhum resultado.</Typography>}
        </Box>
      </CardContent>
    </Card>
  );
}
