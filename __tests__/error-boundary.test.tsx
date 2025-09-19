import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ErrorBoundary, { 
  PageErrorBoundary, 
  SectionErrorBoundary, 
  ComponentErrorBoundary,
  useErrorBoundary 
} from '@/components/ErrorBoundary';
import { ApiErrorBoundary, useApiErrorBoundary } from '@/components/ApiErrorBoundary';

// Mock components for testing
const ThrowError = ({ shouldThrow = false, errorMessage = 'Test error' }) => {
  if (shouldThrow) {
    throw new Error(errorMessage);
  }
  return <div>No error</div>;
};

const AsyncThrowError = ({ shouldThrow = false }) => {
  React.useEffect(() => {
    if (shouldThrow) {
      throw new Error('Async test error');
    }
  }, [shouldThrow]);
  
  return <div>Async component</div>;
};

// Mock fetch for API error testing
global.fetch = jest.fn();

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console.error to avoid noise in tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Basic Error Boundary', () => {
    it('should render children when there is no error', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText('No error')).toBeInTheDocument();
    });

    it('should render error UI when error occurs', () => {
      render(
        <ErrorBoundary showErrorDetails={true}>
          <ThrowError shouldThrow={true} errorMessage="Test error message" />
        </ErrorBoundary>
      );

      expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();
      expect(screen.getByText(/Test error message/)).toBeInTheDocument();
    });

    it('should show retry button when enabled', () => {
      render(
        <ErrorBoundary enableRetry={true}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    it('should call onError callback when error occurs', () => {
      const onError = jest.fn();
      
      render(
        <ErrorBoundary onError={onError}>
          <ThrowError shouldThrow={true} errorMessage="Callback test" />
        </ErrorBoundary>
      );

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Callback test',
        }),
        expect.any(Object)
      );
    });

    it('should reset error state when retry is clicked', async () => {
      const { rerender } = render(
        <ErrorBoundary enableRetry={true}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();

      // Click retry button
      fireEvent.click(screen.getByText('Try Again'));

      // Rerender with no error
      rerender(
        <ErrorBoundary enableRetry={true}>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByText('No error')).toBeInTheDocument();
      });
    });
  });

  describe('Page Error Boundary', () => {
    it('should render page-level error UI', () => {
      render(
        <PageErrorBoundary context="test_page">
          <ThrowError shouldThrow={true} />
        </PageErrorBoundary>
      );

      expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('Go Home')).toBeInTheDocument();
    });
  });

  describe('Section Error Boundary', () => {
    it('should render section-level error UI', () => {
      render(
        <SectionErrorBoundary context="test_section">
          <ThrowError shouldThrow={true} />
        </SectionErrorBoundary>
      );

      expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();
    });
  });

  describe('Component Error Boundary', () => {
    it('should render minimal fallback UI', () => {
      render(
        <ComponentErrorBoundary context="test_component">
          <ThrowError shouldThrow={true} />
        </ComponentErrorBoundary>
      );

      expect(screen.getByText(/This component encountered an error/)).toBeInTheDocument();
    });
  });

  describe('useErrorBoundary Hook', () => {
    const TestComponent = () => {
      const { captureError, resetError } = useErrorBoundary();

      return (
        <div>
          <button onClick={() => captureError(new Error('Hook test error'))}>
            Trigger Error
          </button>
          <button onClick={resetError}>
            Reset Error
          </button>
        </div>
      );
    };

    it('should trigger error boundary from hook', () => {
      render(
        <ErrorBoundary>
          <TestComponent />
        </ErrorBoundary>
      );

      fireEvent.click(screen.getByText('Trigger Error'));
      
      expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();
    });
  });
});

describe('ApiErrorBoundary', () => {
  const TestApiComponent = () => {
    const { executeAsync } = useApiErrorBoundary();
    const [result, setResult] = React.useState<string>('');

    const handleApiCall = async () => {
      try {
        const data = await executeAsync(async () => {
          const response = await fetch('/api/test');
          if (!response.ok) {
            throw new Error('API call failed');
          }
          return response.json();
        }, {
          endpoint: '/api/test',
          method: 'GET',
        });
        setResult('Success');
      } catch (error) {
        setResult('Error caught');
      }
    };

    return (
      <div>
        <button onClick={handleApiCall}>Make API Call</button>
        <div data-testid="result">{result}</div>
      </div>
    );
  };

  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
  });

  it('should handle successful API calls', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: 'test' }),
    });

    render(
      <ApiErrorBoundary>
        <TestApiComponent />
      </ApiErrorBoundary>
    );

    fireEvent.click(screen.getByText('Make API Call'));

    await waitFor(() => {
      expect(screen.getByTestId('result')).toHaveTextContent('Success');
    });
  });

  it('should handle API errors', async () => {
    (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    render(
      <ApiErrorBoundary>
        <TestApiComponent />
      </ApiErrorBoundary>
    );

    fireEvent.click(screen.getByText('Make API Call'));

    await waitFor(() => {
      expect(screen.getByTestId('result')).toHaveTextContent('Error caught');
    });
  });

  it('should show custom fallback UI for API errors', async () => {
    const customFallback = (error: any, retry: () => void) => (
      <div>
        <div>Custom API Error: {error.userMessage}</div>
        <button onClick={retry}>Custom Retry</button>
      </div>
    );

    (fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'));

    render(
      <ApiErrorBoundary fallback={customFallback}>
        <TestApiComponent />
      </ApiErrorBoundary>
    );

    fireEvent.click(screen.getByText('Make API Call'));

    await waitFor(() => {
      expect(screen.getByText(/Custom API Error/)).toBeInTheDocument();
      expect(screen.getByText('Custom Retry')).toBeInTheDocument();
    });
  });
});

describe('Error Recovery', () => {
  it('should limit retry attempts', () => {
    const { rerender } = render(
      <ErrorBoundary enableRetry={true} maxRetries={2}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // First retry
    fireEvent.click(screen.getByText('Try Again'));
    
    rerender(
      <ErrorBoundary enableRetry={true} maxRetries={2}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // Second retry
    fireEvent.click(screen.getByText('Try Again'));
    
    rerender(
      <ErrorBoundary enableRetry={true} maxRetries={2}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // Should not show retry button after max retries
    expect(screen.queryByText('Try Again')).not.toBeInTheDocument();
  });
});

describe('Error Logging', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
  });

  it('should log errors to API endpoint', async () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} errorMessage="Logging test error" />
      </ErrorBoundary>
    );

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/errors/log', expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.stringContaining('Logging test error'),
      }));
    });
  });
});

describe('Error Message Generation', () => {
  const testCases = [
    {
      error: new Error('Network error occurred'),
      expected: /internet connection/i,
    },
    {
      error: new Error('Request timeout'),
      expected: /taking longer than expected/i,
    },
    {
      error: new Error('Unauthorized access'),
      expected: /permission/i,
    },
    {
      error: new Error('Not found'),
      expected: /could not be found/i,
    },
    {
      error: new Error('Validation failed'),
      expected: /invalid/i,
    },
    {
      error: new Error('Rate limit exceeded'),
      expected: /too many requests/i,
    },
  ];

  testCases.forEach(({ error, expected }) => {
    it(`should generate user-friendly message for: ${error.message}`, () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage={error.message} />
        </ErrorBoundary>
      );

      expect(screen.getByText(expected)).toBeInTheDocument();
    });
  });
});

// Integration tests
describe('Error Boundary Integration', () => {
  it('should work with React Suspense', async () => {
    const SuspenseComponent = () => {
      const [show, setShow] = React.useState(false);
      
      React.useEffect(() => {
        setTimeout(() => setShow(true), 100);
      }, []);

      if (!show) {
        throw new Promise(() => {}); // Suspend
      }

      return <div>Suspense resolved</div>;
    };

    render(
      <React.Suspense fallback={<div>Loading...</div>}>
        <ErrorBoundary>
          <SuspenseComponent />
        </ErrorBoundary>
      </React.Suspense>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Suspense resolved')).toBeInTheDocument();
    });
  });

  it('should handle nested error boundaries correctly', () => {
    render(
      <ErrorBoundary context="outer">
        <div>Outer boundary</div>
        <ErrorBoundary context="inner">
          <ThrowError shouldThrow={true} errorMessage="Inner error" />
        </ErrorBoundary>
      </ErrorBoundary>
    );

    // Inner error boundary should catch the error
    expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Outer boundary')).toBeInTheDocument();
  });
});
