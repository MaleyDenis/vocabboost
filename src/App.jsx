import { useState } from "react";
import { getSecret, clearSecret } from "./api";
import Login from "./components/Login";
import Home from "./components/Home";
import Folders from "./components/Folders";

export default function App() {
  const [authed, setAuthed] = useState(Boolean(getSecret()));
  const [openDict, setOpenDict] = useState(null);

  function logout() {
    clearSecret();
    setOpenDict(null);
    setAuthed(false);
  }

  if (!authed) return <Login onSuccess={() => setAuthed(true)} />;

  if (openDict) {
    return (
      <Folders
        dictionary={openDict}
        onBack={() => setOpenDict(null)}
        onLogout={logout}
      />
    );
  }

  return <Home onOpen={setOpenDict} onLogout={logout} />;
}
