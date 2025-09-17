'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  DollarSign, 
  CreditCard, 
  Building, 
  Bitcoin,
  AlertCircle,
  CheckCircle,
  Clock,
  Send,
  Eye,
  Calculator
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

// Validation schema
const payoutRequestSchema = z.object({
  amount: z.number().min(50, 'Minimum payout amount is $50').max(10000, 'Maximum payout amount is $10,000'),
  payment_method: z.enum(['paypal', 'bank_transfer', 'crypto']),
  payment_details: z.object({
    // PayPal
    paypal_email: z.string().email().optional(),
    
    // Bank Transfer
    account_holder: z.string().optional(),
    bank_name: z.string().optional(),
    account_number: z.string().optional(),
    routing_number: z.string().optional(),
    swift_code: z.string().optional(),
    
    // Crypto
    wallet_address: z.string().optional(),
    crypto_currency: z.string().optional(),
  }),
  notes: z.string().max(500, 'Notes must be less than 500 characters').optional(),
});

type PayoutRequestFormData = z.infer<typeof payoutRequestSchema>;

interface PayoutRequestProps {
  availableAmount: number;
  minimumAmount?: number;
  onRequestSubmitted?: (request: PayoutRequest) => void;
  className?: string;
  pendingRequests?: PayoutRequest[];
}

interface PayoutRequest {
  id: string;
  amount: number;
  payment_method: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  processed_at?: string;
  notes?: string;
}

interface PaymentMethodDetails {
  id: string;
  type: 'paypal' | 'bank_transfer' | 'crypto';
  label: string;
  details: Record<string, string>;
  is_default: boolean;
  is_verified: boolean;
}

export function PayoutRequest({
  availableAmount,
  minimumAmount = 50,
  onRequestSubmitted,
  className,
  pendingRequests = [],
}: PayoutRequestProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedPaymentMethods, setSavedPaymentMethods] = useState<PaymentMethodDetails[]>([]);
  const [showNewMethodForm, setShowNewMethodForm] = useState(false);
  const [selectedMethodId, setSelectedMethodId] = useState<string>('');

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    setValue,
    watch,
    reset,
  } = useForm<PayoutRequestFormData>({
    resolver: zodResolver(payoutRequestSchema),
    defaultValues: {
      amount: Math.min(availableAmount, minimumAmount),
      payment_method: 'paypal',
      payment_details: {},
      notes: '',
    },
  });

  const watchedPaymentMethod = watch('payment_method');
  const watchedAmount = watch('amount');

  useEffect(() => {
    loadSavedPaymentMethods();
  }, []);

  const loadSavedPaymentMethods = async () => {
    try {
      const response = await fetch('/api/partner/payment-methods');
      const data = await response.json();
      
      if (response.ok) {
        setSavedPaymentMethods(data.methods || []);
        
        // Set default payment method
        const defaultMethod = data.methods?.find((m: PaymentMethodDetails) => m.is_default);
        if (defaultMethod) {
          setSelectedMethodId(defaultMethod.id);
          setValue('payment_method', defaultMethod.type);
        }
      }
    } catch (error) {
      console.error('Error loading payment methods:', error);
    }
  };

  const handlePayoutRequest = async (data: PayoutRequestFormData) => {
    try {
      setIsSubmitting(true);

      // Validate amount
      if (data.amount > availableAmount) {
        toast.error('Payout amount exceeds available balance');
        return;
      }

      if (data.amount < minimumAmount) {
        toast.error(`Minimum payout amount is $${minimumAmount}`);
        return;
      }

      // Submit payout request
      const response = await fetch('/api/partner/payouts/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: data.amount,
          payment_method: data.payment_method,
          payment_details: data.payment_details,
          notes: data.notes,
          payment_method_id: selectedMethodId || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit payout request');
      }

      toast.success('Payout request submitted successfully!');
      
      if (onRequestSubmitted) {
        onRequestSubmitted(result.request);
      }

      reset();
      
    } catch (error) {
      console.error('Error submitting payout request:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to submit payout request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateFees = (amount: number, method: string) => {
    const feeRates = {
      paypal: 0.03, // 3%
      bank_transfer: 5, // $5 flat fee
      crypto: 0.01, // 1%
    };

    if (method === 'bank_transfer') {
      return Math.min(feeRates.bank_transfer, amount * 0.02); // $5 or 2%, whichever is lower
    }

    return amount * (feeRates[method as keyof typeof feeRates] || 0);
  };

  const fees = calculateFees(watchedAmount || 0, watchedPaymentMethod);
  const netAmount = (watchedAmount || 0) - fees;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'paypal':
        return <CreditCard className="h-5 w-5 text-blue-600" />;
      case 'bank_transfer':
        return <Building className="h-5 w-5 text-green-600" />;
      case 'crypto':
        return <Bitcoin className="h-5 w-5 text-orange-600" />;
      default:
        return <DollarSign className="h-5 w-5 text-gray-600" />;
    }
  };

  const renderPaymentMethodForm = () => {
    switch (watchedPaymentMethod) {
      case 'paypal':
        return (
          <div>
            <Label htmlFor="paypal_email">PayPal Email *</Label>
            <Input
              id="paypal_email"
              type="email"
              {...register('payment_details.paypal_email')}
              placeholder="your-email@paypal.com"
              className={cn(errors.payment_details?.paypal_email && 'border-red-500')}
            />
            {errors.payment_details?.paypal_email && (
              <p className="text-sm text-red-600 mt-1">
                {errors.payment_details.paypal_email.message}
              </p>
            )}
          </div>
        );

      case 'bank_transfer':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="account_holder">Account Holder Name *</Label>
                <Input
                  id="account_holder"
                  {...register('payment_details.account_holder')}
                  placeholder="John Doe"
                  className={cn(errors.payment_details?.account_holder && 'border-red-500')}
                />
              </div>
              <div>
                <Label htmlFor="bank_name">Bank Name *</Label>
                <Input
                  id="bank_name"
                  {...register('payment_details.bank_name')}
                  placeholder="Chase Bank"
                  className={cn(errors.payment_details?.bank_name && 'border-red-500')}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="account_number">Account Number *</Label>
                <Input
                  id="account_number"
                  {...register('payment_details.account_number')}
                  placeholder="1234567890"
                  className={cn(errors.payment_details?.account_number && 'border-red-500')}
                />
              </div>
              <div>
                <Label htmlFor="routing_number">Routing Number *</Label>
                <Input
                  id="routing_number"
                  {...register('payment_details.routing_number')}
                  placeholder="123456789"
                  className={cn(errors.payment_details?.routing_number && 'border-red-500')}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="swift_code">SWIFT Code (International)</Label>
              <Input
                id="swift_code"
                {...register('payment_details.swift_code')}
                placeholder="CHASUS33"
              />
            </div>
          </div>
        );

      case 'crypto':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="crypto_currency">Cryptocurrency *</Label>
              <Select
                value={watch('payment_details.crypto_currency') || ''}
                onValueChange={(value) => setValue('payment_details.crypto_currency', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select cryptocurrency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bitcoin">Bitcoin (BTC)</SelectItem>
                  <SelectItem value="ethereum">Ethereum (ETH)</SelectItem>
                  <SelectItem value="usdc">USD Coin (USDC)</SelectItem>
                  <SelectItem value="usdt">Tether (USDT)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="wallet_address">Wallet Address *</Label>
              <Input
                id="wallet_address"
                {...register('payment_details.wallet_address')}
                placeholder="1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"
                className={cn(errors.payment_details?.wallet_address && 'border-red-500')}
              />
              {errors.payment_details?.wallet_address && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.payment_details.wallet_address.message}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Double-check your wallet address. Payments to incorrect addresses cannot be recovered.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Available Balance */}
      <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Available for Payout</h3>
              <div className="text-3xl font-bold text-green-600 mt-2">
                {formatCurrency(availableAmount)}
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Minimum payout: {formatCurrency(minimumAmount)}
              </p>
            </div>
            <div className="p-4 bg-green-100 rounded-full">
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Pending Requests</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">
                      {formatCurrency(request.amount)}
                    </div>
                    <div className="text-sm text-gray-600">
                      {request.payment_method} • Requested {new Date(request.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <Badge className="bg-yellow-100 text-yellow-800">
                    {request.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payout Request Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Send className="h-5 w-5" />
            <span>Request Payout</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(handlePayoutRequest)} className="space-y-6">
            {/* Amount */}
            <div>
              <Label htmlFor="amount">Payout Amount *</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min={minimumAmount}
                  max={availableAmount}
                  {...register('amount', { valueAsNumber: true })}
                  placeholder={minimumAmount.toString()}
                  className={cn('pl-10', errors.amount && 'border-red-500')}
                />
              </div>
              {errors.amount && (
                <p className="text-sm text-red-600 mt-1">{errors.amount.message}</p>
              )}
              <div className="flex items-center justify-between mt-2 text-sm text-gray-600">
                <span>Available: {formatCurrency(availableAmount)}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setValue('amount', availableAmount)}
                  disabled={availableAmount < minimumAmount}
                >
                  Request All
                </Button>
              </div>
            </div>

            {/* Payment Method */}
            <div>
              <Label>Payment Method *</Label>
              
              {/* Saved Payment Methods */}
              {savedPaymentMethods.length > 0 && !showNewMethodForm && (
                <div className="mt-2 space-y-2">
                  <RadioGroup
                    value={selectedMethodId}
                    onValueChange={setSelectedMethodId}
                  >
                    {savedPaymentMethods.map((method) => (
                      <div key={method.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                        <RadioGroupItem value={method.id} id={method.id} />
                        <div className="flex items-center space-x-3 flex-1">
                          {getPaymentMethodIcon(method.type)}
                          <div>
                            <div className="font-medium text-gray-900">{method.label}</div>
                            <div className="text-sm text-gray-500">
                              {method.type === 'paypal' && method.details.email}
                              {method.type === 'bank_transfer' && `${method.details.bank_name} ****${method.details.account_number?.slice(-4)}`}
                              {method.type === 'crypto' && `${method.details.currency} ${method.details.address?.slice(0, 10)}...`}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {method.is_default && (
                            <Badge variant="outline" className="text-xs">Default</Badge>
                          )}
                          {method.is_verified && (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          )}
                        </div>
                      </div>
                    ))}
                  </RadioGroup>
                  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowNewMethodForm(true)}
                    className="w-full"
                  >
                    Add New Payment Method
                  </Button>
                </div>
              )}

              {/* New Payment Method Form */}
              {(savedPaymentMethods.length === 0 || showNewMethodForm) && (
                <div className="mt-2 space-y-4">
                  <RadioGroup
                    value={watchedPaymentMethod}
                    onValueChange={(value) => setValue('payment_method', value as any)}
                    className="grid grid-cols-1 md:grid-cols-3 gap-4"
                  >
                    <div className="flex items-center space-x-3 p-4 border rounded-lg">
                      <RadioGroupItem value="paypal" id="paypal" />
                      <Label htmlFor="paypal" className="flex items-center space-x-2 cursor-pointer">
                        <CreditCard className="h-5 w-5 text-blue-600" />
                        <div>
                          <div className="font-medium">PayPal</div>
                          <div className="text-xs text-gray-500">3% fee</div>
                        </div>
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-3 p-4 border rounded-lg">
                      <RadioGroupItem value="bank_transfer" id="bank_transfer" />
                      <Label htmlFor="bank_transfer" className="flex items-center space-x-2 cursor-pointer">
                        <Building className="h-5 w-5 text-green-600" />
                        <div>
                          <div className="font-medium">Bank Transfer</div>
                          <div className="text-xs text-gray-500">$5 fee</div>
                        </div>
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-3 p-4 border rounded-lg">
                      <RadioGroupItem value="crypto" id="crypto" />
                      <Label htmlFor="crypto" className="flex items-center space-x-2 cursor-pointer">
                        <Bitcoin className="h-5 w-5 text-orange-600" />
                        <div>
                          <div className="font-medium">Cryptocurrency</div>
                          <div className="text-xs text-gray-500">1% fee</div>
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>

                  {/* Payment Details Form */}
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-3">Payment Details</h4>
                    {renderPaymentMethodForm()}
                  </div>

                  {showNewMethodForm && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowNewMethodForm(false)}
                    >
                      Use Saved Method
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Payout Calculation */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-3 flex items-center space-x-2">
                <Calculator className="h-4 w-4" />
                <span>Payout Calculation</span>
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-blue-700">Requested Amount:</span>
                  <span className="font-medium text-blue-900">
                    {formatCurrency(watchedAmount || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">Processing Fee:</span>
                  <span className="font-medium text-blue-900">
                    -{formatCurrency(fees)}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-blue-200">
                  <span className="font-medium text-blue-900">You'll Receive:</span>
                  <span className="font-bold text-blue-900">
                    {formatCurrency(netAmount)}
                  </span>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                {...register('notes')}
                placeholder="Add any special instructions or notes..."
                rows={3}
                className={cn(errors.notes && 'border-red-500')}
              />
              {errors.notes && (
                <p className="text-sm text-red-600 mt-1">{errors.notes.message}</p>
              )}
            </div>

            {/* Validation Messages */}
            {availableAmount < minimumAmount && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-900">
                      Insufficient Balance
                    </p>
                    <p className="text-sm text-yellow-700">
                      You need at least {formatCurrency(minimumAmount)} to request a payout. 
                      Current balance: {formatCurrency(availableAmount)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => reset()}
                disabled={isSubmitting}
              >
                Reset
              </Button>
              
              <Button
                type="submit"
                disabled={!isValid || isSubmitting || availableAmount < minimumAmount}
                className="flex items-center space-x-2"
              >
                {isSubmitting ? (
                  <div className="h-4 w-4 animate-spin border-2 border-current border-t-transparent rounded-full" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                <span>{isSubmitting ? 'Submitting...' : 'Request Payout'}</span>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Payout Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Eye className="h-5 w-5" />
            <span>Payout Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Processing Times</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">PayPal:</span>
                  <span>1-2 business days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Bank Transfer:</span>
                  <span>3-5 business days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Cryptocurrency:</span>
                  <span>Within 24 hours</span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Important Notes</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <p>• Payouts are processed monthly on the 1st</p>
                <p>• Minimum payout amount is {formatCurrency(minimumAmount)}</p>
                <p>• Processing fees vary by payment method</p>
                <p>• All payments are subject to verification</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
