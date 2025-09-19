import { NextRequest, NextResponse } from 'next/server';
import { gdprService } from '@/services/gdpr.service';
import { createServerClient } from '@/lib/supabase';
import { defaultLogger as logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    
    // Get user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { consentType, status, version } = body;

    // Validate required fields
    if (!consentType || !status || !version) {
      return NextResponse.json(
        { error: 'Consent type, status, and version are required' },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses = ['accepted', 'declined', 'revoked'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid consent status' },
        { status: 400 }
      );
    }

    // Get client IP and user agent
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    '0.0.0.0';
    const userAgent = request.headers.get('user-agent') || '';

    // Update consent
    const result = await gdprService.updateUserConsent({
      userId: user.id,
      consentType,
      status,
      version,
      ipAddress: clientIP,
      userAgent,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }

    logger.info('User consent updated via API', { 
      userId: user.id, 
      consentType,
      status,
      version 
    });

    return NextResponse.json({
      success: true,
      message: result.message,
    });

  } catch (error) {
    logger.error('Error in consent API endpoint', { error: error.message });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    
    // Get user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's consent history
    const consentHistory = await gdprService.getUserConsentHistory(user.id);

    // Get current privacy settings
    const privacySettings = await gdprService.getUserPrivacySettings(user.id);

    return NextResponse.json({
      consentHistory,
      privacySettings,
    });

  } catch (error) {
    logger.error('Error fetching consent data', { error: error.message });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createServerClient();
    
    // Get user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      analyticsConsent,
      marketingConsent,
      functionalConsent,
      dataProcessingConsent,
      thirdPartySharing,
      emailNotifications,
      smsNotifications,
      profileVisibility,
      dataRetentionPreference,
    } = body;

    // Validate profile visibility
    const validVisibilities = ['public', 'private', 'limited'];
    if (profileVisibility && !validVisibilities.includes(profileVisibility)) {
      return NextResponse.json(
        { error: 'Invalid profile visibility' },
        { status: 400 }
      );
    }

    // Validate data retention preference
    const validRetentions = ['7_days', '30_days', '90_days', '1_year', '2_years', '7_years', 'indefinite'];
    if (dataRetentionPreference && !validRetentions.includes(dataRetentionPreference)) {
      return NextResponse.json(
        { error: 'Invalid data retention preference' },
        { status: 400 }
      );
    }

    // Update privacy settings
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (analyticsConsent !== undefined) updateData.analytics_consent = analyticsConsent;
    if (marketingConsent !== undefined) updateData.marketing_consent = marketingConsent;
    if (functionalConsent !== undefined) updateData.functional_consent = functionalConsent;
    if (dataProcessingConsent !== undefined) updateData.data_processing_consent = dataProcessingConsent;
    if (thirdPartySharing !== undefined) updateData.third_party_sharing = thirdPartySharing;
    if (emailNotifications !== undefined) updateData.email_notifications = emailNotifications;
    if (smsNotifications !== undefined) updateData.sms_notifications = smsNotifications;
    if (profileVisibility !== undefined) updateData.profile_visibility = profileVisibility;
    if (dataRetentionPreference !== undefined) updateData.data_retention_preference = dataRetentionPreference;

    const { data: settings, error } = await supabase
      .from('user_privacy_settings')
      .upsert({
        user_id: user.id,
        ...updateData,
      }, {
        onConflict: 'user_id',
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to update privacy settings', { error: error.message, userId: user.id });
      return NextResponse.json(
        { error: 'Failed to update privacy settings' },
        { status: 500 }
      );
    }

    // Log audit entry
    await gdprService.createAuditLog({
      userId: user.id,
      tableName: 'user_privacy_settings',
      recordId: user.id,
      action: 'update',
      newValues: updateData,
    });

    logger.info('Privacy settings updated via API', { userId: user.id });

    return NextResponse.json({
      success: true,
      settings,
      message: 'Privacy settings updated successfully',
    });

  } catch (error) {
    logger.error('Error updating privacy settings', { error: error.message });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
