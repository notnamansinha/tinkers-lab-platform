import React, { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in React component tree:', error, errorInfo)
    this.setState({ error, errorInfo })
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: '#0A0A0A',
          color: '#FFFFFF',
          fontFamily: 'Outfit, sans-serif',
          padding: '2rem',
          textAlign: 'center'
        }}>
          <div style={{
            maxWidth: '600px',
            backgroundColor: '#191919',
            border: '1px solid #272727',
            borderRadius: '16px',
            padding: '2.5rem',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
          }}>
            <div style={{
              fontSize: '3rem',
              marginBottom: '1rem',
              color: '#F67ADF'
            }}>
              ⚠️
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.75rem' }}>
              Something went wrong
            </h1>
            <p style={{ color: '#A1A1AA', fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              The application encountered an unexpected error during rendering.
            </p>
            {import.meta.env.DEV && this.state.error && (
              <pre
                style={{
                  backgroundColor: '#000000',
                  border: '1px solid #272727',
                  borderRadius: '8px',
                  padding: '1rem',
                  fontSize: '0.8rem',
                  textAlign: 'left',
                  overflowX: 'auto',
                  color: '#FFB249',
                  marginBottom: '1.5rem',
                  maxHeight: '200px',
                }}
              >
                {this.state.error.toString()}
              </pre>
            )}
            <button
              onClick={() => window.location.reload()}
              style={{
                backgroundColor: '#504BEF',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '999px',
                padding: '12px 28px',
                fontSize: '0.9rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
