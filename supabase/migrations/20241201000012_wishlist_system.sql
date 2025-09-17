-- Custom product lists for wishlist functionality
-- Migration: 20241201000012_wishlist_system.sql

-- Product lists table (custom lists created by users)
CREATE TABLE product_lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  is_default BOOLEAN DEFAULT false,
  color TEXT DEFAULT '#3B82F6', -- Hex color for UI theming
  icon TEXT DEFAULT 'heart', -- Icon identifier for UI
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_user_list_name UNIQUE(user_id, name),
  CONSTRAINT valid_color CHECK (color ~ '^#[0-9A-Fa-f]{6}$')
);

-- Product list items (many-to-many relationship between lists and products)
CREATE TABLE product_list_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  list_id UUID NOT NULL REFERENCES product_lists(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT, -- User notes about why they added this product
  priority INTEGER DEFAULT 0, -- For ordering within the list
  UNIQUE(list_id, product_id)
);

-- Indexes for better performance
CREATE INDEX idx_product_lists_user_id ON product_lists(user_id);
CREATE INDEX idx_product_lists_is_public ON product_lists(is_public) WHERE is_public = true;
CREATE INDEX idx_product_list_items_list_id ON product_list_items(list_id);
CREATE INDEX idx_product_list_items_product_id ON product_list_items(product_id);
CREATE INDEX idx_product_list_items_added_at ON product_list_items(added_at);

-- RLS Policies for product_lists
ALTER TABLE product_lists ENABLE ROW LEVEL SECURITY;

-- Users can view their own lists and public lists
CREATE POLICY "Users can view own lists and public lists" ON product_lists
  FOR SELECT USING (
    user_id = auth.uid() OR 
    is_public = true
  );

-- Users can only create their own lists
CREATE POLICY "Users can create own lists" ON product_lists
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can only update their own lists
CREATE POLICY "Users can update own lists" ON product_lists
  FOR UPDATE USING (user_id = auth.uid());

-- Users can only delete their own lists
CREATE POLICY "Users can delete own lists" ON product_lists
  FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for product_list_items
ALTER TABLE product_list_items ENABLE ROW LEVEL SECURITY;

-- Users can view items in their own lists and public lists
CREATE POLICY "Users can view items in accessible lists" ON product_list_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM product_lists 
      WHERE product_lists.id = product_list_items.list_id 
      AND (product_lists.user_id = auth.uid() OR product_lists.is_public = true)
    )
  );

-- Users can only add items to their own lists
CREATE POLICY "Users can add items to own lists" ON product_list_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM product_lists 
      WHERE product_lists.id = product_list_items.list_id 
      AND product_lists.user_id = auth.uid()
    )
  );

-- Users can only update items in their own lists
CREATE POLICY "Users can update items in own lists" ON product_list_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM product_lists 
      WHERE product_lists.id = product_list_items.list_id 
      AND product_lists.user_id = auth.uid()
    )
  );

-- Users can only delete items from their own lists
CREATE POLICY "Users can delete items from own lists" ON product_list_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM product_lists 
      WHERE product_lists.id = product_list_items.list_id 
      AND product_lists.user_id = auth.uid()
    )
  );

-- Function to automatically create a default "Favorites" list for new users
CREATE OR REPLACE FUNCTION create_default_favorites_list()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO product_lists (user_id, name, description, is_default, color, icon)
  VALUES (
    NEW.id,
    'Favorites',
    'My favorite products',
    true,
    '#EF4444',
    'heart'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create default favorites list for new users
CREATE TRIGGER create_default_favorites_list_trigger
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_favorites_list();

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_product_lists_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updating updated_at on product_lists
CREATE TRIGGER update_product_lists_updated_at_trigger
  BEFORE UPDATE ON product_lists
  FOR EACH ROW
  EXECUTE FUNCTION update_product_lists_updated_at();

-- Function to get list stats (item count, etc.)
CREATE OR REPLACE FUNCTION get_list_stats(list_id UUID)
RETURNS TABLE(
  item_count BIGINT,
  total_value NUMERIC,
  last_added TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(pli.id)::BIGINT as item_count,
    COALESCE(SUM(p.price), 0) as total_value,
    MAX(pli.added_at) as last_added
  FROM product_list_items pli
  LEFT JOIN products p ON p.id = pli.product_id
  WHERE pli.list_id = $1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if a product is in user's favorites (default list)
CREATE OR REPLACE FUNCTION is_product_favorited(user_id UUID, product_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  favorites_list_id UUID;
  is_favorited BOOLEAN DEFAULT false;
BEGIN
  -- Get the user's default favorites list
  SELECT id INTO favorites_list_id
  FROM product_lists
  WHERE product_lists.user_id = $1 AND is_default = true
  LIMIT 1;
  
  IF favorites_list_id IS NOT NULL THEN
    -- Check if product exists in favorites list
    SELECT EXISTS(
      SELECT 1 FROM product_list_items
      WHERE list_id = favorites_list_id AND product_list_items.product_id = $2
    ) INTO is_favorited;
  END IF;
  
  RETURN is_favorited;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to toggle product favorite status
CREATE OR REPLACE FUNCTION toggle_product_favorite(user_id UUID, product_id UUID)
RETURNS TABLE(
  is_favorited BOOLEAN,
  list_id UUID
) AS $$
DECLARE
  favorites_list_id UUID;
  current_favorite BOOLEAN;
BEGIN
  -- Get the user's default favorites list
  SELECT id INTO favorites_list_id
  FROM product_lists
  WHERE product_lists.user_id = $1 AND is_default = true
  LIMIT 1;
  
  -- If no default list exists, create one
  IF favorites_list_id IS NULL THEN
    INSERT INTO product_lists (user_id, name, description, is_default, color, icon)
    VALUES ($1, 'Favorites', 'My favorite products', true, '#EF4444', 'heart')
    RETURNING id INTO favorites_list_id;
  END IF;
  
  -- Check current favorite status
  SELECT EXISTS(
    SELECT 1 FROM product_list_items
    WHERE list_id = favorites_list_id AND product_list_items.product_id = $2
  ) INTO current_favorite;
  
  IF current_favorite THEN
    -- Remove from favorites
    DELETE FROM product_list_items
    WHERE list_id = favorites_list_id AND product_list_items.product_id = $2;
    
    RETURN QUERY SELECT false::BOOLEAN, favorites_list_id;
  ELSE
    -- Add to favorites
    INSERT INTO product_list_items (list_id, product_id)
    VALUES (favorites_list_id, $2)
    ON CONFLICT (list_id, product_id) DO NOTHING;
    
    RETURN QUERY SELECT true::BOOLEAN, favorites_list_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments for documentation
COMMENT ON TABLE product_lists IS 'Custom product lists created by users (wishlists, collections, etc.)';
COMMENT ON TABLE product_list_items IS 'Items within product lists (many-to-many relationship)';
COMMENT ON COLUMN product_lists.is_default IS 'Indicates if this is the default favorites list for the user';
COMMENT ON COLUMN product_lists.is_public IS 'Whether the list is publicly viewable';
COMMENT ON COLUMN product_lists.color IS 'Hex color code for UI theming';
COMMENT ON COLUMN product_lists.icon IS 'Icon identifier for UI display';
COMMENT ON COLUMN product_list_items.priority IS 'Sort order within the list (higher = more important)';
COMMENT ON COLUMN product_list_items.notes IS 'User notes about why they added this product';
