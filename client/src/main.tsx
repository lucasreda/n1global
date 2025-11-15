import { createRoot } from "react-dom/client";
import { Component, ReactNode } from "react";
import App from "./App";
import "./index.css";
import "./lib/i18n"; // Initialize i18n

// Error Boundary para capturar erros
class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Erro capturado pelo ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#020817',
          color: 'white',
          padding: '2rem',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>⚠️ Erro ao carregar a aplicação</h1>
          <p style={{ color: '#94a3b8', textAlign: 'center', maxWidth: '600px' }}>
            {this.state.error?.message || 'Ocorreu um erro inesperado. Por favor, recarregue a página.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            Recarregar página
          </button>
          {this.state.error && (
            <details style={{ marginTop: '1rem', color: '#94a3b8', fontSize: '0.875rem' }}>
              <summary style={{ cursor: 'pointer', marginBottom: '0.5rem' }}>Detalhes do erro</summary>
              <pre style={{ 
                backgroundColor: '#1e293b', 
                padding: '1rem', 
                borderRadius: '0.5rem',
                overflow: 'auto',
                maxWidth: '100%',
                fontSize: '0.75rem'
              }}>
                {this.state.error.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

const root = document.getElementById("root");
if (!root) {
  throw new Error("Root element not found");
}

try {
  createRoot(root).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
} catch (error) {
  console.error('Erro ao renderizar a aplicação:', error);
  root.innerHTML = `
    <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background-color: #020817; color: white; padding: 2rem; flex-direction: column; gap: 1rem;">
      <h1 style="font-size: 1.5rem; font-weight: bold;">⚠️ Erro crítico ao iniciar</h1>
      <p style="color: #94a3b8;">${error instanceof Error ? error.message : 'Erro desconhecido'}</p>
      <button onclick="window.location.reload()" style="padding: 0.75rem 1.5rem; background-color: #3b82f6; color: white; border: none; border-radius: 0.5rem; cursor: pointer;">
        Recarregar página
      </button>
    </div>
  `;
}
