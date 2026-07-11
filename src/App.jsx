import { useState } from "react";
import { getSecret } from "./api";
import Login from "./components/Login";
import Home from "./components/Home";

export default function App() {
  const [authed, setAuthed] = useState(Boolean(getSecret()));

  if (!authed) return <Login onSuccess={() => setAuthed(true)} />;
  return <Home onLogout={() => setAuthed(false)} />;
}
