import React from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props)
        this.state = { hasError: false, error: null, errorInfo: null }
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error }
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ errorInfo })
        // Log error to console (could send to error tracking service)
        console.error('ErrorBoundary caught:', error, errorInfo)
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null, errorInfo: null })
        window.location.reload()
    }

    handleGoHome = () => {
        this.setState({ hasError: false, error: null, errorInfo: null })
        window.location.href = '/'
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="error-boundary-container">
                    <div className="error-boundary-content">
                        <div className="error-icon">
                            <AlertTriangle size={64} />
                        </div>
                        <h1>Oops! Terjadi Kesalahan</h1>
                        <p>Maaf, terjadi error yang tidak terduga. Silakan coba lagi atau kembali ke halaman utama.</p>

                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <details className="error-details">
                                <summary>Detail Error (Development Only)</summary>
                                <pre>{this.state.error.toString()}</pre>
                                {this.state.errorInfo && (
                                    <pre>{this.state.errorInfo.componentStack}</pre>
                                )}
                            </details>
                        )}

                        <div className="error-actions">
                            <button className="btn btn-primary" onClick={this.handleRetry}>
                                <RefreshCw size={18} /> Coba Lagi
                            </button>
                            <button className="btn btn-secondary" onClick={this.handleGoHome}>
                                <Home size={18} /> Ke Beranda
                            </button>
                        </div>
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}

export default ErrorBoundary
