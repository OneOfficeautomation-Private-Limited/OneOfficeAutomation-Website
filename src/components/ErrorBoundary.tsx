import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Link } from 'react-router-dom';

/**
 * Catches a page that fails while drawing, so visitors see a short message with a way forward instead of a blank screen.
 * The header and footer keep working. Layout gives it a key per address, so moving to another page starts fresh.
 */
export default class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Page failed to load', error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <section className="err-page" role="alert">
        <span className="err-mark" aria-hidden="true">!</span>
        <h1>Something went wrong on this page.</h1>
        <p>It’s not you. Reloading usually fixes it; if it doesn’t, these will get you where you need to go.</p>
        <div className="err-actions">
          <button type="button" className="ds-btn ds-btn-grad" onClick={() => window.location.reload()}>Reload the page</button>
          <Link className="ds-btn ds-btn-outline" to="/">Go to the home page</Link>
        </div>
        <nav className="err-links" aria-label="Popular pages">
          <Link to="/platform">Platform</Link><Link to="/pricing">Pricing</Link><Link to="/resources/docs">Documentation</Link><Link to="/contact">Contact us</Link>
        </nav>
      </section>
    );
  }
}
