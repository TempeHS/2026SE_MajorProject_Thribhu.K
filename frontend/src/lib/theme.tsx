import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

const ThemeContext = createContext<{
    theme: Theme;
    setTheme: (t: Theme) => void;
}>({ theme: "system", setTheme: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState<Theme>(
        () => (localStorage.getItem("theme") as Theme) || "system",
    );

    useEffect(() => {
        const root = document.documentElement;
        const systemDark =
            window.matchMedia("(prefers-color-scheme: dark)").matches;
        const isDark = theme === "dark" || (theme === "system" && systemDark);

        root.classList.toggle("dark", isDark);
        localStorage.setItem("theme", theme);
    }, [theme]);

    // listening for changes in system mode
    useEffect(() => {
        const mq = window.matchMedia("(prefers-color-scheme: dark)");
        const handler = () => {
            if (theme === "system") {
                document.documentElement.classList.toggle("dark", mq.matches);
            }
        };
        mq.addEventListener("change", handler);
        return () => mq.removeEventListener("change", handler);
    }, [theme]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = () => useContext(ThemeContext);
