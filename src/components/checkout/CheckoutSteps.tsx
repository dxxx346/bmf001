'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export type CheckoutStep = 'shipping' | 'payment' | 'review';

interface Step {
  key: CheckoutStep;
  title: string;
  description: string;
}

interface CheckoutStepsProps {
  steps: Step[];
  currentStep: CheckoutStep;
  completedSteps: CheckoutStep[];
  onStepClick?: (step: CheckoutStep) => void;
  className?: string;
}

export function CheckoutSteps({
  steps,
  currentStep,
  completedSteps,
  onStepClick,
  className,
}: CheckoutStepsProps) {
  const currentStepIndex = steps.findIndex(step => step.key === currentStep);

  const getStepStatus = (stepKey: CheckoutStep, index: number) => {
    if (completedSteps.includes(stepKey)) {
      return 'completed';
    }
    if (stepKey === currentStep) {
      return 'current';
    }
    if (index < currentStepIndex) {
      return 'completed';
    }
    return 'upcoming';
  };

  const isStepClickable = (stepKey: CheckoutStep, index: number) => {
    return onStepClick && (completedSteps.includes(stepKey) || index <= currentStepIndex);
  };

  return (
    <nav className={cn('', className)} aria-label="Checkout progress">
      <ol className="flex items-center justify-center space-x-8 md:space-x-12">
        {steps.map((step, index) => {
          const status = getStepStatus(step.key, index);
          const isClickable = isStepClickable(step.key, index);

          return (
            <li key={step.key} className="flex items-center">
              <div className="flex flex-col items-center">
                {/* Step Circle */}
                <button
                  onClick={() => isClickable && onStepClick?.(step.key)}
                  disabled={!isClickable}
                  className={cn(
                    'flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-200',
                    {
                      // Completed step
                      'bg-blue-600 border-blue-600 text-white': status === 'completed',
                      // Current step
                      'bg-blue-600 border-blue-600 text-white ring-4 ring-blue-100': status === 'current',
                      // Upcoming step
                      'bg-white border-gray-300 text-gray-400': status === 'upcoming',
                      // Clickable styles
                      'cursor-pointer hover:border-blue-400 hover:text-blue-600': isClickable && status === 'upcoming',
                      'cursor-pointer': isClickable,
                      'cursor-default': !isClickable,
                    }
                  )}
                  aria-current={status === 'current' ? 'step' : undefined}
                >
                  {status === 'completed' ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <span className="text-sm font-medium">{index + 1}</span>
                  )}
                </button>

                {/* Step Label */}
                <div className="mt-3 text-center">
                  <div
                    className={cn(
                      'text-sm font-medium transition-colors duration-200',
                      {
                        'text-blue-600': status === 'current' || status === 'completed',
                        'text-gray-500': status === 'upcoming',
                      }
                    )}
                  >
                    {step.title}
                  </div>
                  <div className="text-xs text-gray-500 mt-1 hidden sm:block">
                    {step.description}
                  </div>
                </div>
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'hidden md:block w-16 h-0.5 ml-10 transition-colors duration-200',
                    {
                      'bg-blue-600': index < currentStepIndex || completedSteps.includes(steps[index + 1].key),
                      'bg-gray-300': index >= currentStepIndex && !completedSteps.includes(steps[index + 1].key),
                    }
                  )}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// Compact version for mobile
export function CheckoutStepsCompact({
  steps,
  currentStep,
  completedSteps,
  className,
}: Omit<CheckoutStepsProps, 'onStepClick'>) {
  const currentStepIndex = steps.findIndex(step => step.key === currentStep);
  const currentStepData = steps[currentStepIndex];
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  return (
    <div className={cn('md:hidden', className)}>
      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
          <span>Step {currentStepIndex + 1} of {steps.length}</span>
          <span>{Math.round(progress)}% complete</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Current Step Info */}
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900">
          {currentStepData?.title}
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          {currentStepData?.description}
        </p>
      </div>
    </div>
  );
}

// Alternative horizontal layout
export function CheckoutStepsHorizontal({
  steps,
  currentStep,
  completedSteps,
  onStepClick,
  className,
}: CheckoutStepsProps) {
  const currentStepIndex = steps.findIndex(step => step.key === currentStep);

  return (
    <div className={cn('', className)}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const status = completedSteps.includes(step.key) 
            ? 'completed' 
            : step.key === currentStep 
            ? 'current' 
            : 'upcoming';
          
          const isClickable = onStepClick && (completedSteps.includes(step.key) || index <= currentStepIndex);

          return (
            <div key={step.key} className="flex items-center flex-1">
              <button
                onClick={() => isClickable && onStepClick?.(step.key)}
                disabled={!isClickable}
                className={cn(
                  'flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 w-full',
                  {
                    'bg-blue-50 border border-blue-200': status === 'current',
                    'bg-green-50 border border-green-200': status === 'completed',
                    'bg-gray-50 border border-gray-200': status === 'upcoming',
                    'cursor-pointer hover:bg-blue-50': isClickable,
                    'cursor-default': !isClickable,
                  }
                )}
              >
                <div
                  className={cn(
                    'flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium',
                    {
                      'bg-blue-600 text-white': status === 'current',
                      'bg-green-600 text-white': status === 'completed',
                      'bg-gray-300 text-gray-600': status === 'upcoming',
                    }
                  )}
                >
                  {status === 'completed' ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                <div className="text-left">
                  <div
                    className={cn(
                      'text-sm font-medium',
                      {
                        'text-blue-900': status === 'current',
                        'text-green-900': status === 'completed',
                        'text-gray-600': status === 'upcoming',
                      }
                    )}
                  >
                    {step.title}
                  </div>
                  <div className="text-xs text-gray-500 hidden sm:block">
                    {step.description}
                  </div>
                </div>
              </button>
              
              {index < steps.length - 1 && (
                <div className="w-4 flex justify-center">
                  <div
                    className={cn(
                      'w-0.5 h-8 transition-colors duration-200',
                      {
                        'bg-blue-300': index < currentStepIndex,
                        'bg-gray-300': index >= currentStepIndex,
                      }
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
