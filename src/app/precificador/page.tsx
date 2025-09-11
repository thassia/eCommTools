'use client'

import { useState } from "react"
import LoginGoogle from "@/components/LoginGoogle"
import PrecificacaoLote from "@/components/PrecificacaoLote"
import PrecificacaoIndividual from "@/components/PrecificacaoIndividual"
import HistoricoConsultas from "@/components/HistoricoConsultas"
import { Container, Typography, Box, Card, Tabs, Tab } from "@mui/material"

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [aba, setAba] = useState(0)

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h3" align="center" gutterBottom>
        Precificador de Marketplaces
      </Typography>

      {/* Login */}
      <Box sx={{ mb: 4, display: "flex", justifyContent: "center" }}>
        <LoginGoogle onAuthChange={setUser} />
      </Box>

      {user ? (
        <Card elevation={3} sx={{ p: 2 }}>
          <Tabs value={aba} onChange={(_, v) => setAba(v)} centered>
            <Tab label="Precificação Individual" />
            <Tab label="Precificação em Lote" />
            <Tab label="Histórico de Consultas" />
          </Tabs>

          <Box sx={{ mt: 3 }}>
            {aba === 0 && <PrecificacaoIndividual usuario={user} />}
            {aba === 1 && <PrecificacaoLote usuario={user} />}
            {aba === 2 && <HistoricoConsultas usuario={user} />}
          </Box>
        </Card>
      ) : (
        <Typography align="center" color="text.secondary" sx={{ mt: 4 }}>
          Faça login com Google para acessar o sistema.
        </Typography>
      )}

      <Box sx={{ mt: 4, textAlign: "center", color: "text.secondary", fontSize: 14 }}>
        Desenvolvido por Thassia © {new Date().getFullYear()}
      </Box>
    </Container>
  )
}
