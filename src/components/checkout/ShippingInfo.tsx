'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Building, 
  Globe,
  Save,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthContext } from '@/contexts/AuthContext';
import { BillingAddress } from '@/types/payment';
import { cn } from '@/lib/utils';

// Validation schema
const shippingInfoSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().optional(),
  line1: z.string().min(5, 'Address line 1 is required'),
  line2: z.string().optional(),
  city: z.string().min(2, 'City is required'),
  state: z.string().optional(),
  postal_code: z.string().min(3, 'Postal code is required'),
  country: z.string().min(2, 'Country is required'),
});

type ShippingInfoFormData = z.infer<typeof shippingInfoSchema>;

interface ShippingInfoProps {
  initialData?: BillingAddress;
  onSubmit: (data: BillingAddress) => void;
  isLoading?: boolean;
  className?: string;
}

// Country list (simplified - in production, use a comprehensive list)
const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'IT', name: 'Italy' },
  { code: 'ES', name: 'Spain' },
  { code: 'AU', name: 'Australia' },
  { code: 'JP', name: 'Japan' },
  { code: 'RU', name: 'Russia' },
  { code: 'CN', name: 'China' },
  { code: 'IN', name: 'India' },
  { code: 'BR', name: 'Brazil' },
  { code: 'MX', name: 'Mexico' },
];

// US States
const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
  'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
  'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
  'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
  'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
  'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
  'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia',
  'Wisconsin', 'Wyoming'
];

export function ShippingInfo({
  initialData,
  onSubmit,
  isLoading = false,
  className,
}: ShippingInfoProps) {
  const { user, profile } = useAuthContext();
  const [selectedCountry, setSelectedCountry] = useState(initialData?.country || 'US');
  const [savedAddresses, setSavedAddresses] = useState<BillingAddress[]>([]);
  const [showSavedAddresses, setShowSavedAddresses] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    setValue,
    watch,
    reset,
  } = useForm<ShippingInfoFormData>({
    resolver: zodResolver(shippingInfoSchema),
    defaultValues: initialData || {
      name: profile?.name || '',
      email: profile?.email || '',
      country: 'US',
    },
  });

  const watchedCountry = watch('country');

  // Load saved addresses
  useEffect(() => {
    const loadSavedAddresses = async () => {
      try {
        const response = await fetch('/api/user/addresses');
        if (response.ok) {
          const data = await response.json();
          setSavedAddresses(data.addresses || []);
          setShowSavedAddresses(data.addresses?.length > 0);
        }
      } catch (error) {
        console.error('Failed to load saved addresses:', error);
      }
    };

    if (profile) {
      loadSavedAddresses();
    }
  }, [profile]);

  // Update selected country when form country changes
  useEffect(() => {
    setSelectedCountry(watchedCountry || 'US');
  }, [watchedCountry]);

  const handleFormSubmit = (data: ShippingInfoFormData) => {
    onSubmit(data as BillingAddress);
  };

  const handleSavedAddressSelect = (address: BillingAddress) => {
    reset(address);
    setSelectedCountry(address.country);
    setShowSavedAddresses(false);
  };

  const handleSaveAddress = async (data: ShippingInfoFormData) => {
    try {
      const response = await fetch('/api/user/addresses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const savedAddress = await response.json();
        setSavedAddresses(prev => [...prev, savedAddress]);
      }
    } catch (error) {
      console.error('Failed to save address:', error);
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Billing Information
        </h2>
        <p className="text-sm text-gray-600">
          Enter your billing details for the purchase
        </p>
      </div>

      {/* Saved Addresses */}
      {showSavedAddresses && savedAddresses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Use Saved Address</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {savedAddresses.map((address, index) => (
                <button
                  key={index}
                  onClick={() => handleSavedAddressSelect(address)}
                  className="w-full text-left p-3 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                >
                  <div className="font-medium text-gray-900">{address.name}</div>
                  <div className="text-sm text-gray-600">
                    {address.line1}
                    {address.line2 && `, ${address.line2}`}
                  </div>
                  <div className="text-sm text-gray-600">
                    {address.city}, {address.state} {address.postal_code}
                  </div>
                  <div className="text-sm text-gray-600">{address.country}</div>
                </button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSavedAddresses(false)}
              className="mt-3"
            >
              Enter New Address
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Shipping Form */}
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Personal Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="name" className="flex items-center space-x-2">
              <User className="h-4 w-4" />
              <span>Full Name *</span>
            </Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="John Doe"
              className={cn(errors.name && 'border-red-500')}
            />
            {errors.name && (
              <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="email" className="flex items-center space-x-2">
              <Mail className="h-4 w-4" />
              <span>Email Address *</span>
            </Label>
            <Input
              id="email"
              type="email"
              {...register('email')}
              placeholder="john@example.com"
              className={cn(errors.email && 'border-red-500')}
            />
            {errors.email && (
              <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="phone" className="flex items-center space-x-2">
            <Phone className="h-4 w-4" />
            <span>Phone Number</span>
          </Label>
          <Input
            id="phone"
            type="tel"
            {...register('phone')}
            placeholder="+1 (555) 123-4567"
          />
        </div>

        {/* Address Information */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center space-x-2">
            <MapPin className="h-5 w-5" />
            <span>Address</span>
          </h3>

          <div className="space-y-4">
            <div>
              <Label htmlFor="line1">Street Address *</Label>
              <Input
                id="line1"
                {...register('line1')}
                placeholder="123 Main Street"
                className={cn(errors.line1 && 'border-red-500')}
              />
              {errors.line1 && (
                <p className="text-sm text-red-600 mt-1">{errors.line1.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="line2">Apartment, Suite, etc.</Label>
              <Input
                id="line2"
                {...register('line2')}
                placeholder="Apt 4B"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  {...register('city')}
                  placeholder="New York"
                  className={cn(errors.city && 'border-red-500')}
                />
                {errors.city && (
                  <p className="text-sm text-red-600 mt-1">{errors.city.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="state">State/Province</Label>
                {selectedCountry === 'US' ? (
                  <Select
                    value={watch('state') || ''}
                    onValueChange={(value) => setValue('state', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {US_STATES.map((state) => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="state"
                    {...register('state')}
                    placeholder="State/Province"
                  />
                )}
              </div>

              <div>
                <Label htmlFor="postal_code">Postal Code *</Label>
                <Input
                  id="postal_code"
                  {...register('postal_code')}
                  placeholder={selectedCountry === 'US' ? '12345' : 'Postal Code'}
                  className={cn(errors.postal_code && 'border-red-500')}
                />
                {errors.postal_code && (
                  <p className="text-sm text-red-600 mt-1">{errors.postal_code.message}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="country" className="flex items-center space-x-2">
                <Globe className="h-4 w-4" />
                <span>Country *</span>
              </Label>
              <Select
                value={watch('country') || 'US'}
                onValueChange={(value) => setValue('country', value)}
              >
                <SelectTrigger className={cn(errors.country && 'border-red-500')}>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.country && (
                <p className="text-sm text-red-600 mt-1">{errors.country.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-6 border-t border-gray-200">
          <div className="flex items-center space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleSaveAddress(watch())}
              disabled={!isValid || isLoading}
              className="flex items-center space-x-2"
            >
              <Save className="h-4 w-4" />
              <span>Save Address</span>
            </Button>
            
            {savedAddresses.length > 0 && !showSavedAddresses && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowSavedAddresses(true)}
                className="text-blue-600"
              >
                Use Saved Address
              </Button>
            )}
          </div>

          <Button
            type="submit"
            disabled={!isValid || isLoading}
            className="flex items-center space-x-2"
          >
            {isLoading ? (
              <div className="h-4 w-4 animate-spin border-2 border-current border-t-transparent rounded-full" />
            ) : (
              <>
                <span>Continue to Payment</span>
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Security Note */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Building className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-blue-900">
              Secure Information
            </h4>
            <p className="text-sm text-blue-700 mt-1">
              Your billing information is encrypted and securely stored. We use this information only for payment processing and order fulfillment.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
