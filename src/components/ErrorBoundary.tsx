import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Error de renderizado:', error, errorInfo);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            background: '#0d4a2e',
            color: '#f5f0e6',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <div style={{ maxWidth: 480 }}>
            <h1 style={{ color: '#f0c96a' }}>Algo ha fallado</h1>
            <p>{this.state.error.message}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                marginTop: '1rem',
                padding: '0.75rem 1.5rem',
                background: '#d4a84b',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Recargar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
