'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import SwaggerUI to avoid SSR issues
const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false });

export default function SwaggerPage() {
  const [swaggerDoc, setSwaggerDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSwaggerDoc = async () => {
      try {
        const response = await fetch('/api/docs');
        if (!response.ok) {
          throw new Error('Failed to fetch API documentation');
        }
        const doc = await response.json();
        setSwaggerDoc(doc);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchSwaggerDoc();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading API documentation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Documentation</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!swaggerDoc) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-400 text-6xl mb-4">📄</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">No Documentation Available</h1>
          <p className="text-gray-600">API documentation could not be loaded.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-gray-800 text-white py-4 px-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold">Digital Marketplace API Documentation</h1>
          <p className="text-gray-300 mt-1">
            RESTful API for digital products marketplace with authentication, payments, and file delivery
          </p>
        </div>
      </div>
      <div className="max-w-7xl mx-auto">
        <SwaggerUI
          spec={swaggerDoc}
          docExpansion="list"
          defaultModelsExpandDepth={2}
          defaultModelExpandDepth={2}
          displayRequestDuration={true}
          tryItOutEnabled={true}
          supportedSubmitMethods={['get', 'post', 'put', 'delete', 'patch']}
          onComplete={() => {
            // Custom styling for better integration
            const style = document.createElement('style');
            style.textContent = `
              .swagger-ui .topbar { display: none; }
              .swagger-ui .info { margin: 20px 0; }
              .swagger-ui .info .title { color: #1f2937; }
              .swagger-ui .scheme-container { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; }
              .swagger-ui .btn.authorize { background-color: #3b82f6; border-color: #3b82f6; }
              .swagger-ui .btn.authorize:hover { background-color: #2563eb; border-color: #2563eb; }
              .swagger-ui .opblock.opblock-post { border-color: #10b981; }
              .swagger-ui .opblock.opblock-post .opblock-summary { border-color: #10b981; }
              .swagger-ui .opblock.opblock-get { border-color: #3b82f6; }
              .swagger-ui .opblock.opblock-get .opblock-summary { border-color: #3b82f6; }
              .swagger-ui .opblock.opblock-put { border-color: #f59e0b; }
              .swagger-ui .opblock.opblock-put .opblock-summary { border-color: #f59e0b; }
              .swagger-ui .opblock.opblock-delete { border-color: #ef4444; }
              .swagger-ui .opblock.opblock-delete .opblock-summary { border-color: #ef4444; }
            `;
            document.head.appendChild(style);
          }}
        />
      </div>
    </div>
  );
}
