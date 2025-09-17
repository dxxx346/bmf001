# Product Management Integration Examples

## Quick Integration Guide

### 1. Basic Product Management Integration

Add product management to existing seller dashboard:

```tsx
// In src/app/seller/layout.tsx
import { ProductForm, FileUpload } from '@/components/seller';

function SellerLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex space-x-8">
            <Link href="/seller/dashboard">Dashboard</Link>
            <Link href="/seller/products">Products</Link>
            <Link href="/seller/shops">Shops</Link>
            <Link href="/seller/analytics">Analytics</Link>
          </div>
        </div>
      </nav>
      {children}
    </div>
  );
}
```

### 2. Custom Product Creation Wizard

```tsx
// Multi-step product creation with validation
import { useState } from 'react';
import { ProductForm } from '@/components/seller/ProductForm';

function ProductCreationWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [productData, setProductData] = useState({});

  const steps = [
    { id: 1, title: 'Basic Info', fields: ['title', 'description', 'category'] },
    { id: 2, title: 'Pricing', fields: ['price', 'sale_price', 'currency'] },
    { id: 3, title: 'Files', fields: ['files', 'images'] },
    { id: 4, title: 'SEO', fields: ['meta_title', 'meta_description', 'keywords'] },
    { id: 5, title: 'Review', fields: [] },
  ];

  const handleStepComplete = (stepData) => {
    setProductData(prev => ({ ...prev, ...stepData }));
    
    if (currentStep < steps.length) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Final submission
      createProduct({ ...productData, ...stepData });
    }
  };

  const isStepValid = (stepIndex) => {
    const step = steps[stepIndex - 1];
    return step.fields.every(field => productData[field]);
  };

  return (
    <div>
      {/* Step indicator */}
      <div className="mb-8">
        <div className="flex justify-center">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`flex items-center ${index < steps.length - 1 ? 'mr-8' : ''}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep >= step.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {step.id}
              </div>
              <span className="ml-2 text-sm text-gray-600">{step.title}</span>
              {index < steps.length - 1 && (
                <div className="w-16 h-0.5 bg-gray-300 ml-4" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Current step content */}
      <ProductForm
        mode="create"
        onSubmit={handleStepComplete}
        initialData={productData}
        showOnlyFields={steps[currentStep - 1].fields}
      />
    </div>
  );
}
```

### 3. Advanced File Upload with Processing

```tsx
// Enhanced file upload with processing and validation
import { FileUpload } from '@/components/seller/FileUpload';

function AdvancedProductFileUpload() {
  const [files, setFiles] = useState([]);
  const [processingStatus, setProcessingStatus] = useState({});

  const handleFileUpload = async (uploadFiles) => {
    const results = [];
    
    for (const file of uploadFiles) {
      try {
        setProcessingStatus(prev => ({
          ...prev,
          [file.name]: 'processing'
        }));

        // Custom processing based on file type
        let processedFile = file;
        
        if (file.type.startsWith('image/')) {
          processedFile = await optimizeImage(file);
        } else if (file.type === 'application/zip') {
          await validateArchive(file);
        }

        // Upload to storage
        const formData = new FormData();
        formData.append('file', processedFile);
        formData.append('type', 'product');

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const { url } = await response.json();
        results.push(url);

        setProcessingStatus(prev => ({
          ...prev,
          [file.name]: 'completed'
        }));
      } catch (error) {
        setProcessingStatus(prev => ({
          ...prev,
          [file.name]: 'error'
        }));
        throw error;
      }
    }
    
    return results;
  };

  const optimizeImage = async (file) => {
    // Image optimization logic
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    return new Promise((resolve) => {
      img.onload = () => {
        // Resize and compress image
        canvas.width = Math.min(img.width, 1200);
        canvas.height = (canvas.width / img.width) * img.height;
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob((blob) => {
          resolve(new File([blob], file.name, { type: 'image/jpeg' }));
        }, 'image/jpeg', 0.8);
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  return (
    <div>
      <FileUpload
        multiple={true}
        maxFiles={10}
        onFilesChange={setFiles}
        onUpload={handleFileUpload}
        allowedTypes={['image', 'application', 'text']}
      />
      
      {/* Processing status */}
      {Object.keys(processingStatus).length > 0 && (
        <div className="mt-4 space-y-2">
          {Object.entries(processingStatus).map(([fileName, status]) => (
            <div key={fileName} className="flex items-center justify-between">
              <span className="text-sm">{fileName}</span>
              <span className={`text-xs px-2 py-1 rounded ${
                status === 'completed' ? 'bg-green-100 text-green-800' :
                status === 'error' ? 'bg-red-100 text-red-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                {status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### 4. Product Analytics Dashboard

```tsx
// Detailed product analytics with charts
import { useState, useEffect } from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { StatsCard } from '@/components/seller/StatsCard';

function ProductAnalyticsDashboard({ productId }) {
  const [analytics, setAnalytics] = useState(null);
  const [period, setPeriod] = useState('30d');

  useEffect(() => {
    fetchProductAnalytics(productId, period).then(setAnalytics);
  }, [productId, period]);

  const salesChartData = {
    labels: analytics?.salesByDay?.map(d => d.date) || [],
    datasets: [
      {
        label: 'Sales',
        data: analytics?.salesByDay?.map(d => d.sales) || [],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
      }
    ]
  };

  const conversionFunnelData = {
    labels: ['Views', 'Add to Cart', 'Purchases'],
    datasets: [{
      data: [
        analytics?.totalViews || 0,
        analytics?.addToCartCount || 0,
        analytics?.totalSales || 0
      ],
      backgroundColor: ['#3B82F6', '#10B981', '#F59E0B'],
    }]
  };

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex justify-between items-center">
        <h2>Product Analytics</h2>
        <select value={period} onChange={(e) => setPeriod(e.target.value)}>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
        </select>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard
          stat={{
            label: 'Total Views',
            value: analytics?.totalViews || 0,
            change: { value: analytics?.viewsChange || 0, period: 'vs last period', type: 'increase' },
            icon: 'eye',
            color: 'blue'
          }}
        />
        <StatsCard
          stat={{
            label: 'Conversion Rate',
            value: analytics?.conversionRate || 0,
            format: 'percentage',
            icon: 'trending-up',
            color: 'green'
          }}
        />
        {/* More stats cards */}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3>Sales Trend</h3>
          <Line data={salesChartData} />
        </div>
        <div>
          <h3>Conversion Funnel</h3>
          <Doughnut data={conversionFunnelData} />
        </div>
      </div>
    </div>
  );
}
```

### 5. Bulk Product Operations

```tsx
// Bulk operations for product management
function BulkProductManager() {
  const [selectedProducts, setSelectedProducts] = useState(new Set());
  const [bulkAction, setBulkAction] = useState('');

  const handleBulkOperation = async () => {
    if (selectedProducts.size === 0) {
      toast.error('No products selected');
      return;
    }

    const productIds = Array.from(selectedProducts);
    
    try {
      const response = await fetch('/api/seller/products/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation_type: bulkAction,
          product_ids: productIds,
          parameters: getBulkActionParameters(bulkAction),
        }),
      });

      if (response.ok) {
        toast.success(`${bulkAction} completed for ${productIds.length} products`);
        setSelectedProducts(new Set());
        refreshProductList();
      }
    } catch (error) {
      toast.error(`Failed to ${bulkAction} products`);
    }
  };

  const getBulkActionParameters = (action) => {
    switch (action) {
      case 'update_price':
        return { price_multiplier: 1.1 }; // 10% increase
      case 'update_category':
        return { category_id: selectedCategoryId };
      case 'update_status':
        return { status: 'active' };
      default:
        return {};
    }
  };

  return (
    <div>
      {selectedProducts.size > 0 && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <span>{selectedProducts.size} products selected</span>
            <div className="flex space-x-2">
              <select
                value={bulkAction}
                onChange={(e) => setBulkAction(e.target.value)}
              >
                <option value="">Select action</option>
                <option value="activate">Activate</option>
                <option value="deactivate">Deactivate</option>
                <option value="update_price">Update Prices</option>
                <option value="update_category">Change Category</option>
                <option value="delete">Delete</option>
              </select>
              <Button
                onClick={handleBulkOperation}
                disabled={!bulkAction}
                size="sm"
              >
                Apply
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

### 6. Product Import/Export

```tsx
// Import/export functionality for products
function ProductImportExport() {
  const [importData, setImportData] = useState([]);
  const [exportFormat, setExportFormat] = useState('csv');

  const handleImport = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('format', file.name.split('.').pop());

    const response = await fetch('/api/seller/products/import', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();
    
    if (response.ok) {
      setImportData(result.preview);
      toast.success(`${result.count} products ready to import`);
    } else {
      toast.error(result.error);
    }
  };

  const handleExport = async () => {
    const response = await fetch(`/api/seller/products/export?format=${exportFormat}`);
    const blob = await response.blob();
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `products-${new Date().toISOString().split('T')[0]}.${exportFormat}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Export */}
      <div>
        <h3>Export Products</h3>
        <div className="flex items-center space-x-2">
          <select value={exportFormat} onChange={(e) => setExportFormat(e.target.value)}>
            <option value="csv">CSV</option>
            <option value="xlsx">Excel</option>
            <option value="json">JSON</option>
          </select>
          <Button onClick={handleExport}>Export</Button>
        </div>
      </div>

      {/* Import */}
      <div>
        <h3>Import Products</h3>
        <FileUpload
          accept=".csv,.xlsx,.json"
          multiple={false}
          onFilesChange={(files) => {
            if (files.length > 0) {
              handleImport(files[0].file);
            }
          }}
          variant="compact"
        />
        
        {importData.length > 0 && (
          <div className="mt-4">
            <h4>Import Preview</h4>
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Price</th>
                    <th>Category</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {importData.map((product, index) => (
                    <tr key={index}>
                      <td>{product.title}</td>
                      <td>${product.price}</td>
                      <td>{product.category}</td>
                      <td>
                        <span className={`px-2 py-1 rounded text-xs ${
                          product.valid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {product.valid ? 'Valid' : 'Invalid'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button onClick={confirmImport} className="mt-4">
              Import {importData.filter(p => p.valid).length} Products
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
```

### 7. Product Performance Monitoring

```tsx
// Real-time product performance monitoring
function ProductPerformanceMonitor() {
  const [products, setProducts] = useState([]);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    // Set up real-time monitoring
    const interval = setInterval(checkProductPerformance, 60000); // Every minute
    
    return () => clearInterval(interval);
  }, []);

  const checkProductPerformance = async () => {
    const response = await fetch('/api/seller/products/performance');
    const data = await response.json();
    
    const newAlerts = [];
    
    data.products.forEach(product => {
      // Check for performance issues
      if (product.stats.view_count > 100 && product.stats.purchase_count === 0) {
        newAlerts.push({
          type: 'low_conversion',
          product: product,
          message: `${product.title} has high views but no sales`
        });
      }
      
      if (product.stats.average_rating < 3.0 && product.stats.review_count > 5) {
        newAlerts.push({
          type: 'low_rating',
          product: product,
          message: `${product.title} has a low average rating`
        });
      }
    });
    
    setAlerts(newAlerts);
  };

  return (
    <div>
      {alerts.length > 0 && (
        <div className="mb-6 space-y-2">
          <h3>Performance Alerts</h3>
          {alerts.map((alert, index) => (
            <div key={index} className={`p-3 rounded-lg ${
              alert.type === 'low_conversion' ? 'bg-yellow-50 border-yellow-200' :
              alert.type === 'low_rating' ? 'bg-red-50 border-red-200' :
              'bg-blue-50 border-blue-200'
            }`}>
              <p className="text-sm">{alert.message}</p>
              <Button
                size="sm"
                onClick={() => router.push(`/seller/products/${alert.product.id}/edit`)}
                className="mt-2"
              >
                Optimize Product
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### 8. Product Template System

```tsx
// Product templates for quick creation
function ProductTemplateSelector() {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const productTemplates = [
    {
      id: 'digital-art',
      name: 'Digital Art',
      description: 'Template for digital artwork and illustrations',
      defaultData: {
        category_id: 1, // Digital Art category
        is_digital: true,
        is_downloadable: true,
        download_limit: 5,
        download_expiry_days: 30,
        tags: ['digital art', 'illustration', 'graphic design'],
      }
    },
    {
      id: 'software',
      name: 'Software/Scripts',
      description: 'Template for software applications and scripts',
      defaultData: {
        category_id: 3, // Software category
        is_digital: true,
        is_downloadable: true,
        download_limit: 3,
        download_expiry_days: 365,
        tags: ['software', 'application', 'tool'],
      }
    },
    // More templates...
  ];

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    // Pre-fill form with template data
    router.push(`/seller/products/create?template=${template.id}`);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {productTemplates.map(template => (
        <div
          key={template.id}
          onClick={() => handleTemplateSelect(template)}
          className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-colors"
        >
          <h4 className="font-medium text-gray-900">{template.name}</h4>
          <p className="text-sm text-gray-600 mt-1">{template.description}</p>
          <div className="mt-3 flex flex-wrap gap-1">
            {template.defaultData.tags.map(tag => (
              <span key={tag} className="text-xs bg-gray-100 px-2 py-1 rounded">
                {tag}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

### 9. Product Collaboration Features

```tsx
// Team collaboration for product management
function ProductCollaboration({ productId }) {
  const [collaborators, setCollaborators] = useState([]);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');

  const addCollaborator = async (email) => {
    const response = await fetch(`/api/seller/products/${productId}/collaborators`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role: 'editor' }),
    });

    if (response.ok) {
      const { collaborator } = await response.json();
      setCollaborators(prev => [...prev, collaborator]);
      toast.success('Collaborator added successfully');
    }
  };

  const addComment = async () => {
    if (!newComment.trim()) return;

    const response = await fetch(`/api/seller/products/${productId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: newComment }),
    });

    if (response.ok) {
      const { comment } = await response.json();
      setComments(prev => [...prev, comment]);
      setNewComment('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Collaborators */}
      <div>
        <h4>Team Members</h4>
        <div className="space-y-2">
          {collaborators.map(collab => (
            <div key={collab.id} className="flex items-center justify-between">
              <div>
                <span className="font-medium">{collab.name}</span>
                <span className="text-sm text-gray-500 ml-2">{collab.email}</span>
              </div>
              <span className="text-xs bg-gray-100 px-2 py-1 rounded">{collab.role}</span>
            </div>
          ))}
        </div>
        
        <div className="mt-3 flex space-x-2">
          <input
            type="email"
            placeholder="Add team member email"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                addCollaborator(e.target.value);
                e.target.value = '';
              }
            }}
          />
          <Button size="sm">Add</Button>
        </div>
      </div>

      {/* Comments */}
      <div>
        <h4>Comments</h4>
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {comments.map(comment => (
            <div key={comment.id} className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm">{comment.author.name}</span>
                <span className="text-xs text-gray-500">
                  {new Date(comment.created_at).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm text-gray-700">{comment.content}</p>
            </div>
          ))}
        </div>
        
        <div className="mt-3 flex space-x-2">
          <input
            type="text"
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                addComment();
              }
            }}
          />
          <Button onClick={addComment} size="sm">Comment</Button>
        </div>
      </div>
    </div>
  );
}
```

This integration guide provides practical examples for implementing and extending the seller product management system with advanced features while maintaining the security and performance standards of the base system.
