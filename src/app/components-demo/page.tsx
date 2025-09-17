'use client'

import React from 'react'
import ComponentShowcase from '@/components/examples/ComponentShowcase'

export default function ComponentsDemoPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Component Library Demo</h1>
              <p className="text-gray-600 mt-1">
                Interactive showcase of all UI components
              </p>
            </div>
            <div className="text-sm text-gray-500">
              Digital Marketplace Design System v1.0
            </div>
          </div>
        </div>
      </div>
      
      <ComponentShowcase />
    </div>
  )
}
