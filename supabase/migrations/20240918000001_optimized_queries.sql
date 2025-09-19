-- Optimized Query Functions and Indexes
-- Creates RPC functions to eliminate N+1 problems and improve performance

-- =============================================
-- OPTIMIZED PRODUCT SEARCH FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION search_products_optimized(
  search_query TEXT DEFAULT '',
  category_ids INTEGER[] DEFAULT NULL,
  subcategory_ids INTEGER[] DEFAULT NULL,
  min_price DECIMAL DEFAULT NULL,
  max_price DECIMAL DEFAULT NULL,
  min_rating DECIMAL DEFAULT NULL,
  max_rating DECIMAL DEFAULT NULL,
  tags_filter TEXT[] DEFAULT NULL,
  file_types_filter TEXT[] DEFAULT NULL,
  status_filter TEXT[] DEFAULT ARRAY['active'],
  is_featured_filter BOOLEAN DEFAULT NULL,
  is_on_sale_filter BOOLEAN DEFAULT NULL,
  seller_id_filter UUID DEFAULT NULL,
  shop_id_filter UUID DEFAULT NULL,
  created_after TIMESTAMP DEFAULT NULL,
  created_before TIMESTAMP DEFAULT NULL,
  sort_by TEXT DEFAULT 'created_at',
  sort_order TEXT DEFAULT 'desc',
  limit_count INTEGER DEFAULT 20,
  offset_count INTEGER DEFAULT 0,
  include_facets BOOLEAN DEFAULT FALSE
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  result JSON;
  products_data JSON;
  facets_data JSON;
  total_count INTEGER;
BEGIN
  -- Build the main query with all relations
  WITH filtered_products AS (
    SELECT 
      p.*,
      u.name as seller_name,
      u.avatar_url as seller_avatar,
      s.name as shop_name,
      s.slug as shop_slug,
      s.logo_url as shop_logo,
      c.name as category_name,
      sc.name as subcategory_name,
      ps.views,
      ps.purchases,
      ps.revenue,
      ps.rating_average,
      ps.rating_count,
      ps.conversion_rate
    FROM products p
    LEFT JOIN users u ON p.seller_id = u.id
    LEFT JOIN shops s ON p.shop_id = s.id
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN categories sc ON p.subcategory_id = sc.id
    LEFT JOIN product_stats ps ON p.id = ps.product_id
    WHERE 
      (status_filter IS NULL OR p.status = ANY(status_filter))
      AND (category_ids IS NULL OR p.category_id = ANY(category_ids))
      AND (subcategory_ids IS NULL OR p.subcategory_id = ANY(subcategory_ids))
      AND (min_price IS NULL OR p.price >= min_price)
      AND (max_price IS NULL OR p.price <= max_price)
      AND (min_rating IS NULL OR ps.rating_average >= min_rating)
      AND (max_rating IS NULL OR ps.rating_average <= max_rating)
      AND (is_featured_filter IS NULL OR p.is_featured = is_featured_filter)
      AND (is_on_sale_filter IS NULL OR (p.sale_price IS NOT NULL) = is_on_sale_filter)
      AND (seller_id_filter IS NULL OR p.seller_id = seller_id_filter)
      AND (shop_id_filter IS NULL OR p.shop_id = shop_id_filter)
      AND (created_after IS NULL OR p.created_at >= created_after)
      AND (created_before IS NULL OR p.created_at <= created_before)
      AND (search_query = '' OR 
           to_tsvector('english', p.title || ' ' || p.description) @@ plainto_tsquery('english', search_query))
      AND (tags_filter IS NULL OR p.tags && tags_filter)
      AND (file_types_filter IS NULL OR EXISTS (
        SELECT 1 FROM product_files pf 
        WHERE pf.product_id = p.id AND pf.file_type = ANY(file_types_filter)
      ))
  ),
  products_with_files AS (
    SELECT 
      fp.*,
      COALESCE(
        json_agg(
          json_build_object(
            'id', pf.id,
            'filename', pf.filename,
            'file_url', pf.file_url,
            'file_size', pf.file_size,
            'file_type', pf.file_type,
            'is_primary', pf.is_primary
          )
        ) FILTER (WHERE pf.id IS NOT NULL), 
        '[]'::json
      ) as files,
      COALESCE(
        json_agg(
          json_build_object(
            'id', pi.id,
            'image_url', pi.image_url,
            'alt_text', pi.alt_text,
            'is_primary', pi.is_primary,
            'sort_order', pi.sort_order
          )
        ) FILTER (WHERE pi.id IS NOT NULL), 
        '[]'::json
      ) as images
    FROM filtered_products fp
    LEFT JOIN product_files pf ON fp.id = pf.product_id
    LEFT JOIN product_images pi ON fp.id = pi.product_id
    GROUP BY fp.id, fp.title, fp.description, fp.price, fp.seller_id, fp.shop_id, 
             fp.category_id, fp.subcategory_id, fp.created_at, fp.updated_at,
             fp.seller_name, fp.seller_avatar, fp.shop_name, fp.shop_slug, fp.shop_logo,
             fp.category_name, fp.subcategory_name, fp.views, fp.purchases, fp.revenue,
             fp.rating_average, fp.rating_count, fp.conversion_rate
  ),
  ordered_products AS (
    SELECT *,
           ROW_NUMBER() OVER (
             ORDER BY 
               CASE WHEN sort_by = 'created_at' AND sort_order = 'desc' THEN created_at END DESC,
               CASE WHEN sort_by = 'created_at' AND sort_order = 'asc' THEN created_at END ASC,
               CASE WHEN sort_by = 'price' AND sort_order = 'desc' THEN price END DESC,
               CASE WHEN sort_by = 'price' AND sort_order = 'asc' THEN price END ASC,
               CASE WHEN sort_by = 'rating' AND sort_order = 'desc' THEN rating_average END DESC,
               CASE WHEN sort_by = 'rating' AND sort_order = 'asc' THEN rating_average END ASC,
               CASE WHEN sort_by = 'popularity' AND sort_order = 'desc' THEN views END DESC,
               CASE WHEN sort_by = 'popularity' AND sort_order = 'asc' THEN views END ASC,
               created_at DESC
           ) as row_num
    FROM products_with_files
  )
  SELECT 
    json_build_object(
      'products', COALESCE(json_agg(
        json_build_object(
          'id', id,
          'title', title,
          'description', description,
          'price', price,
          'seller_name', seller_name,
          'shop_name', shop_name,
          'category_name', category_name,
          'files', files,
          'images', images,
          'stats', json_build_object(
            'views', views,
            'purchases', purchases,
            'rating_average', rating_average,
            'rating_count', rating_count
          )
        )
      ) FILTER (WHERE row_num > offset_count AND row_num <= offset_count + limit_count), '[]'::json),
      'total', (SELECT COUNT(*) FROM filtered_products),
      'facets', CASE WHEN include_facets THEN 
        json_build_object(
          'categories', (
            SELECT json_agg(json_build_object('id', c.id, 'name', c.name, 'count', category_counts.count))
            FROM categories c
            JOIN (
              SELECT category_id, COUNT(*) as count
              FROM filtered_products
              GROUP BY category_id
            ) category_counts ON c.id = category_counts.category_id
          ),
          'price_ranges', (
            SELECT json_agg(json_build_object('min', price_range.min_price, 'max', price_range.max_price, 'count', price_range.count))
            FROM (
              SELECT 
                FLOOR(price / 25) * 25 as min_price,
                FLOOR(price / 25) * 25 + 25 as max_price,
                COUNT(*) as count
              FROM filtered_products
              GROUP BY FLOOR(price / 25)
              ORDER BY min_price
            ) price_range
          )
        )
      ELSE '{}'::json END
    ) INTO result
  FROM ordered_products;

  RETURN result;
END;
$$;

-- =============================================
-- SELLER DASHBOARD DATA FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION get_seller_dashboard_data(
  seller_id UUID,
  period_days INTEGER DEFAULT 30
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  result JSON;
  start_date TIMESTAMP;
  prev_start_date TIMESTAMP;
BEGIN
  start_date := NOW() - (period_days || ' days')::INTERVAL;
  prev_start_date := start_date - (period_days || ' days')::INTERVAL;

  WITH current_period AS (
    SELECT 
      COUNT(DISTINCT pu.id) as total_orders,
      COALESCE(SUM(pa.amount), 0) as total_revenue,
      COUNT(DISTINCT pu.buyer_id) as unique_customers,
      COALESCE(AVG(pa.amount), 0) as avg_order_value
    FROM purchases pu
    JOIN products pr ON pu.product_id = pr.id
    JOIN payments pa ON pu.payment_id = pa.id
    WHERE pr.seller_id = get_seller_dashboard_data.seller_id
      AND pu.created_at >= start_date
      AND pa.status = 'succeeded'
  ),
  previous_period AS (
    SELECT 
      COUNT(DISTINCT pu.id) as total_orders,
      COALESCE(SUM(pa.amount), 0) as total_revenue
    FROM purchases pu
    JOIN products pr ON pu.product_id = pr.id
    JOIN payments pa ON pu.payment_id = pa.id
    WHERE pr.seller_id = get_seller_dashboard_data.seller_id
      AND pu.created_at >= prev_start_date
      AND pu.created_at < start_date
      AND pa.status = 'succeeded'
  ),
  top_products AS (
    SELECT 
      pr.id,
      pr.title,
      COUNT(pu.id) as sales_count,
      SUM(pa.amount) as revenue
    FROM products pr
    LEFT JOIN purchases pu ON pr.id = pu.product_id AND pu.created_at >= start_date
    LEFT JOIN payments pa ON pu.payment_id = pa.id AND pa.status = 'succeeded'
    WHERE pr.seller_id = get_seller_dashboard_data.seller_id
    GROUP BY pr.id, pr.title
    ORDER BY revenue DESC
    LIMIT 10
  )
  SELECT json_build_object(
    'current_period', row_to_json(cp),
    'previous_period', row_to_json(pp),
    'growth', json_build_object(
      'revenue_growth', CASE 
        WHEN pp.total_revenue > 0 THEN ((cp.total_revenue - pp.total_revenue) / pp.total_revenue * 100)
        ELSE 0 
      END,
      'orders_growth', CASE 
        WHEN pp.total_orders > 0 THEN ((cp.total_orders - pp.total_orders) / pp.total_orders * 100)
        ELSE 0 
      END
    ),
    'top_products', (SELECT json_agg(row_to_json(tp)) FROM top_products tp)
  ) INTO result
  FROM current_period cp, previous_period pp;

  RETURN result;
END;
$$;

-- =============================================
-- USER STATS FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION get_user_stats(user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  result JSON;
BEGIN
  WITH user_metrics AS (
    SELECT 
      COUNT(DISTINCT pu.id) as total_purchases,
      COALESCE(SUM(pa.amount), 0) as total_spent,
      COUNT(DISTINCT f.id) as total_favorites,
      COUNT(DISTINCT pd.id) as total_downloads,
      COALESCE(AVG(pa.amount), 0) as avg_order_value
    FROM users u
    LEFT JOIN purchases pu ON u.id = pu.buyer_id
    LEFT JOIN payments pa ON pu.payment_id = pa.id AND pa.status = 'succeeded'
    LEFT JOIN favorites f ON u.id = f.user_id
    LEFT JOIN product_downloads pd ON u.id = pd.user_id
    WHERE u.id = get_user_stats.user_id
  ),
  favorite_categories AS (
    SELECT 
      c.name as category_name,
      COUNT(*) as count
    FROM favorites f
    JOIN products p ON f.product_id = p.id
    JOIN categories c ON p.category_id = c.id
    WHERE f.user_id = get_user_stats.user_id
    GROUP BY c.id, c.name
    ORDER BY count DESC
    LIMIT 5
  )
  SELECT json_build_object(
    'total_purchases', um.total_purchases,
    'total_spent', um.total_spent,
    'total_favorites', um.total_favorites,
    'total_downloads', um.total_downloads,
    'avg_order_value', um.avg_order_value,
    'favorite_categories', (SELECT json_agg(row_to_json(fc)) FROM favorite_categories fc)
  ) INTO result
  FROM user_metrics um;

  RETURN result;
END;
$$;

-- =============================================
-- OPTIMIZED SHOP ANALYTICS FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION get_shop_analytics_optimized(
  shop_id UUID,
  period_days INTEGER DEFAULT 30
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  result JSON;
  start_date TIMESTAMP;
BEGIN
  start_date := NOW() - (period_days || ' days')::INTERVAL;

  WITH shop_metrics AS (
    SELECT 
      COUNT(DISTINCT pu.id) as total_orders,
      COALESCE(SUM(pa.amount), 0) as total_revenue,
      COUNT(DISTINCT pu.buyer_id) as unique_customers,
      COUNT(DISTINCT pr.id) as total_products,
      COALESCE(AVG(pa.amount), 0) as avg_order_value,
      COALESCE(SUM(CASE WHEN pa.status = 'refunded' THEN pa.amount ELSE 0 END), 0) as total_refunds
    FROM shops sh
    LEFT JOIN products pr ON sh.id = pr.shop_id
    LEFT JOIN purchases pu ON pr.id = pu.product_id AND pu.created_at >= start_date
    LEFT JOIN payments pa ON pu.payment_id = pa.id
    WHERE sh.id = get_shop_analytics_optimized.shop_id
  ),
  daily_revenue AS (
    SELECT 
      DATE(pu.created_at) as date,
      COUNT(pu.id) as orders,
      COALESCE(SUM(pa.amount), 0) as revenue
    FROM purchases pu
    JOIN products pr ON pu.product_id = pr.id
    JOIN payments pa ON pu.payment_id = pa.id
    WHERE pr.shop_id = get_shop_analytics_optimized.shop_id
      AND pu.created_at >= start_date
      AND pa.status = 'succeeded'
    GROUP BY DATE(pu.created_at)
    ORDER BY date
  ),
  top_products AS (
    SELECT 
      pr.id,
      pr.title,
      COUNT(pu.id) as sales_count,
      SUM(pa.amount) as revenue
    FROM products pr
    LEFT JOIN purchases pu ON pr.id = pu.product_id AND pu.created_at >= start_date
    LEFT JOIN payments pa ON pu.payment_id = pa.id AND pa.status = 'succeeded'
    WHERE pr.shop_id = get_shop_analytics_optimized.shop_id
    GROUP BY pr.id, pr.title
    ORDER BY revenue DESC
    LIMIT 10
  )
  SELECT json_build_object(
    'summary', row_to_json(sm),
    'daily_revenue', (SELECT json_agg(row_to_json(dr)) FROM daily_revenue dr),
    'top_products', (SELECT json_agg(row_to_json(tp)) FROM top_products tp)
  ) INTO result
  FROM shop_metrics sm;

  RETURN result;
END;
$$;

-- =============================================
-- BATCH UPDATE FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION batch_update_products(
  product_ids UUID[],
  update_data JSON,
  seller_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  updated_count INTEGER;
  result JSON;
BEGIN
  -- Update products with security check
  WITH updated AS (
    UPDATE products 
    SET 
      title = COALESCE((update_data->>'title')::TEXT, title),
      description = COALESCE((update_data->>'description')::TEXT, description),
      price = COALESCE((update_data->>'price')::DECIMAL, price),
      status = COALESCE((update_data->>'status')::TEXT, status),
      is_featured = COALESCE((update_data->>'is_featured')::BOOLEAN, is_featured),
      updated_at = NOW()
    WHERE id = ANY(product_ids)
      AND seller_id = batch_update_products.seller_id
    RETURNING id
  )
  SELECT COUNT(*) INTO updated_count FROM updated;

  SELECT json_build_object(
    'success', true,
    'updated_count', updated_count,
    'timestamp', NOW()
  ) INTO result;

  RETURN result;
END;
$$;

-- =============================================
-- PERFORMANCE MONITORING FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION get_query_performance_stats()
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  result JSON;
BEGIN
  WITH query_stats AS (
    SELECT 
      schemaname,
      tablename,
      attname,
      n_distinct,
      correlation
    FROM pg_stats 
    WHERE schemaname = 'public'
      AND tablename IN ('products', 'purchases', 'payments', 'shops', 'users')
  ),
  index_usage AS (
    SELECT 
      schemaname,
      tablename,
      indexname,
      idx_scan,
      idx_tup_read,
      idx_tup_fetch
    FROM pg_stat_user_indexes
    WHERE schemaname = 'public'
      AND tablename IN ('products', 'purchases', 'payments', 'shops', 'users')
  ),
  table_stats AS (
    SELECT 
      schemaname,
      tablename,
      n_tup_ins,
      n_tup_upd,
      n_tup_del,
      n_live_tup,
      n_dead_tup,
      last_vacuum,
      last_autovacuum,
      last_analyze,
      last_autoanalyze
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
      AND tablename IN ('products', 'purchases', 'payments', 'shops', 'users')
  )
  SELECT json_build_object(
    'query_stats', (SELECT json_agg(row_to_json(qs)) FROM query_stats qs),
    'index_usage', (SELECT json_agg(row_to_json(iu)) FROM index_usage iu),
    'table_stats', (SELECT json_agg(row_to_json(ts)) FROM table_stats ts),
    'generated_at', NOW()
  ) INTO result;

  RETURN result;
END;
$$;

-- =============================================
-- CACHE INVALIDATION TRIGGER
-- =============================================

CREATE OR REPLACE FUNCTION invalidate_cache_on_product_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- This would integrate with your cache invalidation system
  -- For now, we'll just log the change
  INSERT INTO cache_invalidation_log (table_name, record_id, action, created_at)
  VALUES (TG_TABLE_NAME, COALESCE(NEW.id, OLD.id), TG_OP, NOW());
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create cache invalidation log table
CREATE TABLE IF NOT EXISTS cache_invalidation_log (
  id SERIAL PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create triggers for cache invalidation
DROP TRIGGER IF EXISTS product_cache_invalidation ON products;
CREATE TRIGGER product_cache_invalidation
  AFTER INSERT OR UPDATE OR DELETE ON products
  FOR EACH ROW EXECUTE FUNCTION invalidate_cache_on_product_change();

DROP TRIGGER IF EXISTS purchase_cache_invalidation ON purchases;
CREATE TRIGGER purchase_cache_invalidation
  AFTER INSERT OR UPDATE OR DELETE ON purchases
  FOR EACH ROW EXECUTE FUNCTION invalidate_cache_on_product_change();

-- =============================================
-- MATERIALIZED VIEWS FOR ANALYTICS
-- =============================================

-- Product analytics materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_product_analytics AS
SELECT 
  p.id,
  p.title,
  p.seller_id,
  p.shop_id,
  p.category_id,
  p.price,
  COUNT(DISTINCT pu.id) as total_purchases,
  COUNT(DISTINCT pu.buyer_id) as unique_buyers,
  COALESCE(SUM(pa.amount), 0) as total_revenue,
  COALESCE(AVG(pa.amount), 0) as avg_order_value,
  COUNT(DISTINCT f.id) as favorites_count,
  COALESCE(AVG(r.rating), 0) as avg_rating,
  COUNT(r.id) as review_count,
  p.created_at
FROM products p
LEFT JOIN purchases pu ON p.id = pu.product_id
LEFT JOIN payments pa ON pu.payment_id = pa.id AND pa.status = 'succeeded'
LEFT JOIN favorites f ON p.id = f.product_id
LEFT JOIN reviews r ON p.id = r.product_id
WHERE p.status = 'active'
GROUP BY p.id, p.title, p.seller_id, p.shop_id, p.category_id, p.price, p.created_at;

-- Create unique index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_product_analytics_id ON mv_product_analytics(id);

-- Shop analytics materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_shop_analytics AS
SELECT 
  s.id,
  s.name,
  s.owner_id,
  COUNT(DISTINCT p.id) as total_products,
  COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'active') as active_products,
  COUNT(DISTINCT pu.id) as total_orders,
  COUNT(DISTINCT pu.buyer_id) as unique_customers,
  COALESCE(SUM(pa.amount), 0) as total_revenue,
  COALESCE(AVG(pa.amount), 0) as avg_order_value,
  s.created_at
FROM shops s
LEFT JOIN products p ON s.id = p.shop_id
LEFT JOIN purchases pu ON p.id = pu.product_id
LEFT JOIN payments pa ON pu.payment_id = pa.id AND pa.status = 'succeeded'
WHERE s.is_active = true
GROUP BY s.id, s.name, s.owner_id, s.created_at;

-- Create unique index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_shop_analytics_id ON mv_shop_analytics(id);

-- =============================================
-- REFRESH MATERIALIZED VIEWS FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_product_analytics;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_shop_analytics;
END;
$$;

-- Schedule materialized view refresh (would be called by cron job)
-- This should be run every hour or as needed based on data freshness requirements
