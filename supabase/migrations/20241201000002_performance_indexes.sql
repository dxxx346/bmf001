-- Performance indexes for frequently queried columns

-- Users table indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Shops table indexes
CREATE INDEX idx_shops_owner_id ON shops(owner_id);
CREATE INDEX idx_shops_slug ON shops(slug);
CREATE INDEX idx_shops_is_active ON shops(is_active);
CREATE INDEX idx_shops_created_at ON shops(created_at);

-- Categories table indexes
CREATE INDEX idx_categories_parent_id ON categories(parent_id);
CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_is_active ON categories(is_active);
CREATE INDEX idx_categories_sort_order ON categories(sort_order);

-- Products table indexes
CREATE INDEX idx_products_seller_id ON products(seller_id);
CREATE INDEX idx_products_shop_id ON products(shop_id);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_price ON products(price);
CREATE INDEX idx_products_is_featured ON products(is_featured);
CREATE INDEX idx_products_rating_average ON products(rating_average);
CREATE INDEX idx_products_created_at ON products(created_at);
CREATE INDEX idx_products_updated_at ON products(updated_at);
CREATE INDEX idx_products_tags ON products USING GIN(tags);
CREATE INDEX idx_products_shop_slug ON products(shop_id, slug);

-- Composite indexes for common queries
CREATE INDEX idx_products_shop_status ON products(shop_id, status);
CREATE INDEX idx_products_category_status ON products(category_id, status);
CREATE INDEX idx_products_featured_status ON products(is_featured, status);
CREATE INDEX idx_products_rating_count ON products(rating_average, rating_count);

-- Payments table indexes
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_provider ON payments(provider);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_external_id ON payments(external_id);
CREATE INDEX idx_payments_created_at ON payments(created_at);
CREATE INDEX idx_payments_processed_at ON payments(processed_at);

-- Purchases table indexes
CREATE INDEX idx_purchases_buyer_id ON purchases(buyer_id);
CREATE INDEX idx_purchases_product_id ON purchases(product_id);
CREATE INDEX idx_purchases_payment_id ON purchases(payment_id);
CREATE INDEX idx_purchases_created_at ON purchases(created_at);
CREATE INDEX idx_purchases_is_active ON purchases(is_active);
CREATE INDEX idx_purchases_expires_at ON purchases(expires_at);

-- Composite indexes for purchases
CREATE INDEX idx_purchases_buyer_active ON purchases(buyer_id, is_active);
CREATE INDEX idx_purchases_product_buyer ON purchases(product_id, buyer_id);

-- Cart items table indexes
CREATE INDEX idx_cart_items_user_id ON cart_items(user_id);
CREATE INDEX idx_cart_items_product_id ON cart_items(product_id);
CREATE INDEX idx_cart_items_added_at ON cart_items(added_at);

-- Favorites table indexes
CREATE INDEX idx_favorites_user_id ON favorites(user_id);
CREATE INDEX idx_favorites_product_id ON favorites(product_id);
CREATE INDEX idx_favorites_created_at ON favorites(created_at);

-- Reviews table indexes
CREATE INDEX idx_reviews_user_id ON reviews(user_id);
CREATE INDEX idx_reviews_product_id ON reviews(product_id);
CREATE INDEX idx_reviews_purchase_id ON reviews(purchase_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);
CREATE INDEX idx_reviews_status ON reviews(status);
CREATE INDEX idx_reviews_is_verified ON reviews(is_verified);
CREATE INDEX idx_reviews_created_at ON reviews(created_at);

-- Composite indexes for reviews
CREATE INDEX idx_reviews_product_status ON reviews(product_id, status);
CREATE INDEX idx_reviews_product_rating ON reviews(product_id, rating);

-- Referrals table indexes
CREATE INDEX idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX idx_referrals_product_id ON referrals(product_id);
CREATE INDEX idx_referrals_shop_id ON referrals(shop_id);
CREATE INDEX idx_referrals_referral_code ON referrals(referral_code);
CREATE INDEX idx_referrals_is_active ON referrals(is_active);
CREATE INDEX idx_referrals_expires_at ON referrals(expires_at);

-- Referral stats table indexes
CREATE INDEX idx_referral_stats_referral_id ON referral_stats(referral_id);
CREATE INDEX idx_referral_stats_updated_at ON referral_stats(updated_at);

-- Referral clicks table indexes
CREATE INDEX idx_referral_clicks_referral_id ON referral_clicks(referral_id);
CREATE INDEX idx_referral_clicks_clicked_at ON referral_clicks(clicked_at);

-- User sessions table indexes
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_session_id ON user_sessions(session_id);
CREATE INDEX idx_user_sessions_is_active ON user_sessions(is_active);
CREATE INDEX idx_user_sessions_started_at ON user_sessions(started_at);

-- Product views table indexes
CREATE INDEX idx_product_views_product_id ON product_views(product_id);
CREATE INDEX idx_product_views_user_id ON product_views(user_id);
CREATE INDEX idx_product_views_viewed_at ON product_views(viewed_at);

-- Composite indexes for analytics
CREATE INDEX idx_product_views_product_date ON product_views(product_id, viewed_at);
CREATE INDEX idx_product_views_user_date ON product_views(user_id, viewed_at);

-- Notifications table indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- Composite indexes for notifications
CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_user_type ON notifications(user_id, type);

-- Full-text search indexes
CREATE INDEX idx_products_title_search ON products USING GIN(to_tsvector('english', title));
CREATE INDEX idx_products_description_search ON products USING GIN(to_tsvector('english', description));
CREATE INDEX idx_shops_name_search ON shops USING GIN(to_tsvector('english', name));
CREATE INDEX idx_shops_description_search ON shops USING GIN(to_tsvector('english', description));

-- Partial indexes for active records
CREATE INDEX idx_products_active ON products(id) WHERE status = 'active';
CREATE INDEX idx_shops_active ON shops(id) WHERE is_active = true;
CREATE INDEX idx_users_active ON users(id) WHERE is_active = true;
CREATE INDEX idx_purchases_active ON purchases(id) WHERE is_active = true;
