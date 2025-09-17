-- Database functions for business logic and analytics

-- =============================================
-- PRODUCT FUNCTIONS
-- =============================================

-- Function to increment product view count
CREATE OR REPLACE FUNCTION increment_product_views(product_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE products 
  SET view_count = view_count + 1 
  WHERE id = product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment product download count
CREATE OR REPLACE FUNCTION increment_product_downloads(product_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE products 
  SET download_count = download_count + 1 
  WHERE id = product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update product rating
CREATE OR REPLACE FUNCTION update_product_rating(product_id UUID)
RETURNS VOID AS $$
DECLARE
  avg_rating DECIMAL(3,2);
  rating_count INTEGER;
BEGIN
  SELECT 
    COALESCE(AVG(rating), 0),
    COUNT(*)
  INTO avg_rating, rating_count
  FROM reviews 
  WHERE product_id = product_id AND status = 'approved';
  
  UPDATE products 
  SET 
    rating_average = avg_rating,
    rating_count = rating_count
  WHERE id = product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get product statistics
CREATE OR REPLACE FUNCTION get_product_stats(product_id UUID)
RETURNS TABLE (
  total_views BIGINT,
  total_downloads BIGINT,
  total_purchases BIGINT,
  total_revenue DECIMAL(10,2),
  average_rating DECIMAL(3,2),
  total_reviews BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.view_count,
    p.download_count,
    COUNT(pr.id) as total_purchases,
    COALESCE(SUM(pr.amount), 0) as total_revenue,
    p.rating_average,
    p.rating_count
  FROM products p
  LEFT JOIN purchases pr ON p.id = pr.product_id AND pr.is_active = true
  WHERE p.id = product_id
  GROUP BY p.id, p.view_count, p.download_count, p.rating_average, p.rating_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- REFERRAL FUNCTIONS
-- =============================================

-- Function to increment referral clicks
CREATE OR REPLACE FUNCTION increment_referral_clicks(referral_id UUID, visitor_ip TEXT DEFAULT NULL, user_agent TEXT DEFAULT NULL, referrer_url TEXT DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
  -- Insert click record
  INSERT INTO referral_clicks (referral_id, visitor_ip, user_agent, referrer_url)
  VALUES (referral_id, visitor_ip, user_agent, referrer_url);
  
  -- Update stats
  UPDATE referral_stats 
  SET 
    click_count = click_count + 1,
    last_click_at = NOW(),
    updated_at = NOW()
  WHERE referral_stats.referral_id = increment_referral_clicks.referral_id;
  
  -- Create stats record if it doesn't exist
  INSERT INTO referral_stats (referral_id, click_count, updated_at)
  VALUES (referral_id, 1, NOW())
  ON CONFLICT (referral_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to process referral conversion
CREATE OR REPLACE FUNCTION process_referral_conversion(referral_id UUID, purchase_id UUID)
RETURNS DECIMAL(10,2) AS $$
DECLARE
  referral_record RECORD;
  purchase_record RECORD;
  reward_amount DECIMAL(10,2);
BEGIN
  -- Get referral details
  SELECT * INTO referral_record FROM referrals WHERE id = referral_id;
  
  -- Get purchase details
  SELECT * INTO purchase_record FROM purchases WHERE id = purchase_id;
  
  -- Calculate reward amount
  IF referral_record.reward_type = 'percentage' THEN
    reward_amount := purchase_record.amount * (referral_record.reward_value / 100);
  ELSE
    reward_amount := referral_record.reward_value;
  END IF;
  
  -- Update referral stats
  UPDATE referral_stats 
  SET 
    conversion_count = conversion_count + 1,
    total_earned = total_earned + reward_amount,
    last_conversion_at = NOW(),
    updated_at = NOW()
  WHERE referral_stats.referral_id = process_referral_conversion.referral_id;
  
  -- Create stats record if it doesn't exist
  INSERT INTO referral_stats (referral_id, conversion_count, total_earned, updated_at)
  VALUES (referral_id, 1, reward_amount, NOW())
  ON CONFLICT (referral_id) DO UPDATE SET
    conversion_count = referral_stats.conversion_count + 1,
    total_earned = referral_stats.total_earned + reward_amount,
    last_conversion_at = NOW(),
    updated_at = NOW();
  
  RETURN reward_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- ANALYTICS FUNCTIONS
-- =============================================

-- Function to get shop analytics
CREATE OR REPLACE FUNCTION get_shop_analytics(shop_id UUID, start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL, end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL)
RETURNS TABLE (
  total_products BIGINT,
  total_sales BIGINT,
  total_revenue DECIMAL(10,2),
  total_views BIGINT,
  average_rating DECIMAL(3,2),
  total_reviews BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT p.id) as total_products,
    COUNT(DISTINCT pr.id) as total_sales,
    COALESCE(SUM(pr.amount), 0) as total_revenue,
    COALESCE(SUM(p.view_count), 0) as total_views,
    COALESCE(AVG(p.rating_average), 0) as average_rating,
    COALESCE(SUM(p.rating_count), 0) as total_reviews
  FROM products p
  LEFT JOIN purchases pr ON p.id = pr.product_id AND pr.is_active = true
  WHERE p.shop_id = shop_analytics.shop_id
  AND (start_date IS NULL OR p.created_at >= start_date)
  AND (end_date IS NULL OR p.created_at <= end_date);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user analytics
CREATE OR REPLACE FUNCTION get_user_analytics(user_id UUID, start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL, end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL)
RETURNS TABLE (
  total_purchases BIGINT,
  total_spent DECIMAL(10,2),
  total_products_created BIGINT,
  total_sales BIGINT,
  total_earned DECIMAL(10,2),
  total_referral_earnings DECIMAL(10,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT pr.id) as total_purchases,
    COALESCE(SUM(pr.amount), 0) as total_spent,
    COUNT(DISTINCT p.id) as total_products_created,
    COUNT(DISTINCT pr2.id) as total_sales,
    COALESCE(SUM(pr2.amount), 0) as total_earned,
    COALESCE(SUM(rs.total_earned), 0) as total_referral_earnings
  FROM users u
  LEFT JOIN purchases pr ON u.id = pr.buyer_id AND pr.is_active = true
  LEFT JOIN products p ON u.id = p.seller_id
  LEFT JOIN purchases pr2 ON p.id = pr2.product_id AND pr2.is_active = true
  LEFT JOIN referrals r ON u.id = r.referrer_id
  LEFT JOIN referral_stats rs ON r.id = rs.referral_id
  WHERE u.id = user_analytics.user_id
  AND (start_date IS NULL OR pr.created_at >= start_date)
  AND (end_date IS NULL OR pr.created_at <= end_date);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- SEARCH FUNCTIONS
-- =============================================

-- Function to search products
CREATE OR REPLACE FUNCTION search_products(
  search_query TEXT DEFAULT '',
  category_id INTEGER DEFAULT NULL,
  min_price DECIMAL DEFAULT NULL,
  max_price DECIMAL DEFAULT NULL,
  sort_by TEXT DEFAULT 'created_at',
  sort_order TEXT DEFAULT 'desc',
  limit_count INTEGER DEFAULT 20,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  price DECIMAL(10,2),
  sale_price DECIMAL(10,2),
  thumbnail_url TEXT,
  rating_average DECIMAL(3,2),
  rating_count INTEGER,
  shop_name TEXT,
  category_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.title,
    p.description,
    p.price,
    p.sale_price,
    p.thumbnail_url,
    p.rating_average,
    p.rating_count,
    s.name as shop_name,
    c.name as category_name,
    p.created_at
  FROM products p
  JOIN shops s ON p.shop_id = s.id
  LEFT JOIN categories c ON p.category_id = c.id
  WHERE p.status = 'active'
  AND s.is_active = true
  AND (search_query = '' OR to_tsvector('english', p.title || ' ' || COALESCE(p.description, '')) @@ plainto_tsquery('english', search_query))
  AND (category_id IS NULL OR p.category_id = category_id)
  AND (min_price IS NULL OR p.price >= min_price)
  AND (max_price IS NULL OR p.price <= max_price)
  ORDER BY 
    CASE WHEN sort_by = 'price' AND sort_order = 'asc' THEN p.price END ASC,
    CASE WHEN sort_by = 'price' AND sort_order = 'desc' THEN p.price END DESC,
    CASE WHEN sort_by = 'rating' AND sort_order = 'asc' THEN p.rating_average END ASC,
    CASE WHEN sort_by = 'rating' AND sort_order = 'desc' THEN p.rating_average END DESC,
    CASE WHEN sort_by = 'created_at' AND sort_order = 'asc' THEN p.created_at END ASC,
    CASE WHEN sort_by = 'created_at' AND sort_order = 'desc' THEN p.created_at END DESC
  LIMIT limit_count OFFSET offset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- NOTIFICATION FUNCTIONS
-- =============================================

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
  user_id UUID,
  notification_type TEXT,
  title TEXT,
  message TEXT DEFAULT NULL,
  data JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (user_id, notification_type, title, message, data)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(notification_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE notifications 
  SET 
    is_read = true,
    read_at = NOW()
  WHERE id = notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- CART FUNCTIONS
-- =============================================

-- Function to add item to cart
CREATE OR REPLACE FUNCTION add_to_cart(user_id UUID, product_id UUID, quantity INTEGER DEFAULT 1)
RETURNS VOID AS $$
BEGIN
  INSERT INTO cart_items (user_id, product_id, quantity)
  VALUES (user_id, product_id, quantity)
  ON CONFLICT (user_id, product_id) 
  DO UPDATE SET 
    quantity = cart_items.quantity + quantity,
    added_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to remove item from cart
CREATE OR REPLACE FUNCTION remove_from_cart(user_id UUID, product_id UUID)
RETURNS VOID AS $$
BEGIN
  DELETE FROM cart_items 
  WHERE user_id = remove_from_cart.user_id AND product_id = remove_from_cart.product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clear cart
CREATE OR REPLACE FUNCTION clear_cart(user_id UUID)
RETURNS VOID AS $$
BEGIN
  DELETE FROM cart_items WHERE user_id = clear_cart.user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- PURCHASE FUNCTIONS
-- =============================================

-- Function to create purchase
CREATE OR REPLACE FUNCTION create_purchase(
  buyer_id UUID,
  product_id UUID,
  payment_id UUID,
  amount DECIMAL(10,2),
  currency TEXT DEFAULT 'USD'
)
RETURNS UUID AS $$
DECLARE
  purchase_id UUID;
  seller_id UUID;
BEGIN
  -- Get seller ID
  SELECT seller_id INTO seller_id FROM products WHERE id = product_id;
  
  -- Create purchase
  INSERT INTO purchases (buyer_id, product_id, payment_id, amount, currency)
  VALUES (buyer_id, product_id, payment_id, amount, currency)
  RETURNING id INTO purchase_id;
  
  -- Increment product download count
  PERFORM increment_product_downloads(product_id);
  
  -- Create notification for seller
  PERFORM create_notification(
    seller_id,
    'sale',
    'New Sale!',
    'You have a new sale for ' || (SELECT title FROM products WHERE id = product_id),
    json_build_object('purchase_id', purchase_id, 'product_id', product_id)
  );
  
  RETURN purchase_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- PRODUCT STATS FUNCTIONS
-- =============================================

-- Function to increment download count for product stats
CREATE OR REPLACE FUNCTION increment_download_count(product_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE product_stats 
  SET download_count = download_count + 1,
      last_updated = NOW()
  WHERE product_stats.product_id = increment_download_count.product_id;
  
  -- Insert if doesn't exist
  INSERT INTO product_stats (product_id, download_count, last_updated)
  VALUES (increment_download_count.product_id, 1, NOW())
  ON CONFLICT (product_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- REFERRAL STATS FUNCTIONS
-- =============================================

-- Function to update referral stats
CREATE OR REPLACE FUNCTION update_referral_stats(referral_id UUID, commission_amount DECIMAL)
RETURNS VOID AS $$
BEGIN
  UPDATE referral_stats 
  SET purchase_count = purchase_count + 1,
      total_earned = total_earned + commission_amount,
      updated_at = NOW()
  WHERE referral_stats.referral_id = update_referral_stats.referral_id;
  
  -- Insert if doesn't exist
  INSERT INTO referral_stats (referral_id, purchase_count, total_earned, updated_at)
  VALUES (update_referral_stats.referral_id, 1, commission_amount, NOW())
  ON CONFLICT (referral_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
