-- Seed data for initial setup

-- =============================================
-- CATEGORIES SEED DATA
-- =============================================

INSERT INTO categories (name, slug, description, sort_order) VALUES
('Digital Art', 'digital-art', 'Digital artwork, illustrations, and graphics', 1),
('Templates', 'templates', 'Website templates, document templates, and design templates', 2),
('Software', 'software', 'Applications, scripts, and software tools', 3),
('E-books', 'ebooks', 'Digital books, guides, and educational content', 4),
('Music & Audio', 'music-audio', 'Music tracks, sound effects, and audio content', 5),
('Video Content', 'video-content', 'Video tutorials, stock footage, and video content', 6),
('Photography', 'photography', 'Stock photos, image packs, and photography', 7),
('3D Models', '3d-models', '3D models, textures, and 3D assets', 8),
('Fonts & Typography', 'fonts-typography', 'Font files, typography, and text assets', 9),
('Icons & Graphics', 'icons-graphics', 'Icon sets, graphics, and visual elements', 10),
('Code & Scripts', 'code-scripts', 'Code snippets, scripts, and programming resources', 11),
('Gaming Assets', 'gaming-assets', 'Game assets, sprites, and gaming content', 12),
('Marketing Materials', 'marketing-materials', 'Marketing templates, banners, and promotional content', 13),
('Educational Content', 'educational-content', 'Courses, tutorials, and educational materials', 14),
('Other', 'other', 'Miscellaneous digital products', 15);

-- =============================================
-- SAMPLE USERS (for development)
-- =============================================

-- Note: In production, users will be created through Supabase Auth
-- These are sample users for development/testing purposes

-- Admin user
INSERT INTO users (id, email, name, role, is_active, email_verified_at) VALUES
('00000000-0000-0000-0000-000000000001', 'admin@marketplace.com', 'Admin User', 'admin', true, NOW());

-- Sample seller
INSERT INTO users (id, email, name, role, is_active, email_verified_at) VALUES
('00000000-0000-0000-0000-000000000002', 'seller@example.com', 'John Seller', 'seller', true, NOW());

-- Sample buyer
INSERT INTO users (id, email, name, role, is_active, email_verified_at) VALUES
('00000000-0000-0000-0000-000000000003', 'buyer@example.com', 'Jane Buyer', 'buyer', true, NOW());

-- Sample partner
INSERT INTO users (id, email, name, role, is_active, email_verified_at) VALUES
('00000000-0000-0000-0000-000000000004', 'partner@example.com', 'Mike Partner', 'partner', true, NOW());

-- =============================================
-- SAMPLE SHOPS
-- =============================================

INSERT INTO shops (id, owner_id, name, slug, description, is_active) VALUES
('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000002', 'Digital Design Studio', 'digital-design-studio', 'Professional digital design services and assets', true),
('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000002', 'Code Templates Hub', 'code-templates-hub', 'High-quality code templates and scripts', true);

-- =============================================
-- SAMPLE PRODUCTS
-- =============================================

INSERT INTO products (
  id, seller_id, shop_id, category_id, title, slug, description, 
  price, currency, file_url, file_name, file_size, file_type,
  thumbnail_url, status, is_featured, tags
) VALUES
(
  '00000000-0000-0000-0000-000000000201',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000101',
  1, -- Digital Art category
  'Modern Abstract Digital Art Pack',
  'modern-abstract-digital-art-pack',
  'A collection of 20 high-resolution abstract digital artworks perfect for modern design projects.',
  29.99,
  'USD',
  'https://example.com/files/abstract-art-pack.zip',
  'abstract-art-pack.zip',
  52428800, -- 50MB
  'application/zip',
  'https://example.com/thumbnails/abstract-art-thumb.jpg',
  'active',
  true,
  ARRAY['abstract', 'modern', 'digital-art', 'design']
),
(
  '00000000-0000-0000-0000-000000000202',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000101',
  2, -- Templates category
  'Professional Website Template',
  'professional-website-template',
  'A responsive HTML/CSS template perfect for business websites. Includes all necessary files and documentation.',
  49.99,
  'USD',
  'https://example.com/files/website-template.zip',
  'website-template.zip',
  10485760, -- 10MB
  'application/zip',
  'https://example.com/thumbnails/website-template-thumb.jpg',
  'active',
  true,
  ARRAY['website', 'template', 'html', 'css', 'responsive']
),
(
  '00000000-0000-0000-0000-000000000203',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000102',
  11, -- Code & Scripts category
  'React Component Library',
  'react-component-library',
  'A comprehensive library of reusable React components with TypeScript support.',
  79.99,
  'USD',
  'https://example.com/files/react-components.zip',
  'react-components.zip',
  20971520, -- 20MB
  'application/zip',
  'https://example.com/thumbnails/react-components-thumb.jpg',
  'active',
  false,
  ARRAY['react', 'typescript', 'components', 'library', 'frontend']
);

-- =============================================
-- SAMPLE REVIEWS
-- =============================================

INSERT INTO reviews (user_id, product_id, rating, title, content, status, is_verified) VALUES
(
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000201',
  5,
  'Amazing quality!',
  'The digital art pack exceeded my expectations. High quality and perfect for my projects.',
  'approved',
  true
),
(
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000202',
  4,
  'Great template',
  'Very well designed template. Easy to customize and looks professional.',
  'approved',
  true
);

-- =============================================
-- SAMPLE REFERRALS
-- =============================================

INSERT INTO referrals (referrer_id, product_id, referral_code, reward_type, reward_value, is_active) VALUES
(
  '00000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000201',
  'PARTNER_ART_001',
  'percentage',
  15.0,
  true
),
(
  '00000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000202',
  'PARTNER_TEMPLATE_001',
  'percentage',
  20.0,
  true
);

-- =============================================
-- SAMPLE NOTIFICATIONS
-- =============================================

INSERT INTO notifications (user_id, type, title, message, data) VALUES
(
  '00000000-0000-0000-0000-000000000002',
  'welcome',
  'Welcome to the Marketplace!',
  'Thank you for joining our marketplace. Start by creating your first product!',
  '{"action": "create_product"}'
),
(
  '00000000-0000-0000-0000-000000000003',
  'welcome',
  'Welcome to the Marketplace!',
  'Welcome! Browse our collection of digital products and find what you need.',
  '{"action": "browse_products"}'
);

-- =============================================
-- UPDATE PRODUCT RATINGS
-- =============================================

-- Update product ratings based on reviews
SELECT update_product_rating('00000000-0000-0000-0000-000000000201');
SELECT update_product_rating('00000000-0000-0000-0000-000000000202');
SELECT update_product_rating('00000000-0000-0000-0000-000000000203');
