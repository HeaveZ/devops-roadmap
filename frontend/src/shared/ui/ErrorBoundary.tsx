import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.error('ErrorBoundary caught', error, info);
    }
  }

  reset = (): void => this.setState({ error: null });

  render(): ReactNode {
    if (this.state.error) {
      return (
        this.props.fallback ?? (
          <div className="m-10 p-8 rounded-xl border border-status-red/40 bg-status-red/10 text-status-red text-center">
            <div className="text-lg font-bold mb-2">Bir sey ters gitti</div>
            <div className="text-sm mb-4 text-muted">{this.state.error.message}</div>
            <button
              type="button"
              className="px-4 py-2 rounded-md bg-navy-800 border border-border text-ink hover:bg-navy-700"
              onClick={this.reset}
            >
              Tekrar Dene
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
