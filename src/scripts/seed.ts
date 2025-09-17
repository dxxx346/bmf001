import { faker } from '@faker-js/faker';
import { createServiceClient } from '@/lib/supabase';
import { logError } from '@/lib/logger';
import { defaultLogger as logger } from '@/lib/logger';
import { SeedConfig, defaultConfig, devConfig, testConfig } from './seed-config';

// Set faker locale for consistent results
faker.setDefaultRefDate('2024-01-01T00:00:00.000Z');

// Get configuration based on environment
const getConfig = (): SeedConfig => {
  const env = process.env.NODE_ENV || 'development';
  switch (env) {
    case 'test':
      return testConfig;
    case 'development':
      return devConfig;
    default:
      return defaultConfig;
  }
};

const config = getConfig();

class DatabaseSeeder {
  private supabase = createServiceClient();
  private userIds: string[] = [];
  private shopIds: string[] = [];
  private productIds: string[] = [];
  private categoryIds: number[] = [];

  async seed(): Promise<void> {
    try {
      logger.info('🌱 Starting database seeding...');

      // Clear existing data (in reverse order of dependencies)
      await this.clearData();

      // Seed in order of dependencies
      await this.seedCategories();
      await this.seedUsers();
      await this.seedShops();
      await this.seedProducts();
      await this.seedPurchases();
      await this.seedReviews();
      await this.seedReferrals();
      await this.seedNotifications();

      logger.info('✅ Database seeding completed successfully!');
    } catch (error) {
      logError(error as Error, { action: 'database_seeding' });
      throw error;
    }
  }

  async seedSpecificTables(tables: string[]): Promise<void> {
    try {
      logger.info('🌱 Starting partial database seeding...', { tables });

      const seedMethods: Record<string, () => Promise<void>> = {
        categories: () => this.seedCategories(),
        users: () => this.seedUsers(),
        shops: () => this.seedShops(),
        products: () => this.seedProducts(),
        purchases: () => this.seedPurchases(),
        reviews: () => this.seedReviews(),
        referrals: () => this.seedReferrals(),
        notifications: () => this.seedNotifications(),
      };

      // Seed tables in dependency order
      const orderedTables = ['categories', 'users', 'shops', 'products', 'purchases', 'reviews', 'referrals', 'notifications'];
      const tablesToSeed = orderedTables.filter(table => tables.includes(table));

      for (const table of tablesToSeed) {
        if (seedMethods[table]) {
          await seedMethods[table]();
        } else {
          logger.info(`⚠️ Unknown table: ${table}`);
        }
      }

      logger.info('✅ Partial database seeding completed successfully!');
    } catch (error) {
      logError(error as Error, { action: 'partial_database_seeding', tables });
      throw error;
    }
  }

  async clearData(): Promise<void> {
    logger.info('🧹 Clearing existing data...');

    const tables = [
      'notifications',
      'referral_clicks',
      'referral_stats',
      'referrals',
      'reviews',
      'purchases',
      'cart_items',
      'favorites',
      'product_views',
      'user_sessions',
      'products',
      'shops',
      'users',
      'categories',
    ];

    for (const table of tables) {
      const { error } = await this.supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) {
        logError(error as Error, { table, action: 'clear_data' });
      }
    }
  }


  private async seedCategories(): Promise<void> {
    logger.info('📂 Seeding categories...');

    const categories = [
      { name: 'Digital Art', slug: 'digital-art', description: 'Digital artwork, illustrations, and graphics' },
      { name: 'Templates', slug: 'templates', description: 'Website templates, document templates, and design templates' },
      { name: 'Software', slug: 'software', description: 'Applications, scripts, and software tools' },
      { name: 'E-books', slug: 'ebooks', description: 'Digital books, guides, and educational content' },
      { name: 'Music & Audio', slug: 'music-audio', description: 'Music tracks, sound effects, and audio content' },
      { name: 'Video Content', slug: 'video-content', description: 'Video tutorials, stock footage, and video content' },
      { name: 'Photography', slug: 'photography', description: 'Stock photos, image packs, and photography' },
      { name: '3D Models', slug: '3d-models', description: '3D models, textures, and 3D assets' },
      { name: 'Fonts & Typography', slug: 'fonts-typography', description: 'Font files, typography, and text assets' },
      { name: 'Icons & Graphics', slug: 'icons-graphics', description: 'Icon sets, graphics, and visual elements' },
      { name: 'Code & Scripts', slug: 'code-scripts', description: 'Code snippets, scripts, and programming resources' },
      { name: 'Gaming Assets', slug: 'gaming-assets', description: 'Game assets, sprites, and gaming content' },
      { name: 'Marketing Materials', slug: 'marketing-materials', description: 'Marketing templates, banners, and promotional content' },
      { name: 'Educational Content', slug: 'educational-content', description: 'Courses, tutorials, and educational materials' },
      { name: 'Other', slug: 'other', description: 'Miscellaneous digital products' },
    ];

    const { data, error } = await this.supabase
      .from('categories')
      .insert(categories)
      .select('id');

    if (error) {
      logError(error as Error, { action: 'seed_categories' });
      throw error;
    }

    this.categoryIds = data.map(cat => cat.id);
    logger.info(`✅ Created ${categories.length} categories`);
  }

  private async seedUsers(): Promise<void> {
    logger.info('👥 Seeding users...');

    const users: Array<{
      email: string;
      name: string;
      role: string;
      is_active: boolean;
      email_verified_at: string | null;
      last_login_at: string;
    }> = [];

    // Create admins
    for (let i = 0; i < config.users.admins; i++) {
      users.push({
        email: `admin${i + 1}@marketplace.com`,
        name: faker.person.fullName(),
        role: 'admin',
        is_active: true,
        email_verified_at: faker.date.past().toISOString(),
        last_login_at: faker.date.recent().toISOString(),
      });
    }

    // Create sellers
    for (let i = 0; i < config.users.sellers; i++) {
      users.push({
        email: faker.internet.email(),
        name: faker.person.fullName(),
        role: 'seller',
        is_active: true,
        email_verified_at: faker.date.past().toISOString(),
        last_login_at: faker.date.recent().toISOString(),
      });
    }

    // Create partners
    for (let i = 0; i < config.users.partners; i++) {
      users.push({
        email: faker.internet.email(),
        name: faker.person.fullName(),
        role: 'partner',
        is_active: true,
        email_verified_at: faker.date.past().toISOString(),
        last_login_at: faker.date.recent().toISOString(),
      });
    }

    // Create buyers
    for (let i = 0; i < config.users.buyers; i++) {
      users.push({
        email: faker.internet.email(),
        name: faker.person.fullName(),
        role: 'buyer',
        is_active: faker.datatype.boolean(0.9), // 90% active
        email_verified_at: faker.datatype.boolean(0.8) ? faker.date.past().toISOString() : null,
        last_login_at: faker.date.recent().toISOString(),
      });
    }

    const { data, error } = await this.supabase
      .from('users')
      .insert(users)
      .select('id, role');

    if (error) {
      logError(error as Error, { action: 'seed_users' });
      throw error;
    }

    this.userIds = data.map(user => user.id);
    logger.info(`✅ Created ${users.length} users`);
  }

  private async seedShops(): Promise<void> {
    logger.info('🏪 Seeding shops...');

    // Get seller IDs from the users we just created
    const { data: userData } = await this.supabase
      .from('users')
      .select('id, role')
      .eq('role', 'seller');

    const sellerIds = userData?.map(user => user.id) || [];

    const shops: Array<any> = [];
    for (let i = 0; i < config.shops; i++) {
      const sellerId = faker.helpers.arrayElement(sellerIds);
      const shopName = faker.company.name();
      
      shops.push({
        owner_id: sellerId,
        name: shopName,
        slug: faker.helpers.slugify(shopName).toLowerCase(),
        description: faker.lorem.paragraph(),
        logo_url: faker.image.url({ width: 200, height: 200 }),
        banner_url: faker.image.url({ width: 1200, height: 400 }),
        website_url: faker.internet.url(),
        contact_email: faker.internet.email(),
        is_active: faker.datatype.boolean(0.9),
        settings: {
          theme: faker.helpers.arrayElement(['light', 'dark', 'auto']),
          currency: faker.helpers.arrayElement(['USD', 'EUR', 'GBP', 'CAD']),
          language: faker.helpers.arrayElement(['en', 'es', 'fr', 'de']),
        },
      });
    }

    const { data, error } = await this.supabase
      .from('shops')
      .insert(shops)
      .select('id');

    if (error) {
      logError(error as Error, { action: 'seed_shops' });
      throw error;
    }

    this.shopIds = data.map(shop => shop.id);
    logger.info(`✅ Created ${shops.length} shops`);
  }

  private async seedProducts(): Promise<void> {
    logger.info('📦 Seeding products...');

    const products: Array<any> = [];
    for (let i = 0; i < config.products; i++) {
      const shopId = faker.helpers.arrayElement(this.shopIds);
      const categoryId = faker.helpers.arrayElement(this.categoryIds);
      const title = faker.commerce.productName();
      const price = parseFloat(faker.commerce.price({ min: 5, max: 500, dec: 2 }));
      const salePrice = faker.datatype.boolean(0.3) ? parseFloat(faker.commerce.price({ min: 1, max: price * 0.8, dec: 2 })) : null;

      products.push({
        seller_id: faker.helpers.arrayElement(this.userIds),
        shop_id: shopId,
        category_id: categoryId,
        title,
        slug: faker.helpers.slugify(title).toLowerCase(),
        description: faker.lorem.paragraphs(3),
        short_description: faker.lorem.sentence(),
        price,
        sale_price: salePrice,
        currency: faker.helpers.arrayElement(['USD', 'EUR', 'GBP', 'CAD']),
        file_url: `https://example.com/files/${faker.helpers.slugify(title)}.zip`,
        file_name: `${faker.helpers.slugify(title)}.zip`,
        file_size: faker.number.int({ min: 1024, max: 104857600 }), // 1KB to 100MB
        file_type: faker.helpers.arrayElement(['application/zip', 'application/pdf', 'image/jpeg', 'video/mp4']),
        thumbnail_url: faker.image.url({ width: 400, height: 300 }),
        gallery_urls: Array.from({ length: faker.number.int({ min: 1, max: 5 }) }, () => faker.image.url({ width: 800, height: 600 })),
        tags: faker.helpers.arrayElements([
          'premium', 'design', 'modern', 'creative', 'professional', 'template', 'digital', 'art', 'graphic', 'ui', 'ux', 'web', 'mobile', 'responsive', 'clean', 'minimal', 'colorful', 'abstract', 'vintage', 'contemporary'
        ], { min: 2, max: 6 }),
        status: faker.helpers.arrayElement(['draft', 'active', 'inactive']),
        is_featured: faker.datatype.boolean(0.2),
        download_count: faker.number.int({ min: 0, max: 1000 }),
        view_count: faker.number.int({ min: 0, max: 5000 }),
        rating_average: parseFloat(faker.number.float({ min: 1, max: 5, fractionDigits: 2 }).toString()),
        rating_count: faker.number.int({ min: 0, max: 100 }),
        metadata: {
          version: faker.system.semver(),
          compatibility: faker.helpers.arrayElements(['Windows', 'Mac', 'Linux', 'iOS', 'Android']),
          license: faker.helpers.arrayElement(['Commercial', 'Personal', 'Extended']),
          support: faker.datatype.boolean(0.7),
        },
      });
    }

    const { data, error } = await this.supabase
      .from('products')
      .insert(products)
      .select('id');

    if (error) {
      logError(error as Error, { action: 'seed_products' });
      throw error;
    }

    this.productIds = data.map(product => product.id);
    logger.info(`✅ Created ${products.length} products`);
  }

  private async seedPurchases(): Promise<void> {
    logger.info('💳 Seeding purchases...');

    const purchases: Array<any> = [];
    for (let i = 0; i < config.purchases; i++) {
      const buyerId = faker.helpers.arrayElement(this.userIds);
      const productId = faker.helpers.arrayElement(this.productIds);
      const amount = parseFloat(faker.commerce.price({ min: 5, max: 500, dec: 2 }));

      purchases.push({
        buyer_id: buyerId,
        product_id: productId,
        amount,
        currency: faker.helpers.arrayElement(['USD', 'EUR', 'GBP', 'CAD']),
        download_count: faker.number.int({ min: 0, max: 5 }),
        last_downloaded_at: faker.datatype.boolean(0.8) ? faker.date.recent().toISOString() : null,
        expires_at: faker.date.future({ years: 1 }).toISOString(),
        is_active: faker.datatype.boolean(0.95),
      });
    }

    const { error } = await this.supabase
      .from('purchases')
      .insert(purchases);

    if (error) {
      logError(error as Error, { action: 'seed_purchases' });
      throw error;
    }

    logger.info(`✅ Created ${purchases.length} purchases`);
  }

  private async seedReviews(): Promise<void> {
    logger.info('⭐ Seeding reviews...');

    const reviews: Array<any> = [];
    for (let i = 0; i < config.reviews; i++) {
      const userId = faker.helpers.arrayElement(this.userIds);
      const productId = faker.helpers.arrayElement(this.productIds);
      const rating = faker.number.int({ min: 1, max: 5 });

      reviews.push({
        user_id: userId,
        product_id: productId,
        rating,
        title: faker.lorem.sentence(),
        content: faker.lorem.paragraphs(2),
        status: faker.helpers.arrayElement(['pending', 'approved', 'rejected']),
        is_verified: faker.datatype.boolean(0.7),
        helpful_count: faker.number.int({ min: 0, max: 20 }),
      });
    }

    const { error } = await this.supabase
      .from('reviews')
      .insert(reviews);

    if (error) {
      logError(error as Error, { action: 'seed_reviews' });
      throw error;
    }

    logger.info(`✅ Created ${reviews.length} reviews`);
  }

  private async seedReferrals(): Promise<void> {
    logger.info('🔗 Seeding referrals...');

    // Get partner IDs from the users we just created
    const { data: userData } = await this.supabase
      .from('users')
      .select('id, role')
      .eq('role', 'partner');

    const partnerIds = userData?.map(user => user.id) || [];

    const referrals: Array<any> = [];
    for (let i = 0; i < config.referrals; i++) {
      const referrerId = faker.helpers.arrayElement(partnerIds);
      const productId = faker.helpers.arrayElement(this.productIds);
      const shopId = faker.helpers.arrayElement(this.shopIds);

      referrals.push({
        referrer_id: referrerId,
        product_id: faker.datatype.boolean(0.7) ? productId : null,
        shop_id: faker.datatype.boolean(0.3) ? shopId : null,
        referral_code: faker.string.alphanumeric(8).toUpperCase(),
        reward_type: faker.helpers.arrayElement(['percentage', 'fixed']),
        reward_value: faker.number.float({ min: 5, max: 50, fractionDigits: 2 }),
        is_active: faker.datatype.boolean(0.9),
        expires_at: faker.datatype.boolean(0.5) ? faker.date.future({ years: 1 }).toISOString() : null,
      });
    }

    const { data: referralData, error } = await this.supabase
      .from('referrals')
      .insert(referrals)
      .select('id');

    if (error) {
      logError(error as Error, { action: 'seed_referrals' });
      throw error;
    }

    // Create referral stats
    const referralStats = referralData.map(referral => ({
      referral_id: referral.id,
      click_count: faker.number.int({ min: 0, max: 100 }),
      conversion_count: faker.number.int({ min: 0, max: 20 }),
      total_earned: faker.number.float({ min: 0, max: 1000, fractionDigits: 2 }),
      last_click_at: faker.date.recent().toISOString(),
      last_conversion_at: faker.datatype.boolean(0.6) ? faker.date.recent().toISOString() : null,
    }));

    await this.supabase.from('referral_stats').insert(referralStats);

    logger.info(`✅ Created ${referrals.length} referrals`);
  }

  private async seedNotifications(): Promise<void> {
    logger.info('🔔 Seeding notifications...');

    const notifications: Array<any> = [];
    for (let i = 0; i < 100; i++) {
      const userId = faker.helpers.arrayElement(this.userIds);
      const type = faker.helpers.arrayElement(['welcome', 'sale', 'review', 'referral', 'system', 'promotion']);

      let title = '';
      let message = '';
      let data = {};

      switch (type) {
        case 'welcome':
          title = 'Welcome to the Marketplace!';
          message = 'Thank you for joining our marketplace. Start exploring our products!';
          data = { action: 'explore' };
          break;
        case 'sale':
          title = 'New Sale!';
          message = 'You have a new sale for one of your products.';
          data = { product_id: faker.helpers.arrayElement(this.productIds) };
          break;
        case 'review':
          title = 'New Review';
          message = 'Someone left a review for your product.';
          data = { product_id: faker.helpers.arrayElement(this.productIds) };
          break;
        case 'referral':
          title = 'Referral Commission';
          message = 'You earned a commission from a referral!';
          data = { amount: faker.number.float({ min: 1, max: 50, fractionDigits: 2 }) };
          break;
        case 'system':
          title = 'System Update';
          message = 'We have updated our platform with new features.';
          data = { version: faker.system.semver() };
          break;
        case 'promotion':
          title = 'Special Offer';
          message = 'Check out our latest promotion on selected products!';
          data = { discount: faker.number.int({ min: 10, max: 50 }) };
          break;
      }

      notifications.push({
        user_id: userId,
        type,
        title,
        message,
        data,
        is_read: faker.datatype.boolean(0.6),
        read_at: faker.datatype.boolean(0.6) ? faker.date.recent().toISOString() : null,
      });
    }

    const { error } = await this.supabase
      .from('notifications')
      .insert(notifications);

    if (error) {
      logError(error as Error, { action: 'seed_notifications' });
      throw error;
    }

    logger.info(`✅ Created ${notifications.length} notifications`);
  }
}

// Main execution
async function main() {
  const seeder = new DatabaseSeeder();
  await seeder.seed();
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  });
}

export { DatabaseSeeder };
