import { Link, useLocation } from "react-router-dom"
import { LogIn } from "lucide-react"
import { Button } from "@/components/ui/button"

interface AuthPromptProps {
  title?: string
  description?: string
  className?: string
}

export function AuthPrompt({
  title = "Sign in required",
  description = "You need to be signed in to do this.",
  className,
}: AuthPromptProps) {
  const location = useLocation()
  const redirect = encodeURIComponent(location.pathname)

  return (
    <div
      className={`flex flex-col items-center gap-3 rounded-xl border border-dashed p-8 text-center ${className ?? ""}`}
    >
      <div className="flex size-10 items-center justify-center rounded-full bg-muted">
        <LogIn className="size-5 text-muted-foreground" />
      </div>
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="flex gap-2">
        <Button asChild variant="outline" size="sm">
          <Link to={`/login?redirect=${redirect}`}>Log in</Link>
        </Button>
        <Button asChild size="sm">
          <Link to={`/signup?redirect=${redirect}`}>Sign up</Link>
        </Button>
      </div>
    </div>
  )
}
