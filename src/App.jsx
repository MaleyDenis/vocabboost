import { useState } from "react";
import { getSecret, clearSecret } from "./api";
import Login from "./components/Login";
import Home from "./components/Home";
import Folders from "./components/Folders";
import Words from "./components/Words";

export default function App() {
  const [authed, setAuthed] = useState(Boolean(getSecret()));
  const [openDict, setOpenDict] = useState(null);
  const [openFolder, setOpenFolder] = useState(null);

  function logout() {
    clearSecret();
    setOpenFolder(null);
    setOpenDict(null);
    setAuthed(false);
  }

  if (!authed) return <Login onSuccess={() => setAuthed(true)} />;

  if (openFolder) {
    return (
      <Words
        folder={openFolder}
        onBack={() => setOpenFolder(null)}
        onLogout={logout}
      />
    );
  }

  if (openDict) {
    return (
      <Folders
        dictionary={openDict}
        onOpenFolder={setOpenFolder}
        onBack={() => setOpenDict(null)}
        onLogout={logout}
      />
    );
  }

  return <Home onOpen={setOpenDict} onLogout={logout} />;
}
