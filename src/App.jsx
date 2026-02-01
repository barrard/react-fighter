import "./App.css";
import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Lobby from "./pages/Lobby";
import GameRoom from "./pages/GameRoom";
import NotFound from "./pages/NotFound";
// import CanvasComponent from "./components/CanvasComponent";
import { SocketProvider } from "./context/SocketContext";

const DEBUG_NET = import.meta.env.VITE_DEBUG_NET === "true";

function DebugEnvOverlay() {
    return (
        <div
            style={{
                position: "fixed",
                top: 10,
                right: 10,
                zIndex: 9999,
                padding: "6px 8px",
                background: "rgba(0, 0, 0, 0.7)",
                color: "#fff",
                fontFamily: "monospace",
                fontSize: "12px",
                borderRadius: "4px",
                pointerEvents: "none",
            }}
        >
            DEBUG_NET: {DEBUG_NET ? "true" : "false"}
        </div>
    );
}

function App() {
    return (
        <SocketProvider>
            <DebugEnvOverlay />
            <Routes>
                <Route path="/" element={<Layout />}>
                    <Route index element={<Lobby />} />
                    <Route path="game/:roomId" element={<GameRoom />} />
                    <Route path="*" element={<NotFound />} />
                </Route>
            </Routes>
        </SocketProvider>
    );
}

export default App;
