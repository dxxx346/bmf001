-- Enhanced Referral System with Multi-tier Commission, Fraud Detection, and Link Shortener
-- Migration: Enhanced Referral System

-- Commission tiers table for multi-level commissions
CREATE TABLE commission_tiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tier_level INTEGER NOT NULL CHECK (tier_level > 0),
  min_referrals INTEGER NOT NULL DEFAULT 0,
  max_referrals INTEGER,
  commission_percentage DECIMAL(5,2) NOT NULL CHECK (commission_percentage >= 0 AND commission_percentage <= 100),
  bonus_amount DECIMAL(10,2) DEFAULT 0,
  tier_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Referral conversions table for detailed tracking
CREATE TABLE referral_conversions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referral_id UUID NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
  purchase_id UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  commission_amount DECIMAL(10,2) NOT NULL,
  commission_tier INTEGER REFERENCES commission_tiers(tier_level),
  conversion_type TEXT DEFAULT 'direct' CHECK (conversion_type IN ('direct', 'indirect')),
  ip_address TEXT,
  user_agent TEXT,
  country TEXT,
  fraud_score DECIMAL(3,2) DEFAULT 0,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Commission payouts table for automated payments
CREATE TABLE commission_payouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed', 'cancelled')),
  payment_method TEXT,
  external_transaction_id TEXT,
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Referral tracking cookies table for 30-day window tracking
CREATE TABLE referral_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referral_code TEXT NOT NULL,
  visitor_ip TEXT,
  visitor_fingerprint TEXT, -- Browser fingerprint for tracking
  user_agent TEXT,
  referrer_url TEXT,
  landing_page TEXT,
  country TEXT,
  city TEXT,
  cookie_value TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  converted_at TIMESTAMP WITH TIME ZONE,
  purchase_id UUID REFERENCES purchases(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fraud detection table for patterns and IP analysis
CREATE TABLE fraud_detection (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referral_id UUID REFERENCES referrals(id) ON DELETE CASCADE,
  tracking_id UUID REFERENCES referral_tracking(id) ON DELETE CASCADE,
  conversion_id UUID REFERENCES referral_conversions(id) ON DELETE CASCADE,
  fraud_type TEXT NOT NULL CHECK (fraud_type IN ('ip_abuse', 'click_fraud', 'bot_traffic', 'suspicious_pattern', 'duplicate_conversion')),
  risk_score DECIMAL(3,2) NOT NULL CHECK (risk_score >= 0 AND risk_score <= 1),
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  is_flagged BOOLEAN DEFAULT false,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Short links table for referral link shortener
CREATE TABLE short_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referral_id UUID NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
  short_code TEXT UNIQUE NOT NULL,
  original_url TEXT NOT NULL,
  title TEXT,
  description TEXT,
  click_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Referral performance analytics table
CREATE TABLE referral_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referral_id UUID NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  clicks INTEGER DEFAULT 0,
  unique_clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  revenue DECIMAL(10,2) DEFAULT 0,
  commission_earned DECIMAL(10,2) DEFAULT 0,
  fraud_clicks INTEGER DEFAULT 0,
  bounce_rate DECIMAL(5,2) DEFAULT 0,
  conversion_rate DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(referral_id, date)
);

-- Add indexes for performance
CREATE INDEX idx_commission_tiers_level ON commission_tiers(tier_level);
CREATE INDEX idx_referral_conversions_referral_id ON referral_conversions(referral_id);
CREATE INDEX idx_referral_conversions_purchase_id ON referral_conversions(purchase_id);
CREATE INDEX idx_commission_payouts_referrer_id ON commission_payouts(referrer_id);
CREATE INDEX idx_commission_payouts_status ON commission_payouts(status);
CREATE INDEX idx_referral_tracking_code ON referral_tracking(referral_code);
CREATE INDEX idx_referral_tracking_cookie ON referral_tracking(cookie_value);
CREATE INDEX idx_referral_tracking_expires ON referral_tracking(expires_at);
CREATE INDEX idx_fraud_detection_referral_id ON fraud_detection(referral_id);
CREATE INDEX idx_fraud_detection_ip ON fraud_detection(ip_address);
CREATE INDEX idx_fraud_detection_status ON fraud_detection(status);
CREATE INDEX idx_short_links_code ON short_links(short_code);
CREATE INDEX idx_short_links_referral_id ON short_links(referral_id);
CREATE INDEX idx_referral_analytics_referral_date ON referral_analytics(referral_id, date);

-- Add updated_at triggers for new tables
CREATE TRIGGER update_commission_tiers_updated_at BEFORE UPDATE ON commission_tiers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_short_links_updated_at BEFORE UPDATE ON short_links FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed initial commission tiers
INSERT INTO commission_tiers (tier_level, min_referrals, max_referrals, commission_percentage, bonus_amount, tier_name) VALUES
(1, 0, 9, 10.0, 0, 'Bronze'),
(2, 10, 49, 15.0, 50.0, 'Silver'),
(3, 50, 199, 20.0, 200.0, 'Gold'),
(4, 200, 999, 25.0, 500.0, 'Platinum'),
(5, 1000, NULL, 30.0, 1000.0, 'Diamond');

-- Enhanced referral functions

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code(length_param INTEGER DEFAULT 8)
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
  code_exists BOOLEAN := true;
BEGIN
  WHILE code_exists LOOP
    result := '';
    FOR i IN 1..length_param LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
    END LOOP;
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM referrals WHERE referral_code = result) INTO code_exists;
  END LOOP;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to generate short link code
CREATE OR REPLACE FUNCTION generate_short_code(length_param INTEGER DEFAULT 6)
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
  code_exists BOOLEAN := true;
BEGIN
  WHILE code_exists LOOP
    result := '';
    FOR i IN 1..length_param LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
    END LOOP;
    
    -- Check if short code already exists
    SELECT EXISTS(SELECT 1 FROM short_links WHERE short_code = result) INTO code_exists;
  END LOOP;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to get user commission tier
CREATE OR REPLACE FUNCTION get_user_commission_tier(user_id UUID)
RETURNS TABLE (
  tier_level INTEGER,
  tier_name TEXT,
  commission_percentage DECIMAL(5,2),
  bonus_amount DECIMAL(10,2),
  total_referrals INTEGER,
  next_tier_level INTEGER,
  referrals_to_next_tier INTEGER
) AS $$
DECLARE
  user_referrals INTEGER;
  current_tier RECORD;
  next_tier RECORD;
BEGIN
  -- Get total successful referrals for user
  SELECT COUNT(*) INTO user_referrals
  FROM referral_conversions rc
  JOIN referrals r ON rc.referral_id = r.id
  WHERE r.referrer_id = user_id AND rc.is_verified = true;
  
  -- Get current tier
  SELECT * INTO current_tier
  FROM commission_tiers
  WHERE is_active = true
  AND user_referrals >= min_referrals
  AND (max_referrals IS NULL OR user_referrals <= max_referrals)
  ORDER BY tier_level DESC
  LIMIT 1;
  
  -- Get next tier
  SELECT * INTO next_tier
  FROM commission_tiers
  WHERE is_active = true
  AND tier_level > COALESCE(current_tier.tier_level, 0)
  ORDER BY tier_level ASC
  LIMIT 1;
  
  RETURN QUERY SELECT
    COALESCE(current_tier.tier_level, 1),
    COALESCE(current_tier.tier_name, 'Bronze'),
    COALESCE(current_tier.commission_percentage, 10.0),
    COALESCE(current_tier.bonus_amount, 0.0),
    user_referrals,
    next_tier.tier_level,
    CASE 
      WHEN next_tier.min_referrals IS NOT NULL THEN next_tier.min_referrals - user_referrals
      ELSE 0
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate fraud score
CREATE OR REPLACE FUNCTION calculate_fraud_score(
  ip_address TEXT,
  user_agent TEXT,
  referral_id UUID,
  time_between_click_and_purchase INTERVAL DEFAULT NULL
)
RETURNS DECIMAL(3,2) AS $$
DECLARE
  fraud_score DECIMAL(3,2) := 0;
  ip_click_count INTEGER;
  same_ua_count INTEGER;
  recent_conversions INTEGER;
BEGIN
  -- Check IP abuse (multiple clicks from same IP)
  SELECT COUNT(*) INTO ip_click_count
  FROM referral_clicks rc
  WHERE rc.visitor_ip = ip_address
  AND rc.clicked_at > NOW() - INTERVAL '24 hours';
  
  IF ip_click_count > 10 THEN
    fraud_score := fraud_score + 0.3;
  ELSIF ip_click_count > 5 THEN
    fraud_score := fraud_score + 0.15;
  END IF;
  
  -- Check user agent abuse
  SELECT COUNT(*) INTO same_ua_count
  FROM referral_clicks rc
  WHERE rc.user_agent = user_agent
  AND rc.clicked_at > NOW() - INTERVAL '1 hour';
  
  IF same_ua_count > 5 THEN
    fraud_score := fraud_score + 0.25;
  END IF;
  
  -- Check rapid conversions
  SELECT COUNT(*) INTO recent_conversions
  FROM referral_conversions rc
  JOIN referrals r ON rc.referral_id = r.id
  WHERE r.referrer_id = (SELECT referrer_id FROM referrals WHERE id = referral_id)
  AND rc.created_at > NOW() - INTERVAL '1 hour';
  
  IF recent_conversions > 3 THEN
    fraud_score := fraud_score + 0.2;
  END IF;
  
  -- Check time between click and purchase (too fast = suspicious)
  IF time_between_click_and_purchase IS NOT NULL AND time_between_click_and_purchase < INTERVAL '30 seconds' THEN
    fraud_score := fraud_score + 0.15;
  END IF;
  
  RETURN LEAST(fraud_score, 1.0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to process referral conversion with fraud detection
CREATE OR REPLACE FUNCTION process_referral_conversion_enhanced(
  referral_id UUID,
  purchase_id UUID,
  ip_address TEXT DEFAULT NULL,
  user_agent TEXT DEFAULT NULL,
  click_time TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  referral_record RECORD;
  purchase_record RECORD;
  tier_record RECORD;
  commission_amount DECIMAL(10,2);
  fraud_score DECIMAL(3,2);
  conversion_id UUID;
  time_diff INTERVAL;
  result JSONB;
BEGIN
  -- Get referral and purchase details
  SELECT * INTO referral_record FROM referrals WHERE id = referral_id;
  SELECT * INTO purchase_record FROM purchases WHERE id = purchase_id;
  
  -- Get user's commission tier
  SELECT * INTO tier_record FROM get_user_commission_tier(referral_record.referrer_id);
  
  -- Calculate commission based on tier
  IF referral_record.reward_type = 'percentage' THEN
    commission_amount := purchase_record.amount * (tier_record.commission_percentage / 100);
  ELSE
    commission_amount := referral_record.reward_value;
  END IF;
  
  -- Calculate time difference if click_time provided
  IF click_time IS NOT NULL THEN
    time_diff := purchase_record.created_at - click_time;
  END IF;
  
  -- Calculate fraud score
  fraud_score := calculate_fraud_score(ip_address, user_agent, referral_id, time_diff);
  
  -- Create conversion record
  INSERT INTO referral_conversions (
    referral_id, purchase_id, commission_amount, commission_tier,
    ip_address, user_agent, fraud_score, is_verified
  ) VALUES (
    referral_id, purchase_id, commission_amount, tier_record.tier_level,
    ip_address, user_agent, fraud_score, fraud_score < 0.5
  ) RETURNING id INTO conversion_id;
  
  -- If high fraud score, create fraud detection record
  IF fraud_score >= 0.5 THEN
    INSERT INTO fraud_detection (
      referral_id, conversion_id, fraud_type, risk_score, ip_address, user_agent, is_flagged
    ) VALUES (
      referral_id, conversion_id, 'suspicious_pattern', fraud_score, ip_address, user_agent, true
    );
  END IF;
  
  -- Update referral stats only if not flagged as fraud
  IF fraud_score < 0.5 THEN
    UPDATE referral_stats 
    SET 
      conversion_count = conversion_count + 1,
      total_earned = total_earned + commission_amount,
      last_conversion_at = NOW(),
      updated_at = NOW()
    WHERE referral_stats.referral_id = process_referral_conversion_enhanced.referral_id;
  END IF;
  
  -- Build result
  result := jsonb_build_object(
    'conversion_id', conversion_id,
    'commission_amount', commission_amount,
    'fraud_score', fraud_score,
    'is_verified', fraud_score < 0.5,
    'tier_level', tier_record.tier_level,
    'tier_name', tier_record.tier_name
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create short link
CREATE OR REPLACE FUNCTION create_short_link(
  referral_id UUID,
  original_url TEXT,
  title TEXT DEFAULT NULL,
  description TEXT DEFAULT NULL,
  expires_days INTEGER DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
  short_code TEXT;
  expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  short_code := generate_short_code();
  
  IF expires_days IS NOT NULL THEN
    expires_at := NOW() + (expires_days || ' days')::INTERVAL;
  END IF;
  
  INSERT INTO short_links (referral_id, short_code, original_url, title, description, expires_at)
  VALUES (referral_id, short_code, original_url, title, description, expires_at);
  
  RETURN short_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to track short link click
CREATE OR REPLACE FUNCTION track_short_link_click(short_code TEXT)
RETURNS JSONB AS $$
DECLARE
  link_record RECORD;
  result JSONB;
BEGIN
  -- Get and update short link
  UPDATE short_links 
  SET click_count = click_count + 1
  WHERE short_code = track_short_link_click.short_code
  AND is_active = true
  AND (expires_at IS NULL OR expires_at > NOW())
  RETURNING * INTO link_record;
  
  IF link_record.id IS NULL THEN
    RETURN jsonb_build_object('error', 'Short link not found or expired');
  END IF;
  
  result := jsonb_build_object(
    'redirect_url', link_record.original_url,
    'referral_id', link_record.referral_id,
    'title', link_record.title,
    'description', link_record.description
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
