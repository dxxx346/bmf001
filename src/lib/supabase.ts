// Re-export the simple Supabase clients and types
export { createBrowserClient, createServerClient, createServiceClient } from './supabase/simple';
export type {
  User,
  Shop,
  Category,
  Product,
  Purchase,
  Payment,
  Favorite,
  Referral,
  ReferralStats,
} from './supabase/simple';
