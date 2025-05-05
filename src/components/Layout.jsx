import { Outlet } from "react-router-dom";
// import { ThemeProvider } from "./theme/theme-provider";
import Navbar from "./Navbar";

export default function Layout() {
    return (
        // <ThemeProvider defaultTheme="dark" storageKey="fighter-game-theme">
        <div className="min-h-screen bg-background">
            <Navbar />
            <main className="container mx-auto py-6 px-4">
                <Outlet context={{ someValue: "data", someFunction: () => {} }} />
            </main>
        </div>
        // </ThemeProvider>
    );
}
