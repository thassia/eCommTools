import { useState, useEffect } from "react";
import { auth, googleProvider } from "@/lib/firebase";
import { signInWithPopup, signOut } from "firebase/auth";
import { Button, Avatar, Typography, Box } from "@mui/material";
import GoogleIcon from "@mui/icons-material/Google";

export default function LoginGoogle({ onAuthChange }) {
  const [user, setUser] = useState(auth.currentUser);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(usuario => {
      setUser(usuario);
      if (onAuthChange) onAuthChange(usuario);
    });
    return unsub;
  }, [onAuthChange]);

  const login = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    setUser(result.user);
    if (onAuthChange) onAuthChange(result.user);
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    if (onAuthChange) onAuthChange(null);
  };

  return (
    <Box sx={{textAlign:"center", my:2}}>
      {user ? (
        <Box>
          {/*<Avatar src={user.photoURL} sx={{margin:'auto'}} />
          <Typography variant="body1">{user.displayName}</Typography>
          <br />*/}
          <Typography variant="caption">{user.email} </Typography>
          <Button variant="outlined" color="error" onClick={logout}>Sair</Button>
        </Box>
      ) : (
        <Button
          startIcon={<GoogleIcon />}
          variant="contained"
          color="primary"
          onClick={login}
        >
          Entrar com Google
        </Button>
      )}
    </Box>
  );
}
