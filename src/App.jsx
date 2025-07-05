import "./App.css";
import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Lobby from "./pages/Lobby";
import GameRoom from "./pages/GameRoom";
import NotFound from "./pages/NotFound";
// import CanvasComponent from "./components/CanvasComponent";
import { SocketProvider } from "./context/SocketContext";

function App() {
    return (
        <SocketProvider>
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
