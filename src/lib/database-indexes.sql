-- Database Indexes for Query Optimization
-- Creates indexes for foreign key columns and frequently queried fields

-- =============================================
-- PRODUCTS TABLE INDEXES
-- =============================================

-- Foreign key indexes
CREATE INDEX IF NOT EXISTS idx_products_seller_id ON products(seller_id);
CREATE INDEX IF NOT EXISTS idx_products_shop_id ON products(shop_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_subcategory_id ON products(subcategory_id);

-- Query optimization indexes
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_is_featured ON products(is_featured);
CREATE INDEX IF NOT EXISTS idx_products_is_digital ON products(is_digital);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at);
CREATE INDEX IF NOT EXISTS idx_products_updated_at ON products(updated_at);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_products_status_category ON products(status, category_id);
CREATE INDEX IF NOT EXISTS idx_products_status_featured ON products(status, is_featured);
CREATE INDEX IF NOT EXISTS idx_products_shop_status ON products(shop_id, status);
CREATE INDEX IF NOT EXISTS idx_products_seller_status ON products(seller_id, status);
CREATE INDEX IF NOT EXISTS idx_products_price_range ON products(price, status) WHERE status = 'active';

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_products_search ON products USING gin(to_tsvector('english', title || ' ' || description));

-- =============================================
-- PURCHASES TABLE INDEXES
-- =============================================

-- Foreign key indexes
CREATE INDEX IF NOT EXISTS idx_purchases_buyer_id ON purchases(buyer_id);
CREATE INDEX IF NOT EXISTS idx_purchases_product_id ON purchases(product_id);
CREATE INDEX IF NOT EXISTS idx_purchases_payment_id ON purchases(payment_id);

-- Query optimization indexes
CREATE INDEX IF NOT EXISTS idx_purchases_created_at ON purchases(created_at);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(status);

-- Composite indexes for dashboard queries
CREATE INDEX IF NOT EXISTS idx_purchases_buyer_created ON purchases(buyer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchases_product_created ON purchases(product_id, created_at DESC);

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_purchases_created_at_status ON purchases(created_at, status);

-- =============================================
-- PAYMENTS TABLE INDEXES
-- =============================================

-- Foreign key indexes
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);

-- Query optimization indexes
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_provider ON payments(provider);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);
CREATE INDEX IF NOT EXISTS idx_payments_external_id ON payments(external_id);

-- Composite indexes
CREATE INDEX IF NOT EXISTS idx_payments_user_status ON payments(user_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_status_created ON payments(status, created_at);

-- =============================================
-- SHOPS TABLE INDEXES
-- =============================================

-- Foreign key indexes
CREATE INDEX IF NOT EXISTS idx_shops_owner_id ON shops(owner_id);

-- Query optimization indexes
CREATE INDEX IF NOT EXISTS idx_shops_slug ON shops(slug) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_shops_is_active ON shops(is_active);
CREATE INDEX IF NOT EXISTS idx_shops_created_at ON shops(created_at);

-- Composite indexes
CREATE INDEX IF NOT EXISTS idx_shops_owner_active ON shops(owner_id, is_active);

-- =============================================
-- FAVORITES TABLE INDEXES
-- =============================================

-- Foreign key indexes
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_product_id ON favorites(product_id);

-- Composite indexes
CREATE INDEX IF NOT EXISTS idx_favorites_user_created ON favorites(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_favorites_product_created ON favorites(product_id, created_at DESC);

-- =============================================
-- REVIEWS TABLE INDEXES
-- =============================================

-- Foreign key indexes
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);

-- Query optimization indexes
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at);
CREATE INDEX IF NOT EXISTS idx_reviews_is_verified ON reviews(is_verified);

-- Composite indexes
CREATE INDEX IF NOT EXISTS idx_reviews_product_rating ON reviews(product_id, rating, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_user_created ON reviews(user_id, created_at DESC);

-- =============================================
-- REFERRALS TABLE INDEXES
-- =============================================

-- Foreign key indexes
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_product_id ON referrals(product_id);

-- Query optimization indexes
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_created_at ON referrals(created_at);

-- Composite indexes
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_created ON referrals(referrer_id, created_at DESC);

-- =============================================
-- PRODUCT FILES/IMAGES INDEXES
-- =============================================

-- Foreign key indexes
CREATE INDEX IF NOT EXISTS idx_product_files_product_id ON product_files(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);

-- Query optimization indexes
CREATE INDEX IF NOT EXISTS idx_product_files_is_primary ON product_files(is_primary);
CREATE INDEX IF NOT EXISTS idx_product_images_is_primary ON product_images(is_primary);
CREATE INDEX IF NOT EXISTS idx_product_images_sort_order ON product_images(sort_order);

-- =============================================
-- ANALYTICS TABLES INDEXES
-- =============================================

-- Product stats indexes
CREATE INDEX IF NOT EXISTS idx_product_stats_product_id ON product_stats(product_id);
CREATE INDEX IF NOT EXISTS idx_product_stats_updated_at ON product_stats(updated_at);

-- Shop stats indexes
CREATE INDEX IF NOT EXISTS idx_shop_stats_shop_id ON shop_stats(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_stats_updated_at ON shop_stats(updated_at);

-- User sessions indexes
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_status ON user_sessions(status);
CREATE INDEX IF NOT EXISTS idx_user_sessions_created_at ON user_sessions(created_at);

-- =============================================
-- NOTIFICATION INDEXES
-- =============================================

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- Composite indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC) WHERE is_read = false;

-- =============================================
-- SECURITY AND AUDIT INDEXES
-- =============================================

-- Security events indexes
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_event_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events(created_at);
CREATE INDEX IF NOT EXISTS idx_security_events_ip_address ON security_events(ip_address);

-- Audit logs indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- =============================================
-- PERFORMANCE OPTIMIZATION INDEXES
-- =============================================

-- Partial indexes for active records only
CREATE INDEX IF NOT EXISTS idx_products_active_price ON products(price) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_products_active_featured ON products(is_featured, created_at DESC) WHERE status = 'active' AND is_featured = true;
CREATE INDEX IF NOT EXISTS idx_shops_active_created ON shops(created_at DESC) WHERE is_active = true;

-- Covering indexes for common queries
CREATE INDEX IF NOT EXISTS idx_products_listing_cover ON products(status, category_id, price, created_at) 
  INCLUDE (title, thumbnail_url, seller_id, shop_id);

CREATE INDEX IF NOT EXISTS idx_purchases_dashboard_cover ON purchases(buyer_id, created_at) 
  INCLUDE (product_id, payment_id, status);

-- =============================================
-- STATISTICS UPDATE
-- =============================================

-- Update table statistics for better query planning
ANALYZE products;
ANALYZE purchases;
ANALYZE payments;
ANALYZE shops;
ANALYZE users;
ANALYZE favorites;
ANALYZE reviews;
ANALYZE referrals;
ANALYZE product_files;
ANALYZE product_images;
ANALYZE product_stats;
ANALYZE shop_stats;
