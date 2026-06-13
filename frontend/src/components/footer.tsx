import { Link } from "react-router-dom";

export function Footer() {
    return (
        <footer className="border-t mt-auto">
            <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-4 px-6 py-6 sm:flex-row sm:justify-between">
                <p className="text-xs text-muted-foreground">
                    © 2026 Thribhu K (It's literally his past paper repository). Licensed under MIT.
                </p>
                <nav className="flex gap-4 text-xs text-muted-foreground">
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
                </nav>
            </div>
        </footer>
    );
}