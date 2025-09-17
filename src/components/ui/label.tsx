'use client';

import React from 'react';

type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement>;

export function Label({ className = '', ...props }: LabelProps) {
  return <label className={`text-sm font-medium ${className}`} {...props} />;
}

export default Label;

