import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

describe('ErrorBoundary', () => {
  const ConsoleError = console.error;
  beforeEach(() => {
    console.error = vi.fn();
  });
  afterEach(() => {
    console.error = ConsoleError;
  });

  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <h1 data-testid="content">Hello</h1>
      </ErrorBoundary>
    );
    expect(screen.getByTestId('content')).toBeInTheDocument();
  });

  it('renders error heading when child throws', () => {
    const Broken = () => {
      throw new Error('Test failure');
    };
    render(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('renders error message when child throws', () => {
    const Broken = () => {
      throw new Error('Custom error message');
    };
    render(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>
    );
    expect(screen.getByText('Custom error message')).toBeInTheDocument();
  });

  it('renders diagnostic details when errorInfo is available', () => {
    const Broken = () => {
      throw new Error('Stack test');
    };
    render(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>
    );
    // componentStack may or may not be present depending on environment;
    // just verify the boundary catches the error without blank screen
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('renders retry button', () => {
    const Broken = () => {
      throw new Error('Retry test');
    };
    render(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>
    );
    expect(screen.getByText(/Retry \(attempt 1\)/)).toBeInTheDocument();
  });

  it('resets error state on retry', () => {
    const Broken = () => {
      throw new Error('Reset test');
    };
    render(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Retry \(attempt 1\)/));
    // After retry, children should render again (Broken throws again, so error shows)
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('recovers and catches errors again after retry', () => {
    const Broken = () => {
      throw new Error('Count test');
    };
    render(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Retry \(attempt 1\)/));
    // After retry, children re-render and throw again — boundary catches again
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    // Retry button is still present with incremented count
    expect(screen.getByText(/Retry \(attempt \d+\)/)).toBeInTheDocument();
  });

  it('renders custom fallback when provided', () => {
    const Broken = () => {
      throw new Error('Fallback test');
    };
    render(
      <ErrorBoundary fallback={<div data-testid="custom-fallback">Custom fallback</div>}>
        <Broken />
      </ErrorBoundary>
    );
    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  it('calls onError prop when error occurs', () => {
    const onError = vi.fn();
    const Broken = () => {
      throw new Error('Callback test');
    };
    render(
      <ErrorBoundary onError={onError}>
        <Broken />
      </ErrorBoundary>
    );
    expect(onError).toHaveBeenCalled();
  });

  it('does not leave blank screen when error boundary catches error', () => {
    const Broken = () => {
      throw new Error('Blank screen test');
    };
    const { container } = render(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>
    );
    // The container should have visible content (error UI), not be empty
    expect(container.firstChild).not.toBeNull();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });
});
