'use client';

import { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Building2, 
  Bitcoin, 
  Shield, 
  ArrowLeft, 
  ChevronRight,
  Check,
  Globe,
  Banknote
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { BillingAddress } from '@/types/payment';
import { cn } from '@/lib/utils';

interface PaymentMethodOption {
  id: string;
  provider: 'stripe' | 'yookassa' | 'coingate';
  type: 'card' | 'bank_transfer' | 'crypto';
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  fees?: string;
  processingTime?: string;
  currencies: string[];
  countries: string[];
  popular?: boolean;
  recommended?: boolean;
}

interface PaymentMethodProps {
  amount: number;
  currency: string;
  billingAddress?: BillingAddress;
  onSelect: (method: { provider: 'stripe' | 'yookassa' | 'coingate'; type: 'card' | 'bank_transfer' | 'crypto'; details?: any }) => void;
  onBack: () => void;
  isLoading?: boolean;
  className?: string;
}

const PAYMENT_METHODS: PaymentMethodOption[] = [
  {
    id: 'stripe-card',
    provider: 'stripe',
    type: 'card',
    name: 'Credit/Debit Card',
    description: 'Pay securely with Visa, Mastercard, American Express',
    icon: CreditCard,
    fees: 'No additional fees',
    processingTime: 'Instant',
    currencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD'],
    countries: ['US', 'CA', 'GB', 'DE', 'FR', 'IT', 'ES', 'AU', 'JP'],
    popular: true,
    recommended: true,
  },
  {
    id: 'yookassa-card',
    provider: 'yookassa',
    type: 'card',
    name: 'YooKassa (Card)',
    description: 'Pay with Russian cards (Visa, Mastercard, МИР)',
    icon: CreditCard,
    fees: 'No additional fees',
    processingTime: 'Instant',
    currencies: ['RUB', 'USD', 'EUR'],
    countries: ['RU', 'BY', 'KZ'],
    popular: true,
  },
  {
    id: 'yookassa-sbp',
    provider: 'yookassa',
    type: 'bank_transfer',
    name: 'YooKassa (SBP)',
    description: 'Система быстрых платежей - instant bank transfer',
    icon: Building2,
    fees: 'No additional fees',
    processingTime: 'Instant',
    currencies: ['RUB'],
    countries: ['RU'],
  },
  {
    id: 'coingate-btc',
    provider: 'coingate',
    type: 'crypto',
    name: 'Bitcoin',
    description: 'Pay with Bitcoin (BTC)',
    icon: Bitcoin,
    fees: 'Network fees apply',
    processingTime: '10-60 minutes',
    currencies: ['BTC', 'USD', 'EUR'],
    countries: ['*'], // Available globally
  },
  {
    id: 'coingate-eth',
    provider: 'coingate',
    type: 'crypto',
    name: 'Ethereum',
    description: 'Pay with Ethereum (ETH)',
    icon: Bitcoin,
    fees: 'Network fees apply',
    processingTime: '5-30 minutes',
    currencies: ['ETH', 'USD', 'EUR'],
    countries: ['*'], // Available globally
  },
  {
    id: 'coingate-usdt',
    provider: 'coingate',
    type: 'crypto',
    name: 'USDT (Tether)',
    description: 'Pay with USDT stablecoin',
    icon: Bitcoin,
    fees: 'Network fees apply',
    processingTime: '5-30 minutes',
    currencies: ['USDT', 'USD'],
    countries: ['*'], // Available globally
  },
];

export function PaymentMethod({
  amount,
  currency,
  billingAddress,
  onSelect,
  onBack,
  isLoading = false,
  className,
}: PaymentMethodProps) {
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [availableMethods, setAvailableMethods] = useState<PaymentMethodOption[]>([]);

  // Filter payment methods based on user's country and currency
  useEffect(() => {
    const userCountry = billingAddress?.country || 'US';
    const userCurrency = currency.toUpperCase();

    const filtered = PAYMENT_METHODS.filter(method => {
      // Check if method supports user's country
      const supportsCountry = method.countries.includes('*') || method.countries.includes(userCountry);
      
      // Check if method supports user's currency
      const supportsCurrency = method.currencies.some(curr => 
        curr === userCurrency || curr === 'USD' // USD as fallback
      );

      return supportsCountry && supportsCurrency;
    });

    // Sort by popularity and recommendation
    const sorted = filtered.sort((a, b) => {
      if (a.recommended && !b.recommended) return -1;
      if (!a.recommended && b.recommended) return 1;
      if (a.popular && !b.popular) return -1;
      if (!a.popular && b.popular) return 1;
      return 0;
    });

    setAvailableMethods(sorted);

    // Auto-select the first recommended method
    const recommended = sorted.find(m => m.recommended);
    if (recommended && !selectedMethod) {
      setSelectedMethod(recommended.id);
    }
  }, [billingAddress?.country, currency, selectedMethod]);

  const handleMethodSelect = (methodId: string) => {
    setSelectedMethod(methodId);
  };

  const handleContinue = () => {
    const method = availableMethods.find(m => m.id === selectedMethod);
    if (method) {
      onSelect({
        provider: method.provider,
        type: method.type,
        details: {
          methodId: method.id,
          name: method.name,
        },
      });
    }
  };

  const getMethodIcon = (method: PaymentMethodOption) => {
    const IconComponent = method.icon;
    return <IconComponent className="h-6 w-6" />;
  };

  const isRussianUser = billingAddress?.country === 'RU';
  const showYooKassaPromo = isRussianUser;

  return (
    <div className={cn('space-y-6', className)}>
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Choose Payment Method
        </h2>
        <p className="text-sm text-gray-600">
          Select your preferred payment method to complete the purchase
        </p>
      </div>

      {/* Payment Amount Summary */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">
                Total Amount
              </span>
            </div>
            <span className="text-lg font-bold text-blue-900">
              {currency.toUpperCase()} {amount.toFixed(2)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* YooKassa Promotion for Russian users */}
      {showYooKassaPromo && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <Globe className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-green-900">
                  Рекомендуется для пользователей из России
                </h4>
                <p className="text-sm text-green-700 mt-1">
                  YooKassa поддерживает российские карты и СБП для быстрых платежей
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Methods */}
      <div className="space-y-4">
        <RadioGroup value={selectedMethod} onValueChange={handleMethodSelect}>
          {availableMethods.map((method) => (
            <div key={method.id}>
              <Label
                htmlFor={method.id}
                className={cn(
                  'flex items-start space-x-4 p-4 border border-gray-200 rounded-lg cursor-pointer transition-all hover:border-blue-300 hover:bg-blue-50',
                  selectedMethod === method.id && 'border-blue-500 bg-blue-50 ring-2 ring-blue-100'
                )}
              >
                <RadioGroupItem value={method.id} id={method.id} className="mt-1" />
                
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={cn(
                        'p-2 rounded-lg',
                        selectedMethod === method.id ? 'bg-blue-100' : 'bg-gray-100'
                      )}>
                        {getMethodIcon(method)}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium text-gray-900">
                            {method.name}
                          </h3>
                          {method.recommended && (
                            <Badge variant="secondary" className="text-blue-600 bg-blue-100">
                              Recommended
                            </Badge>
                          )}
                          {method.popular && !method.recommended && (
                            <Badge variant="outline">
                              Popular
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {method.description}
                        </p>
                      </div>
                    </div>
                    
                    {selectedMethod === method.id && (
                      <Check className="h-5 w-5 text-blue-600" />
                    )}
                  </div>

                  {/* Method Details */}
                  <div className="mt-3 grid grid-cols-2 gap-4 text-xs text-gray-600">
                    <div>
                      <span className="font-medium">Fees: </span>
                      <span>{method.fees}</span>
                    </div>
                    <div>
                      <span className="font-medium">Processing: </span>
                      <span>{method.processingTime}</span>
                    </div>
                  </div>

                  {/* Currency Support */}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {method.currencies.slice(0, 4).map((curr) => (
                      <Badge key={curr} variant="outline" size="sm" className="text-xs">
                        {curr}
                      </Badge>
                    ))}
                    {method.currencies.length > 4 && (
                      <Badge variant="outline" size="sm" className="text-xs">
                        +{method.currencies.length - 4} more
                      </Badge>
                    )}
                  </div>
                </div>
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Selected Method Details */}
      {selectedMethod && (
        <Card className="bg-gray-50">
          <CardContent className="p-4">
            <h4 className="font-medium text-gray-900 mb-2">Payment Details</h4>
            {(() => {
              const method = availableMethods.find(m => m.id === selectedMethod);
              if (!method) return null;

              if (method.provider === 'stripe') {
                return (
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>• You'll be redirected to Stripe's secure checkout</p>
                    <p>• Supports all major credit and debit cards</p>
                    <p>• Payment is processed instantly</p>
                    <p>• Your card information is never stored on our servers</p>
                  </div>
                );
              }

              if (method.provider === 'yookassa') {
                return (
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>• Поддерживает российские карты (Visa, Mastercard, МИР)</p>
                    <p>• Система быстрых платежей (СБП) для мгновенных переводов</p>
                    <p>• Безопасная обработка платежей</p>
                    <p>• Соответствует требованиям ЦБ РФ</p>
                  </div>
                );
              }

              if (method.provider === 'coingate') {
                return (
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>• You'll be redirected to CoinGate's secure payment page</p>
                    <p>• Supports 70+ cryptocurrencies</p>
                    <p>• Payment confirmation may take up to 60 minutes</p>
                    <p>• Network fees are automatically calculated</p>
                  </div>
                );
              }

              return null;
            })()}
          </CardContent>
        </Card>
      )}

      {/* Security Information */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <Shield className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-gray-900">
                Secure Payment Processing
              </h4>
              <div className="text-sm text-gray-600 mt-1 space-y-1">
                <p>• All payments are processed through encrypted connections</p>
                <p>• We never store your payment information</p>
                <p>• PCI DSS compliant payment processing</p>
                <p>• 30-day money-back guarantee</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Form Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-6 border-t border-gray-200">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={isLoading}
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Shipping</span>
        </Button>

        <Button
          onClick={handleContinue}
          disabled={!selectedMethod || isLoading}
          className="flex items-center space-x-2"
        >
          {isLoading ? (
            <div className="h-4 w-4 animate-spin border-2 border-current border-t-transparent rounded-full" />
          ) : (
            <>
              <span>Continue to Review</span>
              <ChevronRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
