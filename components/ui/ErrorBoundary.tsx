import React from "react";
import { toast } from "./use-toast";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    toast({
      title: "An unexpected error occurred",
      description: error.message,
      variant: "destructive",
    });
    // Optionally log errorInfo to an error reporting service
    // console.error(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-3xl font-bold mb-4">Something went wrong</h1>
              <p className="text-muted-foreground mb-2">{this.state.error?.message}</p>
              <p className="text-muted-foreground">Please refresh the page or contact support.</p>
            </div>
          </div>
        )
      );
    }
    return this.props.children;
  }
}

export { ErrorBoundary };
export default ErrorBoundary; 