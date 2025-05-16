// src/context/SocketContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import { io } from "socket.io-client";

// Create context
const SocketContext = createContext(null);

// Socket instance
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3001";
const socket = io(SOCKET_URL, {
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    withCredentials: true,
});

export function SocketProvider({ children }) {
    const [isConnected, setIsConnected] = useState(false);
    const [username, setUsername] = useState("");
    const [activeRooms, setActiveRooms] = useState([]);
    const [error, setError] = useState("");
    const [playerType, setPlayerType] = useState("spectator");
    const [gotUserData, setGotUserData] = useState(false);

    const navigate = useNavigate();

    useEffect(() => {
        // Connect to socket
        const onConnect = () => {
            setIsConnected(true);
            socket.emit("getRooms");

            // Get username from localStorage
            const storedUsername = localStorage.getItem("username");
            if (storedUsername) {
                setUsername(storedUsername);
            }
        };

        const onDisconnect = () => {
            setIsConnected(false);
        };

        const onRoomsList = (rooms) => {
            setActiveRooms(rooms);
        };

        const onError = (message) => {
            setError(message.message || message);
            setTimeout(() => setError(""), 5000);
        };

        const onJoinGameRoom = ({ roomName, asPlayerType, player1, player2, spectators }) => {
            setPlayerType(asPlayerType);
            navigate(`/game/${roomName}`);
        };

        const onUserData = (data) => {
            setGotUserData(true);
            debugger;
            setUsername(decodeURIComponent(data.username));
            setUsernamePersist(decodeURIComponent(data.username));
        };

        socket.on("userData", onUserData);

        socket.on("connect", onConnect);
        socket.on("disconnect", onDisconnect);
        socket.on("roomsList", onRoomsList);
        socket.on("error", onError);
        socket.on("joinGameRoom", onJoinGameRoom);

        // Clean up
        return () => {
            socket.off("connect", onConnect);
            socket.off("disconnect", onDisconnect);
            socket.off("roomsList", onRoomsList);
            socket.off("error", onError);
        };
    }, []);

    useEffect(() => {
        setUsernamePersist(username);
    }, [username]);

    // Save username to localStorage
    const setUsernamePersist = (name) => {
        setUsername(name);
        localStorage.setItem("username", name);
    };

    // Context value
    const value = {
        socket,
        isConnected,
        username,
        setUsername: setUsernamePersist,
        activeRooms,
        error,
        setError,
        gotUserData,
        setGotUserData,
    };

    return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

// Custom hook to use the socket context
export function useSocket() {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error("useSocket must be used within a SocketProvider");
    }
    return context;
}
