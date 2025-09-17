import { NextRequest, NextResponse } from 'next/server';
import { PaymentService } from '@/services/payment.service';
import { logError } from '@/lib/logger';
import { defaultLogger as logger } from '@/lib/logger';

const paymentService = new PaymentService();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, from_currency, to_currency } = body;

    if (!amount || !from_currency || !to_currency) {
      return NextResponse.json(
        { error: 'Amount, from_currency, and to_currency are required' },
        { status: 400 }
      );
    }

    logger.info('Converting currency via API', { 
      amount, 
      from_currency, 
      to_currency 
    });

    const result = await paymentService.convertCurrency(amount, from_currency, to_currency);

    return NextResponse.json({
      success: true,
      original_amount: amount,
      converted_amount: result.amount,
      from_currency,
      to_currency,
      exchange_rate: result.rate,
    });
  } catch (error) {
    logError(error as Error, { action: 'convert_currency_api' });
    return NextResponse.json(
      { error: 'Currency conversion failed' },
      { status: 500 }
    );
  }
}
