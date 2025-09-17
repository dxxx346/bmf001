-- Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- =============================================
-- USERS TABLE POLICIES
-- =============================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Users can insert their own profile (for registration)
CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Admins can view all users
CREATE POLICY "Admins can view all users" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update all users
CREATE POLICY "Admins can update all users" ON users
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- SHOPS TABLE POLICIES
-- =============================================

-- Anyone can view active shops
CREATE POLICY "Anyone can view active shops" ON shops
  FOR SELECT USING (is_active = true);

-- Shop owners can view their own shops
CREATE POLICY "Shop owners can view own shops" ON shops
  FOR SELECT USING (auth.uid() = owner_id);

-- Shop owners can insert shops
CREATE POLICY "Users can create shops" ON shops
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Shop owners can update their own shops
CREATE POLICY "Shop owners can update own shops" ON shops
  FOR UPDATE USING (auth.uid() = owner_id);

-- Shop owners can delete their own shops
CREATE POLICY "Shop owners can delete own shops" ON shops
  FOR DELETE USING (auth.uid() = owner_id);

-- Admins can manage all shops
CREATE POLICY "Admins can manage all shops" ON shops
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- CATEGORIES TABLE POLICIES
-- =============================================

-- Anyone can view active categories
CREATE POLICY "Anyone can view active categories" ON categories
  FOR SELECT USING (is_active = true);

-- Admins can manage categories
CREATE POLICY "Admins can manage categories" ON categories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- PRODUCTS TABLE POLICIES
-- =============================================

-- Anyone can view active products
CREATE POLICY "Anyone can view active products" ON products
  FOR SELECT USING (status = 'active');

-- Product owners can view their own products
CREATE POLICY "Product owners can view own products" ON products
  FOR SELECT USING (auth.uid() = seller_id);

-- Product owners can insert products
CREATE POLICY "Sellers can create products" ON products
  FOR INSERT WITH CHECK (
    auth.uid() = seller_id AND
    EXISTS (
      SELECT 1 FROM shops 
      WHERE id = shop_id AND owner_id = auth.uid()
    )
  );

-- Product owners can update their own products
CREATE POLICY "Product owners can update own products" ON products
  FOR UPDATE USING (auth.uid() = seller_id);

-- Product owners can delete their own products
CREATE POLICY "Product owners can delete own products" ON products
  FOR DELETE USING (auth.uid() = seller_id);

-- Admins can manage all products
CREATE POLICY "Admins can manage all products" ON products
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- PAYMENTS TABLE POLICIES
-- =============================================

-- Users can view their own payments
CREATE POLICY "Users can view own payments" ON payments
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own payments
CREATE POLICY "Users can create payments" ON payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own payments (limited fields)
CREATE POLICY "Users can update own payments" ON payments
  FOR UPDATE USING (auth.uid() = user_id);

-- Admins can view all payments
CREATE POLICY "Admins can view all payments" ON payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- PURCHASES TABLE POLICIES
-- =============================================

-- Buyers can view their own purchases
CREATE POLICY "Buyers can view own purchases" ON purchases
  FOR SELECT USING (auth.uid() = buyer_id);

-- System can insert purchases (via service role)
CREATE POLICY "System can create purchases" ON purchases
  FOR INSERT WITH CHECK (true);

-- Buyers can update their own purchases (limited fields)
CREATE POLICY "Buyers can update own purchases" ON purchases
  FOR UPDATE USING (auth.uid() = buyer_id);

-- Product owners can view purchases of their products
CREATE POLICY "Product owners can view product purchases" ON purchases
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM products 
      WHERE id = product_id AND seller_id = auth.uid()
    )
  );

-- Admins can view all purchases
CREATE POLICY "Admins can view all purchases" ON purchases
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- CART ITEMS TABLE POLICIES
-- =============================================

-- Users can manage their own cart items
CREATE POLICY "Users can manage own cart items" ON cart_items
  FOR ALL USING (auth.uid() = user_id);

-- =============================================
-- FAVORITES TABLE POLICIES
-- =============================================

-- Users can manage their own favorites
CREATE POLICY "Users can manage own favorites" ON favorites
  FOR ALL USING (auth.uid() = user_id);

-- =============================================
-- REVIEWS TABLE POLICIES
-- =============================================

-- Anyone can view approved reviews
CREATE POLICY "Anyone can view approved reviews" ON reviews
  FOR SELECT USING (status = 'approved');

-- Users can view their own reviews
CREATE POLICY "Users can view own reviews" ON reviews
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create reviews for products they purchased
CREATE POLICY "Users can create reviews for purchased products" ON reviews
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM purchases 
      WHERE product_id = reviews.product_id 
      AND buyer_id = auth.uid() 
      AND is_active = true
    )
  );

-- Users can update their own reviews
CREATE POLICY "Users can update own reviews" ON reviews
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own reviews
CREATE POLICY "Users can delete own reviews" ON reviews
  FOR DELETE USING (auth.uid() = user_id);

-- Product owners can view reviews of their products
CREATE POLICY "Product owners can view product reviews" ON reviews
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM products 
      WHERE id = product_id AND seller_id = auth.uid()
    )
  );

-- Admins can manage all reviews
CREATE POLICY "Admins can manage all reviews" ON reviews
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- REFERRALS TABLE POLICIES
-- =============================================

-- Users can view their own referrals
CREATE POLICY "Users can view own referrals" ON referrals
  FOR SELECT USING (auth.uid() = referrer_id);

-- Users can create referrals
CREATE POLICY "Users can create referrals" ON referrals
  FOR INSERT WITH CHECK (auth.uid() = referrer_id);

-- Users can update their own referrals
CREATE POLICY "Users can update own referrals" ON referrals
  FOR UPDATE USING (auth.uid() = referrer_id);

-- Users can delete their own referrals
CREATE POLICY "Users can delete own referrals" ON referrals
  FOR DELETE USING (auth.uid() = referrer_id);

-- Anyone can view active referrals (for tracking)
CREATE POLICY "Anyone can view active referrals" ON referrals
  FOR SELECT USING (is_active = true);

-- Admins can manage all referrals
CREATE POLICY "Admins can manage all referrals" ON referrals
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- REFERRAL STATS TABLE POLICIES
-- =============================================

-- Referral owners can view their stats
CREATE POLICY "Referral owners can view stats" ON referral_stats
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM referrals 
      WHERE id = referral_id AND referrer_id = auth.uid()
    )
  );

-- System can update referral stats
CREATE POLICY "System can update referral stats" ON referral_stats
  FOR ALL USING (true);

-- Admins can view all referral stats
CREATE POLICY "Admins can view all referral stats" ON referral_stats
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- REFERRAL CLICKS TABLE POLICIES
-- =============================================

-- Anyone can insert referral clicks (for tracking)
CREATE POLICY "Anyone can create referral clicks" ON referral_clicks
  FOR INSERT WITH CHECK (true);

-- Referral owners can view their clicks
CREATE POLICY "Referral owners can view clicks" ON referral_clicks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM referrals 
      WHERE id = referral_id AND referrer_id = auth.uid()
    )
  );

-- Admins can view all referral clicks
CREATE POLICY "Admins can view all referral clicks" ON referral_clicks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- USER SESSIONS TABLE POLICIES
-- =============================================

-- Users can view their own sessions
CREATE POLICY "Users can view own sessions" ON user_sessions
  FOR SELECT USING (auth.uid() = user_id);

-- System can manage sessions
CREATE POLICY "System can manage sessions" ON user_sessions
  FOR ALL USING (true);

-- Admins can view all sessions
CREATE POLICY "Admins can view all sessions" ON user_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- PRODUCT VIEWS TABLE POLICIES
-- =============================================

-- Anyone can create product views (for analytics)
CREATE POLICY "Anyone can create product views" ON product_views
  FOR INSERT WITH CHECK (true);

-- Product owners can view views of their products
CREATE POLICY "Product owners can view product views" ON product_views
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM products 
      WHERE id = product_id AND seller_id = auth.uid()
    )
  );

-- Users can view their own product views
CREATE POLICY "Users can view own product views" ON product_views
  FOR SELECT USING (auth.uid() = user_id);

-- Admins can view all product views
CREATE POLICY "Admins can view all product views" ON product_views
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- NOTIFICATIONS TABLE POLICIES
-- =============================================

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own notifications
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- System can create notifications
CREATE POLICY "System can create notifications" ON notifications
  FOR INSERT WITH CHECK (true);

-- Admins can view all notifications
CREATE POLICY "Admins can view all notifications" ON notifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
