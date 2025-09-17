import { NextRequest, NextResponse } from 'next/server';
import { abTestingService } from '@/services/ab-testing.service';
import { z } from 'zod';

const AssignUserSchema = z.object({
  session_id: z.string(),
  user_id: z.string().optional()
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { session_id, user_id } = AssignUserSchema.parse(body);
    const { id: testId } = await params;

    const assignment = await abTestingService.assignVariant(testId, user_id || '');

    if (!assignment) {
      return NextResponse.json(
        { error: 'Failed to assign user to test' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      variant_id: assignment.id,
      test_id: testId,
      assigned_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('A/B test assignment error:', error);
    return NextResponse.json(
      { error: 'Failed to assign user to A/B test' },
      { status: 500 }
    );
  }
}
