import { Link } from "react-router-dom";
import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/theme";

export function Footer() {
    const { theme, setTheme } = useTheme();

    function cycleTheme() {
        const next = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
        setTheme(next);
    }

    return (
        <footer className="border-t mt-auto">
            <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-4 px-6 py-6 sm:flex-row sm:justify-between">
                <p className="text-xs text-muted-foreground">
                    © 2026 Thribhu K (It's literally his past paper repository). Licensed under MIT.
                </p>
                <nav className="flex items-center gap-4 text-xs text-muted-foreground">
                    <Link to="/legal/privacy" className="hover:text-foreground transition-colors">
                        Privacy
                    </Link>
                    <Link to="/legal/copyright" className="hover:text-foreground transition-colors">
                        Copyright
                    </Link>
                    <a
                        href="https://github.com/TempeHS/2026SE_MajorProject_Thribhu.K"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-foreground transition-colors"
                    >
                        GitHub
                    </a>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={cycleTheme}
                        title={`Theme: ${theme}`}
                    >
                        {theme === "light" && <Sun className="size-3.5" />}
                        {theme === "dark" && <Moon className="size-3.5" />}
                        {theme === "system" && <Monitor className="size-3.5" />}
                    </Button>
                </nav>
            </div>
        </footer>
    );
}