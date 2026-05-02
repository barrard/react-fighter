import { Outlet } from "react-router-dom";
// import { ThemeProvider } from "./theme/theme-provider";
import Navbar from "./Navbar";

export default function Layout() {
    return (
        <div className="h-full flex flex-col overflow-hidden bg-background">
            <Navbar />
            <main className="flex-1 min-h-0 overflow-hidden container mx-auto px-4 py-3">
                <Outlet context={{ someValue: "data", someFunction: () => {} }} />
            </main>
        </div>
    );
}
