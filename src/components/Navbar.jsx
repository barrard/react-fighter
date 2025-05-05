import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { useSocket } from "../context/SocketContext";
import { Button } from "@/components/ui/button";
import { Swords } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function Navbar() {
    const { username, isConnected, error, setError, socket } = useSocket();

    return (
        <header className="bg-background border-b">
            <div className="container mx-auto py-4 px-4 flex items-center justify-between">
                <Link to="/" className="flex items-center gap-2">
                    <Swords className="h-6 w-6 text-primary" />
                    <span className="text-xl font-bold">Fighter Arena</span>
                </Link>

                {error && (
                    <div className="flex items-center gap-4">
                        <Alert variant="destructive" className="mb-6">
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    </div>
                )}

                <div className="flex items-center gap-4">
                    {isConnected ? (
                        <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-green-500"></div>
                            <span className="text-sm text-muted-foreground">Connected</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-red-500"></div>
                            <span className="text-sm text-muted-foreground">Disconnected</span>
                        </div>
                    )}

                    {username && (
                        <Button variant="ghost" size="sm" className="text-sm">
                            Playing as: {username}
                        </Button>
                    )}
                </div>
            </div>
        </header>
    );
}
