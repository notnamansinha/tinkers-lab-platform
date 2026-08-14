import React from 'react'
import ReactDOM from 'react-dom/client'
import ErrorBoundary from '@/components/common/ErrorBoundary'
import '@fontsource/outfit/300.css'
import '@fontsource/outfit/400.css'
import '@fontsource/outfit/500.css'
import '@fontsource/outfit/600.css'
import '@fontsource/outfit/700.css'
import '@fontsource/outfit/800.css'
import '@fontsource/fredoka/700.css'
import './styles/globals.css'

const rootEl = document.getElementById('root')!

function renderConfigError(message: string) {
  ReactDOM.createRoot(rootEl).render(
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', backgroundColor: '#0A0A0A', color: '#FFFFFF', fontFamily: 'Outfit, sans-serif',
      padding: '2rem', textAlign: 'center',
    }}>
      <div style={{ maxWidth: '500px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Configuration Error</h1>
        <p style={{ color: '#A1A1AA', fontSize: '0.9rem', marginTop: '0.75rem' }}>{message}</p>
      </div>
    </div>
  )
}

async function bootstrap() {
  try {
    const App = (await import('./App.tsx')).default
    ReactDOM.createRoot(rootEl).render(
      <React.StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </React.StrictMode>,
    )
  } catch (err: any) {
    renderConfigError(err?.message || 'Failed to initialize the application.')
  }
}

bootstrap().catch((err: any) => {
  renderConfigError(err?.message || 'Failed to start the application.')
})
