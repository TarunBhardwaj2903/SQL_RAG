import React from 'react';

/**
 * React error boundary wrapping ChartRouter.
 * If any chart component throws during render, falls back to the
 * DataTable (passed as fallbackElement prop) and logs the error.
 */
export default class ChartErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('[ChartErrorBoundary] Chart render failed:', error, info);
  }

  render() {
    if (this.state.hasError) {
      // Render the fallback (DataTable) that was passed in
      return this.props.fallbackElement ?? null;
    }
    return this.props.children;
  }
}
