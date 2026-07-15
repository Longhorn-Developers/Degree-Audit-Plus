import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Single root-level error boundary. Catches render errors (e.g. getCourseById
 * throwing on a missing course id) so a bad reference doesn't white-screen the
 * whole degree-audit page.
 *
 * Place one instance at the page root; don't scatter throughout the tree.
 */
export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(
      "[Degree Audit Plus] Render error caught by ErrorBoundary:",
      error,
      info,
    );
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center gap-4 bg-background px-6 text-center text-text">
          <h1 className="text-2xl font-bold text-dap-primary">
            Something went wrong
          </h1>
          <p className="max-w-md text-sm text-dap-gray-light">
            An unexpected error occurred while rendering your degree audit.
            Re-run your audit from the popup to refresh the data, or click the
            button below to try again.
          </p>
          {this.state.error && (
            <pre className="max-w-lg rounded bg-gray-100 px-4 py-2 text-left text-xs text-red-600 dark:bg-gray-800">
              {this.state.error.message}
            </pre>
          )}
          <button
            onClick={this.handleReset}
            className="rounded-md bg-dap-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
