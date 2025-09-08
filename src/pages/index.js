import { useState, useEffect } from "react";

// Adicione apenas para teste. Depois pode remover!
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";

import LoginGoogle from "@/components/LoginGoogle";
import PrecificacaoLote from "@/components/PrecificacaoLote";
import PrecificacaoIndividual from "@/components/PrecificacaoIndividual";
import HistoricoConsultas from "@/components/HistoricoConsultas";
import { Container, Typography, Box, Card, Tabs, Tab } from "@mui/material";

export default function Home() {
  const [user, setUser] = useState(null);

// Dentro de um useEffect ou após usuário logar:
useEffect(() => {
  async function testarConexao() {
    try {
      await addDoc(collection(db, "teste_conexao"), {
        mensagem: "Teste de conexão OK",
        data: new Date().toISOString()
      });
      alert("Conexão com Firestore OK! Veja a coleção 'teste_conexao' no painel Firebase.");
    } catch (err) {
      alert("Erro ao conectar no Firestore: " + (err.message || String(err)));
    }
  }
  testarConexao();
}, []);

  const [aba, setAba] = useState(0);

  return (
    <Container maxWidth="md" sx={{ pt: 5 }}>
      <Card elevation={4} sx={{ p: 3, mb: 3, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
        <Typography variant="h4" gutterBottom>Agente de Precificação</Typography>
      </Card>
      <LoginGoogle onAuthChange={setUser} />
      {user ? (
        <Box sx={{mt: 3}}>
          <Tabs value={aba} onChange={(e, v) => setAba(v)}>
            <Tab label="Precificar Produto Único" />
            <Tab label="Precificar em Lote" />
            <Tab label="Consultar Histórico" />
          </Tabs>
          <Box sx={{mt:3}}>
            {aba===0 && <PrecificacaoIndividual usuario={user} />}
            {aba===1 && <PrecificacaoLote usuario={user} />}
            {aba===2 && <HistoricoConsultas usuario={user} />}
          </Box>
        </Box>
      ) : (
        <Box sx={{ mt: 8, textAlign: "center" }}>
          <Typography variant="h6" color="textSecondary">
            Faça login com Google para acessar o sistema.
          </Typography>
        </Box>
      )}
      <Box sx={{ textAlign: "center", mt: 6, color: "#aaa" }}>
        <Typography variant="caption">Desenvolvido por Thassia © {new Date().getFullYear()}</Typography>
      </Box>
    </Container>
  );
}