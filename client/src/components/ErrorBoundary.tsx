import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message?: string;
}

/**
 * Catches render errors so a broken subtree does not blank the entire app shell.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="container mx-auto max-w-lg px-4 py-16" role="alert">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" aria-hidden />
                Something went wrong
              </CardTitle>
              <CardDescription>
                Try reloading the page. If the problem persists, clear site data and try again.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {this.state.message ? (
                <p className="rounded-md bg-muted p-3 font-mono text-sm">{this.state.message}</p>
              ) : null}
              <Button type="button" onClick={() => window.location.reload()}>
                Reload
              </Button>
            </CardContent>
          </Card>
        </main>
      );
    }
    return this.props.children;
  }
}
