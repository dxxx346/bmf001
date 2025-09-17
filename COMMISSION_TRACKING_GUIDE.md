# Commission Tracking System Documentation

## Overview

This document describes the comprehensive commission tracking system implemented for partners in the Digital Marketplace. The system provides detailed earnings analytics, payout management, transaction tracking, and financial reporting with advanced visualizations and automated processing.

## Architecture

### Components Structure

```
src/
├── app/partner/
│   ├── earnings/page.tsx               # Earnings overview and analytics
│   └── payouts/page.tsx                # Payout history and management
├── components/partner/
│   ├── EarningsChart.tsx               # Earnings visualization with Recharts
│   ├── PayoutRequest.tsx               # Payout request form with validation
│   ├── CommissionTable.tsx             # Detailed transaction table
│   └── index.ts                        # Component exports
└── app/api/partner/
    ├── earnings/route.ts               # Earnings data endpoint
    ├── payouts/
    │   ├── route.ts                    # Payout history endpoint
    │   ├── summary/route.ts            # Payout summary data
    │   └── request/route.ts            # Payout request processing
```

## Core Features

### 1. Earnings Overview (`src/app/partner/earnings/page.tsx`)

**Comprehensive Analytics Dashboard:**
- **Key Performance Metrics**: Total earnings, pending amounts, conversions, average commission
- **Monthly Goal Tracking**: Progress visualization with target amounts and timelines
- **Trend Analysis**: Period-over-period comparisons with percentage changes
- **Performance Insights**: AI-powered optimization recommendations

**Tabbed Interface:**
- **Overview**: Summary metrics and main earnings chart
- **Transactions**: Detailed commission transaction table
- **Top Products**: Best-performing products by commission earnings
- **Insights**: Performance analysis and optimization recommendations

**Advanced Features:**
- **Earnings Forecast**: Projected weekly, monthly, and annual earnings
- **Comparison Analysis**: This month vs. last month performance
- **Export Functionality**: CSV and PDF export of earnings data
- **Real-time Updates**: Manual refresh with loading states

### 2. Payout Management (`src/app/partner/payouts/page.tsx`)

**Payout Dashboard:**
- **Available Balance**: Real-time balance ready for payout
- **Pending Requests**: Current payout requests being processed
- **Payment History**: Complete history of all payout transactions
- **Status Tracking**: Real-time status updates for all requests

**Management Features:**
- **Request Creation**: Integrated payout request form
- **Status Filtering**: Filter by pending, processing, completed, failed
- **Search Functionality**: Find payouts by ID, transaction, or batch
- **Cancellation**: Cancel pending payout requests

**Payment Methods:**
- **PayPal**: Email-based payments with 3% processing fee
- **Bank Transfer**: Direct bank deposits with $5 flat fee
- **Cryptocurrency**: Digital currency payments with 1% fee

### 3. Earnings Visualization (`src/components/partner/EarningsChart.tsx`)

**Chart Types:**
- **Area Charts**: Smooth earnings flow visualization
- **Line Charts**: Precise trend analysis
- **Bar Charts**: Period comparisons
- **Composed Charts**: Multi-metric analysis (earnings + conversions)

**Interactive Features:**
- **Metric Switching**: Toggle between earnings, commissions, conversions
- **Trend/Breakdown Views**: Switch between time series and category breakdown
- **Custom Tooltips**: Detailed data on hover with formatted values
- **Responsive Design**: Mobile-optimized chart rendering

**Analytics Insights:**
- **Performance Summary**: Total earnings, best day, earning streak
- **Trend Detection**: Growth patterns and performance changes
- **Breakdown Analysis**: Earnings by category with pie chart visualization
- **Benchmark Comparisons**: Performance against goals and averages

### 4. Payout Request System (`src/components/partner/PayoutRequest.tsx`)

**Smart Form Validation:**
- **Balance Validation**: Ensure sufficient available balance
- **Minimum Thresholds**: Enforce minimum payout amounts
- **Payment Method Validation**: Validate payment details by method type
- **Real-time Calculation**: Live fee calculation and net amount display

**Payment Method Integration:**
- **Saved Methods**: Store and reuse payment methods
- **Method Verification**: Verify payment details before processing
- **Fee Transparency**: Clear display of processing fees
- **Security**: Secure handling of sensitive payment information

**Advanced Features:**
- **Auto-calculation**: Dynamic fee calculation based on method
- **Form Persistence**: Save form data during completion
- **Error Handling**: Comprehensive validation with helpful error messages
- **Success Flow**: Clear confirmation and next steps

### 5. Commission Transaction Tracking (`src/components/partner/CommissionTable.tsx`)

**Detailed Transaction Management:**
- **Complete Transaction History**: All commission-earning transactions
- **Advanced Filtering**: Search by product, customer, referral code, order ID
- **Sortable Columns**: Sort by date, amount, status, customer
- **Bulk Operations**: Select and export multiple transactions

**Transaction Details:**
- **Expandable Rows**: Detailed view with order information, timeline, commission breakdown
- **Status Tracking**: Pending, confirmed, paid, cancelled states
- **Customer Information**: Customer names and contact details
- **Product Attribution**: Link transactions to specific products and referral codes

**Export and Analysis:**
- **CSV Export**: Export selected or all transactions
- **Pagination**: Efficient handling of large transaction sets
- **Summary Statistics**: Real-time calculation of totals and averages
- **Performance Metrics**: Conversion rates and earning efficiency

## Data Models

### Earnings Data Structure
```typescript
interface EarningsDataPoint {
  date: string;
  earnings: number;
  commissions: number;
  bonuses: number;
  conversions: number;
  average_commission: number;
}

interface EarningsBreakdown {
  source: string;
  amount: number;
  percentage: number;
  color: string;
}
```

### Commission Transaction
```typescript
interface CommissionTransaction {
  id: string;
  order_id: string;
  product_id: string;
  product_title: string;
  product_price: number;
  customer_name: string;
  customer_email: string;
  referral_code: string;
  referral_link_name: string;
  commission_rate: number;
  commission_amount: number;
  order_total: number;
  status: 'pending' | 'confirmed' | 'paid' | 'cancelled';
  created_at: string;
  confirmed_at?: string;
  paid_at?: string;
  payout_batch_id?: string;
}
```

### Payout Record
```typescript
interface PayoutRecord {
  id: string;
  amount: number;
  net_amount: number;
  fee_amount: number;
  payment_method: 'paypal' | 'bank_transfer' | 'crypto';
  payment_details: PaymentDetails;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  created_at: string;
  processed_at?: string;
  completed_at?: string;
  transaction_id?: string;
  failure_reason?: string;
  notes?: string;
  batch_id?: string;
}
```

## API Endpoints

### Earnings Data (`GET /api/partner/earnings`)

**Query Parameters:**
- `start_date` (required): Period start date
- `end_date` (required): Period end date

**Response:**
```typescript
{
  earnings_chart: EarningsDataPoint[];
  earnings_breakdown: EarningsBreakdown[];
  commission_transactions: CommissionTransaction[];
  summary_stats: SummaryStats;
  top_products: TopProduct[];
  monthly_goals: MonthlyGoals;
}
```

### Payout Management

**`GET /api/partner/payouts`** - Retrieve payout history
**`GET /api/partner/payouts/summary`** - Get payout summary and balance
**`POST /api/partner/payouts/request`** - Submit new payout request

## Commission Calculation System

### Commission Structure
```typescript
// Base commission calculation
function calculateCommission(
  orderAmount: number, 
  commissionRate: number, 
  productPrice: number
): number {
  return productPrice * (commissionRate / 100);
}

// Example calculations:
// Product: $100, Commission Rate: 10% = $10 commission
// Product: $50, Commission Rate: 15% = $7.50 commission
```

### Fee Structure
```typescript
function calculateProcessingFee(amount: number, method: string): number {
  switch (method) {
    case 'paypal':
      return amount * 0.03; // 3%
    case 'bank_transfer':
      return Math.min(5, amount * 0.02); // $5 or 2%, whichever is lower
    case 'crypto':
      return amount * 0.01; // 1%
    default:
      return 0;
  }
}
```

### Payout Processing
```typescript
// Payout lifecycle
const payoutStates = {
  pending: 'Request submitted, awaiting review',
  processing: 'Payment being processed by provider',
  completed: 'Payment successfully sent',
  failed: 'Payment failed, funds returned to balance',
  cancelled: 'Request cancelled by user or admin'
};
```

## Financial Tracking Features

### Real-time Balance Management
- **Available Balance**: Earnings minus pending payouts
- **Pending Amount**: Funds in processing payouts
- **Total Paid**: Historical payout amounts
- **Minimum Thresholds**: Configurable minimum payout amounts

### Transaction Attribution
- **Order Tracking**: Link commissions to specific orders
- **Product Attribution**: Track earnings by product
- **Referral Code Tracking**: Monitor link performance
- **Customer Journey**: Complete referral-to-purchase tracking

### Performance Analytics
- **Earnings Trends**: Daily, weekly, monthly earning patterns
- **Conversion Analysis**: Commission per conversion metrics
- **Product Performance**: Top-earning products and categories
- **Goal Tracking**: Monthly and annual earning targets

## Payment Method Integration

### PayPal Integration
```typescript
// PayPal payout processing
const paypalPayout = {
  method: 'paypal',
  details: {
    email: 'partner@example.com',
    currency: 'USD'
  },
  processing_time: '1-2 business days',
  fee_rate: 0.03 // 3%
};
```

### Bank Transfer Integration
```typescript
// Bank transfer details
const bankTransfer = {
  method: 'bank_transfer',
  details: {
    account_holder: 'John Doe',
    bank_name: 'Chase Bank',
    account_number: '****1234',
    routing_number: '123456789',
    swift_code: 'CHASUS33' // For international
  },
  processing_time: '3-5 business days',
  fee: 5 // $5 flat fee
};
```

### Cryptocurrency Integration
```typescript
// Crypto payout details
const cryptoPayout = {
  method: 'crypto',
  details: {
    wallet_address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
    currency: 'bitcoin',
    network: 'mainnet'
  },
  processing_time: 'Within 24 hours',
  fee_rate: 0.01 // 1%
};
```

## Security & Compliance

### Financial Security
- **Balance Validation**: Prevent overdrafts and double-spending
- **Payment Verification**: Validate payment method details
- **Fraud Detection**: Monitor for suspicious payout patterns
- **Audit Trail**: Complete transaction logging and tracking

### Data Protection
- **PCI Compliance**: Secure handling of payment information
- **Encryption**: Encrypt sensitive payment details
- **Access Control**: Partner-only access to financial data
- **Data Retention**: Comply with financial record keeping requirements

### Regulatory Compliance
- **Tax Reporting**: Generate tax documents for earnings
- **AML Compliance**: Anti-money laundering checks
- **KYC Requirements**: Know Your Customer verification
- **International Regulations**: Comply with global payment laws

## Advanced Features

### Automated Processing
- **Batch Processing**: Process multiple payouts efficiently
- **Scheduled Payouts**: Automatic monthly payout processing
- **Retry Logic**: Automatic retry for failed payments
- **Status Updates**: Real-time status notifications

### Analytics and Reporting
- **Performance Dashboards**: Comprehensive earning analytics
- **Trend Analysis**: Historical performance patterns
- **Forecasting**: Predictive earning projections
- **Benchmark Comparisons**: Performance against goals and averages

### Integration Capabilities
- **Webhook Support**: Real-time payment status updates
- **API Access**: Programmatic access to earning data
- **Third-party Integration**: Connect with accounting software
- **Export Formats**: Multiple data export options

## Usage Examples

### Basic Earnings Tracking
```tsx
import { EarningsChart, CommissionTable } from '@/components/partner';

function EarningsTracker() {
  const [earningsData, setEarningsData] = useState([]);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    fetchEarningsData().then(setEarningsData);
    fetchTransactions().then(setTransactions);
  }, []);

  return (
    <div className="space-y-6">
      <EarningsChart
        data={earningsData}
        variant="area"
        showBreakdown={true}
      />
      
      <CommissionTable
        transactions={transactions}
        showFilters={true}
        onExport={handleTransactionExport}
      />
    </div>
  );
}
```

### Payout Request Integration
```tsx
import { PayoutRequest } from '@/components/partner';

function PayoutManagement() {
  const [availableBalance, setAvailableBalance] = useState(0);
  const [pendingRequests, setPendingRequests] = useState([]);

  const handlePayoutRequest = async (request) => {
    try {
      const response = await fetch('/api/partner/payouts/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (response.ok) {
        const newRequest = await response.json();
        setPendingRequests(prev => [...prev, newRequest]);
        setAvailableBalance(prev => prev - request.amount);
        toast.success('Payout request submitted successfully');
      }
    } catch (error) {
      toast.error('Failed to submit payout request');
    }
  };

  return (
    <PayoutRequest
      availableAmount={availableBalance}
      minimumAmount={50}
      onRequestSubmitted={handlePayoutRequest}
      pendingRequests={pendingRequests}
    />
  );
}
```

### Advanced Analytics Dashboard
```tsx
import { 
  EarningsChart, 
  CompactEarningsChart, 
  CommissionTable 
} from '@/components/partner';

function AdvancedEarningsAnalytics() {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [period, setPeriod] = useState('30d');

  const renderAdvancedInsights = () => {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Earnings performance */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Performance Analysis</h3>
          
          <EarningsChart
            data={analyticsData.earnings_chart}
            breakdown={analyticsData.earnings_breakdown}
            variant="composed"
            height={300}
          />
          
          <div className="grid grid-cols-2 gap-4">
            <CompactEarningsChart
              data={analyticsData.earnings_chart}
              title="Daily Average"
              height={100}
            />
            <CompactEarningsChart
              data={analyticsData.weekly_data}
              title="Weekly Trend"
              height={100}
            />
          </div>
        </div>

        {/* Commission insights */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Commission Insights</h3>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <h4 className="font-medium mb-3">Top Earning Categories</h4>
            {analyticsData.earnings_breakdown.map((category, index) => (
              <div key={category.source} className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  <span className="text-sm">{category.source}</span>
                </div>
                <div className="text-sm font-medium">
                  {formatCurrency(category.amount)}
                </div>
              </div>
            ))}
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <h4 className="font-medium mb-3">Optimization Opportunities</h4>
            <div className="space-y-2 text-sm text-gray-600">
              {analyticsData.optimization_tips.map((tip, index) => (
                <div key={index} className="flex items-start space-x-2">
                  <span className="text-blue-600">•</span>
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Advanced Analytics</h2>
        <select value={period} onChange={(e) => setPeriod(e.target.value)}>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
        </select>
      </div>

      {analyticsData && renderAdvancedInsights()}
    </div>
  );
}
```

## Performance Optimization

### Frontend Optimization
- **Chart Memoization**: Memoize expensive chart calculations
- **Virtual Scrolling**: Handle large transaction tables efficiently
- **Lazy Loading**: Load components and data on demand
- **Progressive Enhancement**: Core functionality on all devices

### Backend Optimization
- **Database Indexing**: Optimize queries for earnings and transaction data
- **Caching Strategy**: Cache frequently accessed earnings data
- **Batch Processing**: Efficient payout processing in batches
- **Query Optimization**: Minimize database calls with efficient joins

### Financial Processing
- **Batch Payments**: Process multiple payouts simultaneously
- **Retry Mechanisms**: Automatic retry for failed payments
- **Rate Limiting**: Prevent abuse of payout requests
- **Fraud Detection**: Monitor for suspicious patterns

## Security Measures

### Financial Security
- **Balance Validation**: Prevent negative balances and overdrafts
- **Double-spend Prevention**: Ensure funds can't be paid out twice
- **Payment Verification**: Validate all payment method details
- **Audit Logging**: Complete financial transaction logging

### Data Protection
- **Encryption**: Encrypt sensitive financial data
- **Access Control**: Strict partner-only access to earnings
- **PCI Compliance**: Secure payment information handling
- **Data Anonymization**: Protect customer information in analytics

### Compliance
- **Tax Reporting**: Generate required tax documents
- **Regulatory Compliance**: Meet financial service regulations
- **International Laws**: Comply with global payment regulations
- **Record Keeping**: Maintain required financial records

## Mobile Optimization

### Mobile Features
- **Touch-Friendly Charts**: Optimized chart interactions for mobile
- **Responsive Tables**: Mobile-optimized transaction tables
- **Simplified Forms**: Streamlined payout request forms
- **Gesture Support**: Pinch-to-zoom and pan for charts

### Performance on Mobile
- **Optimized Bundle**: Reduced JavaScript for mobile
- **Progressive Loading**: Load critical content first
- **Offline Support**: Cache recent earnings data
- **Fast Rendering**: Optimized chart rendering performance

## Integration Examples

### Earnings Widget Integration
```tsx
// Add earnings widget to main dashboard
function DashboardWithEarnings() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div className="lg:col-span-3">
        {/* Main dashboard content */}
      </div>
      
      <div className="space-y-4">
        <CompactEarningsChart
          data={earningsData}
          title="This Month"
          height={120}
        />
        
        <CompactCommissionTable
          transactions={recentTransactions}
          maxRows={5}
        />
      </div>
    </div>
  );
}
```

### Custom Export Integration
```tsx
// Custom export functionality
function CustomEarningsExport() {
  const handleAdvancedExport = async (options) => {
    const exportData = {
      period: options.period,
      format: options.format,
      include_transactions: options.includeTransactions,
      include_analytics: options.includeAnalytics,
    };

    const response = await fetch('/api/partner/earnings/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(exportData),
    });

    const blob = await response.blob();
    downloadFile(blob, `earnings-report.${options.format}`);
  };

  return (
    <div>
      <h3>Custom Export Options</h3>
      <form onSubmit={handleAdvancedExport}>
        <div className="space-y-4">
          <select name="format">
            <option value="csv">CSV</option>
            <option value="xlsx">Excel</option>
            <option value="pdf">PDF Report</option>
          </select>
          
          <div className="space-y-2">
            <label>
              <input type="checkbox" name="includeTransactions" />
              Include transaction details
            </label>
            <label>
              <input type="checkbox" name="includeAnalytics" />
              Include analytics charts
            </label>
          </div>
          
          <button type="submit">Generate Report</button>
        </div>
      </form>
    </div>
  );
}
```

## Troubleshooting

### Common Issues
1. **Payout Request Failures**
   - Check available balance vs. requested amount
   - Verify payment method details
   - Ensure no pending requests exist
   - Check minimum payout threshold

2. **Missing Transactions**
   - Verify date range selection
   - Check transaction status filters
   - Review referral code attribution
   - Monitor for processing delays

3. **Chart Display Issues**
   - Check data format and structure
   - Verify Recharts installation
   - Monitor browser console for errors
   - Test with different data sets

### Debug Tools
- **Browser DevTools**: Network and performance monitoring
- **Database Logs**: Transaction and payout logging
- **Payment Provider Logs**: External payment processing logs
- **Analytics Validation**: Cross-check calculations with raw data

## Future Enhancements

### Planned Features
1. **Advanced Analytics**
   - Predictive earning forecasts
   - Machine learning insights
   - Automated optimization recommendations
   - Real-time performance alerts

2. **Payment Enhancements**
   - Additional payment methods
   - Instant payout options
   - Multi-currency support
   - Automated tax document generation

3. **Integration Improvements**
   - Accounting software integration
   - Tax preparation tool connections
   - Bank account verification
   - Real-time payment notifications

## Conclusion

The Commission Tracking System provides partners with comprehensive tools to monitor earnings, manage payouts, and optimize their referral performance. With detailed analytics, secure payment processing, and professional-grade financial management features, partners can focus on growing their referral business while the system handles the complex financial tracking and processing requirements.

The system is designed to scale from individual partners to large affiliate networks while maintaining accuracy, security, and compliance with financial regulations and industry best practices.
