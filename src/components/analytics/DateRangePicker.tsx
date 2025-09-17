'use client';

import { useState, useEffect } from 'react';
import { Calendar, ChevronDown, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export interface DateRange {
  startDate: Date;
  endDate: Date;
  label: string;
}

export type PredefinedPeriod = '7d' | '30d' | '90d' | '1y' | 'custom';

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
  disabled?: boolean;
  maxDate?: Date;
  minDate?: Date;
}

const PREDEFINED_RANGES: Record<PredefinedPeriod, (today: Date) => DateRange> = {
  '7d': (today) => ({
    startDate: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
    endDate: today,
    label: 'Last 7 days',
  }),
  '30d': (today) => ({
    startDate: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000),
    endDate: today,
    label: 'Last 30 days',
  }),
  '90d': (today) => ({
    startDate: new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000),
    endDate: today,
    label: 'Last 90 days',
  }),
  '1y': (today) => ({
    startDate: new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()),
    endDate: today,
    label: 'Last 12 months',
  }),
  'custom': () => ({
    startDate: new Date(),
    endDate: new Date(),
    label: 'Custom range',
  }),
};

export function DateRangePicker({
  value,
  onChange,
  className,
  disabled = false,
  maxDate = new Date(),
  minDate,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<PredefinedPeriod>('30d');

  // Initialize custom date inputs when switching to custom
  useEffect(() => {
    if (selectedPeriod === 'custom') {
      setCustomStart(value.startDate.toISOString().split('T')[0]);
      setCustomEnd(value.endDate.toISOString().split('T')[0]);
    }
  }, [selectedPeriod, value]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handlePredefinedRange = (period: PredefinedPeriod) => {
    setSelectedPeriod(period);
    
    if (period !== 'custom') {
      const range = PREDEFINED_RANGES[period](new Date());
      onChange(range);
      setIsOpen(false);
    }
  };

  const handleCustomRange = () => {
    if (!customStart || !customEnd) return;

    const startDate = new Date(customStart);
    const endDate = new Date(customEnd);

    if (startDate > endDate) {
      return;
    }

    if (minDate && startDate < minDate) {
      return;
    }

    if (endDate > maxDate) {
      return;
    }

    const range: DateRange = {
      startDate,
      endDate,
      label: `${formatDate(startDate)} - ${formatDate(endDate)}`,
    };

    onChange(range);
    setIsOpen(false);
  };

  const getDaysDifference = () => {
    const diffTime = Math.abs(value.endDate.getTime() - value.startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getRelativeLabel = () => {
    const days = getDaysDifference();
    
    if (days <= 1) return 'Today';
    if (days <= 7) return `Last ${days} days`;
    if (days <= 30) return `Last ${Math.ceil(days / 7)} weeks`;
    if (days <= 90) return `Last ${Math.ceil(days / 30)} months`;
    return `Last ${Math.ceil(days / 365)} year${days > 365 ? 's' : ''}`;
  };

  return (
    <div className={cn('relative', className)}>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            className="justify-between min-w-[200px]"
          >
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4" />
              <span className="truncate">
                {value.label || getRelativeLabel()}
              </span>
            </div>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="end" className="w-80 p-0">
          <Card className="border-0 shadow-none">
            <CardContent className="p-4 space-y-4">
              {/* Quick Ranges */}
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Quick Ranges
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(PREDEFINED_RANGES) as PredefinedPeriod[])
                    .filter(period => period !== 'custom')
                    .map((period) => {
                      const range = PREDEFINED_RANGES[period](new Date());
                      const isSelected = selectedPeriod === period;
                      
                      return (
                        <Button
                          key={period}
                          variant={isSelected ? "primary" : "outline"}
                          size="sm"
                          onClick={() => handlePredefinedRange(period)}
                          className="justify-start text-left h-auto py-2"
                        >
                          <div>
                            <div className="font-medium">{range.label}</div>
                            <div className="text-xs opacity-70">
                              {formatDate(range.startDate)} - {formatDate(range.endDate)}
                            </div>
                          </div>
                        </Button>
                      );
                    })}
                </div>
              </div>

              {/* Custom Range */}
              <div className="border-t pt-4">
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Custom Range
                </Label>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="start-date" className="text-xs text-gray-600">
                        Start Date
                      </Label>
                      <Input
                        id="start-date"
                        type="date"
                        value={customStart}
                        onChange={(e) => setCustomStart(e.target.value)}
                        max={customEnd || maxDate.toISOString().split('T')[0]}
                        min={minDate?.toISOString().split('T')[0]}
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="end-date" className="text-xs text-gray-600">
                        End Date
                      </Label>
                      <Input
                        id="end-date"
                        type="date"
                        value={customEnd}
                        onChange={(e) => setCustomEnd(e.target.value)}
                        min={customStart}
                        max={maxDate.toISOString().split('T')[0]}
                        className="text-sm"
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">
                      {customStart && customEnd ? (
                        `${Math.ceil((new Date(customEnd).getTime() - new Date(customStart).getTime()) / (1000 * 60 * 60 * 24))} days`
                      ) : (
                        'Select dates'
                      )}
                    </Badge>
                    
                    <Button
                      size="sm"
                      onClick={handleCustomRange}
                      disabled={!customStart || !customEnd}
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="border-t pt-4">
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Quick Actions
                </Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const today = new Date();
                      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
                      onChange({
                        startDate: yesterday,
                        endDate: today,
                        label: 'Yesterday',
                      });
                      setIsOpen(false);
                    }}
                    className="text-xs"
                  >
                    Yesterday
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const today = new Date();
                      const thisWeek = new Date(today.getTime() - (today.getDay() * 24 * 60 * 60 * 1000));
                      onChange({
                        startDate: thisWeek,
                        endDate: today,
                        label: 'This week',
                      });
                      setIsOpen(false);
                    }}
                    className="text-xs"
                  >
                    This Week
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const today = new Date();
                      const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                      onChange({
                        startDate: thisMonth,
                        endDate: today,
                        label: 'This month',
                      });
                      setIsOpen(false);
                    }}
                    className="text-xs"
                  >
                    This Month
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// Simplified date range picker for basic use cases
interface SimpleDateRangePickerProps {
  period: PredefinedPeriod;
  onPeriodChange: (period: PredefinedPeriod) => void;
  className?: string;
}

export function SimpleDateRangePicker({
  period,
  onPeriodChange,
  className,
}: SimpleDateRangePickerProps) {
  const options = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 90 days' },
    { value: '1y', label: 'Last 12 months' },
  ];

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <Clock className="h-4 w-4 text-gray-400" />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="justify-between min-w-[140px]">
            <span>{options.find(opt => opt.value === period)?.label || 'Select period'}</span>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {options.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => onPeriodChange(option.value as PredefinedPeriod)}
              className={cn(period === option.value && 'bg-blue-50 text-blue-900')}
            >
              {option.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// Utility functions for date range operations
export const getDateRangeFromPeriod = (period: PredefinedPeriod): DateRange => {
  const today = new Date();
  return PREDEFINED_RANGES[period](today);
};

export const formatDateRange = (range: DateRange): string => {
  const start = range.startDate.toLocaleDateString();
  const end = range.endDate.toLocaleDateString();
  return `${start} - ${end}`;
};

export const isDateRangeValid = (range: DateRange): boolean => {
  return range.startDate <= range.endDate;
};

export const getDaysInRange = (range: DateRange): number => {
  const diffTime = Math.abs(range.endDate.getTime() - range.startDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};
