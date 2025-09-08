import { useState } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { Card, CardContent, TextField, Button, Typography, Alert, Box } from "@mui/material";

export default function PrecificacaoIndividual({ usuario }) {
  const [dados, setDados] = useState({
    descricao: '', canal: '', precoCusto: '', frete: '', imposto: '', comissao: '', lucro: '', custoFixo: ''
  });
  const [resultado, setResultado] = useState(null);
  const [sucesso, setSucesso] = useState(false);

  function calcular() {
    // Transformar em numbers válidos
    const v = {
      ...dados,
      precoCusto: parseFloat(dados.precoCusto),
      frete: parseFloat(dados.frete || 0),
      imposto: parseFloat(dados.imposto),
      comissao: parseFloat(dados.comissao),
      lucro: parseFloat(dados.lucro),
      custoFixo: parseFloat(dados.custoFixo)
    };
    const taxaTotal = (v.comissao + v.imposto + v.lucro + v.custoFixo) / 100;
    const precoVenda = (v.precoCusto + v.frete) / (1 - taxaTotal);
    setResultado({ ...v, precoVenda: precoVenda.toFixed(2) });
    setSucesso(false);
  }

  async function salvarFirestore() {
    if (!resultado) return;
    await addDoc(collection(db, "historico_precificacao"), {
      ...resultado,
      usuario: usuario.email,
      criadoEm: new Date().toISOString()
    });
    setSucesso(true);
  }

  return (
    <Card sx={{mb:2}}>
      <CardContent>
        <Typography variant="h6" gutterBottom>Precificação de Produto Único</Typography>
        <Box
          component="form"
          sx={{display:'flex', flexWrap:'wrap', gap:2, mb:2}}
          onSubmit={e => {e.preventDefault();calcular();}}
        >
          <TextField label="Descrição" required value={dados.descricao}
            onChange={e=>setDados(d=>({...d,descricao:e.target.value}))} sx={{width:170}} />
          <TextField label="Canal" required value={dados.canal}
            onChange={e=>setDados(d=>({...d,canal:e.target.value}))} sx={{width:130}} />
          <TextField label="Preço de Custo" required type="number" value={dados.precoCusto}
            onChange={e=>setDados(d=>({...d,precoCusto:e.target.value}))} sx={{width:115}} />
          <TextField label="Frete Unitário" type="number" value={dados.frete}
            onChange={e=>setDados(d=>({...d,frete:e.target.value}))} sx={{width:115}} />
          <TextField label="% Imposto" required type="number" value={dados.imposto}
            onChange={e=>setDados(d=>({...d,imposto:e.target.value}))} sx={{width:100}} />
          <TextField label="% Comissão" required type="number" value={dados.comissao}
            onChange={e=>setDados(d=>({...d,comissao:e.target.value}))} sx={{width:100}} />
          <TextField label="% Lucro" required type="number" value={dados.lucro}
            onChange={e=>setDados(d=>({...d,lucro:e.target.value}))} sx={{width:100}} />
          <TextField label="% Custo Fixo" required type="number" value={dados.custoFixo}
            onChange={e=>setDados(d=>({...d,custoFixo:e.target.value}))} sx={{width:110}} />
          <Button variant="contained" color="primary" type="submit" sx={{height:56}}>Calcular</Button>
        </Box>
        {resultado &&
          <Box sx={{mb:2}}>
            <Alert severity="info">Preço sugerido de venda: <b>R$ {resultado.precoVenda}</b></Alert>
            <Button variant="contained" color="success" onClick={salvarFirestore} sx={{mt:1}}>Salvar no histórico</Button>
          </Box>
        }
        {sucesso && <Alert severity="success" sx={{mt:1}}>Salvo no histórico com sucesso!</Alert>}
      </CardContent>
    </Card>
  );
}
