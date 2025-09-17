-- Enhanced Review and Rating System Migration
-- This migration enhances the existing review system with advanced features

-- Create review moderation status enum
CREATE TYPE review_moderation_status AS ENUM ('pending', 'approved', 'rejected', 'flagged', 'spam');

-- Create review vote type enum
CREATE TYPE review_vote_type AS ENUM ('helpful', 'unhelpful', 'spam', 'fake');

-- Create incentive type enum
CREATE TYPE incentive_type AS ENUM ('points', 'discount', 'cashback', 'badge');

-- Create ML detection status enum
CREATE TYPE ml_detection_status AS ENUM ('pending', 'clean', 'suspicious', 'fake', 'error');

-- Extend the existing reviews table with new columns
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS moderation_status review_moderation_status DEFAULT 'pending';
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS moderation_notes TEXT;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS moderated_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS unhelpful_count INTEGER DEFAULT 0;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS spam_count INTEGER DEFAULT 0;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS fake_count INTEGER DEFAULT 0;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS ml_score DECIMAL(5,4);
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS ml_status ml_detection_status DEFAULT 'pending';
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS ml_analysis JSONB DEFAULT '{}';
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS response_count INTEGER DEFAULT 0;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS edit_count INTEGER DEFAULT 0;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS last_edited_at TIMESTAMP WITH TIME ZONE;

-- Create review votes table for helpful/unhelpful voting
CREATE TABLE review_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vote_type review_vote_type NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(review_id, user_id)
);

-- Create seller responses to reviews table
CREATE TABLE review_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  response_text TEXT NOT NULL,
  is_public BOOLEAN DEFAULT true,
  is_edited BOOLEAN DEFAULT false,
  edit_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create review moderation queue table
CREATE TABLE review_moderation_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  priority INTEGER DEFAULT 1 CHECK (priority >= 1 AND priority <= 5),
  reason TEXT NOT NULL,
  reporter_id UUID REFERENCES users(id) ON DELETE SET NULL,
  moderator_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status review_moderation_status DEFAULT 'pending',
  notes TEXT,
  auto_flagged BOOLEAN DEFAULT false,
  ml_confidence DECIMAL(5,4),
  assigned_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create review incentives table
CREATE TABLE review_incentives (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  incentive_type incentive_type NOT NULL,
  incentive_value DECIMAL(10,2) NOT NULL,
  minimum_rating INTEGER CHECK (minimum_rating >= 1 AND minimum_rating <= 5),
  minimum_words INTEGER DEFAULT 10,
  requires_verification BOOLEAN DEFAULT true,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create review incentive claims table
CREATE TABLE review_incentive_claims (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incentive_id UUID NOT NULL REFERENCES review_incentives(id) ON DELETE CASCADE,
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  claimed_value DECIMAL(10,2) NOT NULL,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected', 'expired')) DEFAULT 'pending',
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(incentive_id, review_id)
);

-- Create ML detection features table
CREATE TABLE review_ml_features (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  features JSONB NOT NULL,
  model_version TEXT NOT NULL,
  confidence_score DECIMAL(5,4) NOT NULL,
  predictions JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create review analytics table
CREATE TABLE review_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  total_reviews INTEGER DEFAULT 0,
  verified_reviews INTEGER DEFAULT 0,
  average_rating DECIMAL(3,2) DEFAULT 0,
  rating_distribution JSONB DEFAULT '{}',
  helpful_votes INTEGER DEFAULT 0,
  unhelpful_votes INTEGER DEFAULT 0,
  response_rate DECIMAL(5,2) DEFAULT 0,
  sentiment_score DECIMAL(5,4),
  sentiment_distribution JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(product_id, period_start, period_end)
);

-- Create review edit history table
CREATE TABLE review_edit_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  previous_title TEXT,
  previous_content TEXT,
  previous_rating INTEGER,
  edit_reason TEXT,
  edited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_reviews_moderation_status ON reviews(moderation_status);
CREATE INDEX idx_reviews_ml_status ON reviews(ml_status);
CREATE INDEX idx_reviews_product_verified ON reviews(product_id, is_verified);
CREATE INDEX idx_review_votes_review_type ON review_votes(review_id, vote_type);
CREATE INDEX idx_review_moderation_queue_status ON review_moderation_queue(status);
CREATE INDEX idx_review_moderation_queue_priority ON review_moderation_queue(priority DESC);
CREATE INDEX idx_review_incentives_product_active ON review_incentives(product_id, is_active);
CREATE INDEX idx_review_analytics_product_period ON review_analytics(product_id, period_start);

-- Create function to update review vote counts
CREATE OR REPLACE FUNCTION update_review_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    CASE NEW.vote_type
      WHEN 'helpful' THEN
        UPDATE reviews SET helpful_count = helpful_count + 1 WHERE id = NEW.review_id;
      WHEN 'unhelpful' THEN
        UPDATE reviews SET unhelpful_count = unhelpful_count + 1 WHERE id = NEW.review_id;
      WHEN 'spam' THEN
        UPDATE reviews SET spam_count = spam_count + 1 WHERE id = NEW.review_id;
      WHEN 'fake' THEN
        UPDATE reviews SET fake_count = fake_count + 1 WHERE id = NEW.review_id;
    END CASE;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle vote type changes
    IF OLD.vote_type != NEW.vote_type THEN
      -- Decrease old vote count
      CASE OLD.vote_type
        WHEN 'helpful' THEN
          UPDATE reviews SET helpful_count = helpful_count - 1 WHERE id = OLD.review_id;
        WHEN 'unhelpful' THEN
          UPDATE reviews SET unhelpful_count = unhelpful_count - 1 WHERE id = OLD.review_id;
        WHEN 'spam' THEN
          UPDATE reviews SET spam_count = spam_count - 1 WHERE id = OLD.review_id;
        WHEN 'fake' THEN
          UPDATE reviews SET fake_count = fake_count - 1 WHERE id = OLD.review_id;
      END CASE;
      -- Increase new vote count
      CASE NEW.vote_type
        WHEN 'helpful' THEN
          UPDATE reviews SET helpful_count = helpful_count + 1 WHERE id = NEW.review_id;
        WHEN 'unhelpful' THEN
          UPDATE reviews SET unhelpful_count = unhelpful_count + 1 WHERE id = NEW.review_id;
        WHEN 'spam' THEN
          UPDATE reviews SET spam_count = spam_count + 1 WHERE id = NEW.review_id;
        WHEN 'fake' THEN
          UPDATE reviews SET fake_count = fake_count + 1 WHERE id = NEW.review_id;
      END CASE;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    CASE OLD.vote_type
      WHEN 'helpful' THEN
        UPDATE reviews SET helpful_count = helpful_count - 1 WHERE id = OLD.review_id;
      WHEN 'unhelpful' THEN
        UPDATE reviews SET unhelpful_count = unhelpful_count - 1 WHERE id = OLD.review_id;
      WHEN 'spam' THEN
        UPDATE reviews SET spam_count = spam_count - 1 WHERE id = OLD.review_id;
      WHEN 'fake' THEN
        UPDATE reviews SET fake_count = fake_count - 1 WHERE id = OLD.review_id;
    END CASE;
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for vote count updates
CREATE TRIGGER update_review_vote_counts_trigger
  AFTER INSERT OR UPDATE OR DELETE ON review_votes
  FOR EACH ROW EXECUTE FUNCTION update_review_vote_counts();

-- Create function to update seller response counts
CREATE OR REPLACE FUNCTION update_review_response_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE reviews SET response_count = response_count + 1 WHERE id = NEW.review_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE reviews SET response_count = response_count - 1 WHERE id = OLD.review_id;
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for response count updates
CREATE TRIGGER update_review_response_counts_trigger
  AFTER INSERT OR DELETE ON review_responses
  FOR EACH ROW EXECUTE FUNCTION update_review_response_counts();

-- Create function to calculate weighted review scores
CREATE OR REPLACE FUNCTION calculate_weighted_rating(product_id_param UUID)
RETURNS DECIMAL(3,2) AS $$
DECLARE
  weighted_score DECIMAL(10,4) := 0;
  total_weight DECIMAL(10,4) := 0;
  review_record RECORD;
BEGIN
  -- Calculate weighted average based on multiple factors
  FOR review_record IN
    SELECT 
      r.rating,
      r.is_verified,
      r.helpful_count,
      r.unhelpful_count,
      r.created_at,
      EXTRACT(DAYS FROM NOW() - r.created_at) as days_old
    FROM reviews r
    WHERE r.product_id = product_id_param
      AND r.status = 'approved'
      AND r.moderation_status = 'approved'
  LOOP
    DECLARE
      base_weight DECIMAL(10,4) := 1.0;
      verification_multiplier DECIMAL(3,2) := CASE WHEN review_record.is_verified THEN 1.5 ELSE 1.0 END;
      helpfulness_ratio DECIMAL(10,4);
      helpfulness_multiplier DECIMAL(3,2);
      recency_multiplier DECIMAL(3,2);
      final_weight DECIMAL(10,4);
    BEGIN
      -- Calculate helpfulness multiplier
      IF (review_record.helpful_count + review_record.unhelpful_count) > 0 THEN
        helpfulness_ratio := review_record.helpful_count::DECIMAL / (review_record.helpful_count + review_record.unhelpful_count);
        helpfulness_multiplier := 0.5 + (helpfulness_ratio * 1.5); -- Range: 0.5 to 2.0
      ELSE
        helpfulness_multiplier := 1.0;
      END IF;

      -- Calculate recency multiplier (newer reviews get slight boost)
      recency_multiplier := GREATEST(0.5, 1.0 - (review_record.days_old / 365.0 * 0.3));

      -- Calculate final weight
      final_weight := base_weight * verification_multiplier * helpfulness_multiplier * recency_multiplier;

      weighted_score := weighted_score + (review_record.rating * final_weight);
      total_weight := total_weight + final_weight;
    END;
  END LOOP;

  IF total_weight > 0 THEN
    RETURN ROUND(weighted_score / total_weight, 2);
  ELSE
    RETURN 0;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create function to update product rating when reviews change
CREATE OR REPLACE FUNCTION update_product_rating()
RETURNS TRIGGER AS $$
DECLARE
  product_id_to_update UUID;
  new_rating DECIMAL(3,2);
  review_count INTEGER;
BEGIN
  -- Determine which product to update
  IF TG_OP = 'DELETE' THEN
    product_id_to_update := OLD.product_id;
  ELSE
    product_id_to_update := NEW.product_id;
  END IF;

  -- Calculate new weighted rating
  new_rating := calculate_weighted_rating(product_id_to_update);

  -- Count approved reviews
  SELECT COUNT(*) INTO review_count
  FROM reviews
  WHERE product_id = product_id_to_update
    AND status = 'approved'
    AND moderation_status = 'approved';

  -- Update product
  UPDATE products
  SET 
    rating_average = new_rating,
    rating_count = review_count,
    updated_at = NOW()
  WHERE id = product_id_to_update;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update product rating
CREATE TRIGGER update_product_rating_trigger
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_product_rating();

-- Create function to auto-flag suspicious reviews
CREATE OR REPLACE FUNCTION auto_flag_suspicious_reviews()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-flag reviews that meet suspicious criteria
  IF NEW.ml_score IS NOT NULL AND NEW.ml_score > 0.7 THEN
    INSERT INTO review_moderation_queue (
      review_id,
      priority,
      reason,
      auto_flagged,
      ml_confidence
    ) VALUES (
      NEW.id,
      3,
      'Auto-flagged by ML system for suspicious activity',
      true,
      NEW.ml_score
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-flagging
CREATE TRIGGER auto_flag_suspicious_reviews_trigger
  AFTER INSERT OR UPDATE OF ml_score ON reviews
  FOR EACH ROW EXECUTE FUNCTION auto_flag_suspicious_reviews();

-- Add updated_at triggers for new tables
CREATE TRIGGER update_review_votes_updated_at BEFORE UPDATE ON review_votes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_review_responses_updated_at BEFORE UPDATE ON review_responses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_review_moderation_queue_updated_at BEFORE UPDATE ON review_moderation_queue FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_review_incentives_updated_at BEFORE UPDATE ON review_incentives FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_review_analytics_updated_at BEFORE UPDATE ON review_analytics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default review incentive for all active products
INSERT INTO review_incentives (product_id, incentive_type, incentive_value, minimum_rating, created_by)
SELECT 
  p.id,
  'points',
  10.0,
  4,
  p.seller_id
FROM products p
WHERE p.status = 'active'
ON CONFLICT DO NOTHING;
