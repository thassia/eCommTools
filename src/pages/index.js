import { useState, useEffect } from "react";
import LoginGoogle from "@/components/LoginGoogle";
import PrecificacaoLote from "@/components/PrecificacaoLote";
import PrecificacaoIndividual from "@/components/PrecificacaoIndividual";
import HistoricoConsultas from "@/components/HistoricoConsultas";
import { Container, Typography, Box, Card, Tabs, Tab } from "@mui/material";

export default function Home() {
  const [user, setUser] = useState(null);
  const [aba, setAba] = useState(0);

  return (
    <Container maxWidth="md" sx={{ pt: 5 }}>
      <Card elevation={4} sx={{ p: 3, mb: 3, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
        <Typography variant="h4" gutterBottom>Precificador</Typography>
      </Card>
      <LoginGoogle onAuthChange={setUser} />
      {user ? (
        <Box sx={{mt: 3}}>
          <Tabs value={aba} onChange={(e, v) => setAba(v)}>
            <Tab label="Precificar Produto Único" />
            <Tab label="Precificar em Lote (em dev)" />
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