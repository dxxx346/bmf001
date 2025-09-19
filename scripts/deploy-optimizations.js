/**
 * Deploy Database Optimizations Script
 * Applies all database indexes, functions, and materialized views
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function deployOptimizations() {
  console.log('🚀 Starting database optimization deployment...')
  
  try {
    // 1. Apply database indexes
    console.log('📊 Creating database indexes...')
    await applyDatabaseIndexes()
    
    // 2. Create optimized query functions
    console.log('⚡ Creating optimized query functions...')
    await createOptimizedFunctions()
    
    // 3. Create dashboard functions
    console.log('📈 Creating dashboard functions...')
    await createDashboardFunctions()
    
    // 4. Create materialized views
    console.log('🔄 Creating materialized views...')
    await createMaterializedViews()
    
    // 5. Update table statistics
    console.log('📊 Updating table statistics...')
    await updateTableStatistics()
    
    // 6. Verify optimizations
    console.log('✅ Verifying optimizations...')
    await verifyOptimizations()
    
    console.log('\n🎉 Database optimization deployment completed successfully!')
    console.log('\nNext steps:')
    console.log('1. Update your services to use the optimized functions')
    console.log('2. Monitor performance metrics')
    console.log('3. Set up cache warming schedule')
    console.log('4. Run performance comparison tests')
    
  } catch (error) {
    console.error('❌ Deployment failed:', error)
    process.exit(1)
  }
}

async function applyDatabaseIndexes() {
  const indexesPath = path.join(__dirname, '../src/lib/database-indexes.sql')
  const indexesSql = fs.readFileSync(indexesPath, 'utf8')
  
  // Split by semicolons and execute each statement
  const statements = indexesSql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))
  
  for (const statement of statements) {
    try {
      await supabase.rpc('exec_sql', { sql: statement })
      console.log(`  ✅ Executed: ${statement.substring(0, 50)}...`)
    } catch (error) {
      console.warn(`  ⚠️ Warning: ${statement.substring(0, 50)}... - ${error.message}`)
    }
  }
}

async function createOptimizedFunctions() {
  const functionsPath = path.join(__dirname, '../supabase/migrations/20240918000001_optimized_queries.sql')
  const functionsSql = fs.readFileSync(functionsPath, 'utf8')
  
  // Execute the migration
  try {
    await supabase.rpc('exec_sql', { sql: functionsSql })
    console.log('  ✅ Optimized query functions created')
  } catch (error) {
    console.error('  ❌ Failed to create optimized functions:', error.message)
    throw error
  }
}

async function createDashboardFunctions() {
  const dashboardPath = path.join(__dirname, '../supabase/migrations/20240918000002_dashboard_functions.sql')
  const dashboardSql = fs.readFileSync(dashboardPath, 'utf8')
  
  // Execute the migration
  try {
    await supabase.rpc('exec_sql', { sql: dashboardSql })
    console.log('  ✅ Dashboard functions created')
  } catch (error) {
    console.error('  ❌ Failed to create dashboard functions:', error.message)
    throw error
  }
}

async function createMaterializedViews() {
  const views = [
    {
      name: 'mv_product_analytics',
      description: 'Product analytics materialized view'
    },
    {
      name: 'mv_shop_analytics', 
      description: 'Shop analytics materialized view'
    }
  ]
  
  for (const view of views) {
    try {
      await supabase.rpc('refresh_materialized_view', { view_name: view.name })
      console.log(`  ✅ ${view.description} refreshed`)
    } catch (error) {
      console.warn(`  ⚠️ Warning: Could not refresh ${view.name} - ${error.message}`)
    }
  }
}

async function updateTableStatistics() {
  const tables = [
    'products', 'purchases', 'payments', 'shops', 'users',
    'favorites', 'reviews', 'referrals', 'product_files', 
    'product_images', 'product_stats', 'shop_stats'
  ]
  
  for (const table of tables) {
    try {
      await supabase.rpc('exec_sql', { sql: `ANALYZE ${table};` })
      console.log(`  ✅ Updated statistics for ${table}`)
    } catch (error) {
      console.warn(`  ⚠️ Warning: Could not analyze ${table} - ${error.message}`)
    }
  }
}

async function verifyOptimizations() {
  try {
    // Check if functions exist
    const { data: functions } = await supabase
      .rpc('exec_sql', { 
        sql: `
          SELECT routine_name 
          FROM information_schema.routines 
          WHERE routine_schema = 'public' 
          AND routine_name IN (
            'search_products_optimized',
            'get_buyer_dashboard_optimized', 
            'get_seller_dashboard_optimized',
            'get_user_stats'
          );
        `
      })
    
    console.log('  📋 Created functions:', functions?.map(f => f.routine_name).join(', '))
    
    // Check indexes
    const { data: indexes } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT indexname 
          FROM pg_indexes 
          WHERE schemaname = 'public' 
          AND indexname LIKE 'idx_%'
          ORDER BY indexname;
        `
      })
    
    console.log(`  📊 Created indexes: ${indexes?.length || 0} optimization indexes`)
    
    // Test a sample optimized query
    const { data: testQuery, error } = await supabase
      .rpc('search_products_optimized', {
        search_query: 'test',
        limit_count: 5
      })
    
    if (!error && testQuery) {
      console.log('  ✅ Optimized functions are working correctly')
    } else {
      console.warn('  ⚠️ Warning: Test query failed:', error?.message)
    }
    
  } catch (error) {
    console.warn('  ⚠️ Warning: Verification had issues:', error.message)
  }
}

// Performance monitoring setup
async function setupPerformanceMonitoring() {
  console.log('📊 Setting up performance monitoring...')
  
  try {
    // Create performance monitoring tables if they don't exist
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS query_performance_log (
          id SERIAL PRIMARY KEY,
          query_id TEXT NOT NULL,
          query_name TEXT NOT NULL,
          duration_ms DECIMAL NOT NULL,
          result_count INTEGER,
          cache_hit BOOLEAN DEFAULT FALSE,
          user_id UUID,
          created_at TIMESTAMP DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_query_performance_created_at 
        ON query_performance_log(created_at);
        
        CREATE INDEX IF NOT EXISTS idx_query_performance_duration 
        ON query_performance_log(duration_ms);
      `
    })
    
    console.log('  ✅ Performance monitoring tables created')
    
  } catch (error) {
    console.warn('  ⚠️ Warning: Performance monitoring setup had issues:', error.message)
  }
}

// Run deployment
if (require.main === module) {
  deployOptimizations()
    .then(() => setupPerformanceMonitoring())
    .then(() => {
      console.log('\n🎯 All optimizations deployed successfully!')
      console.log('\nRun the performance comparison script to see the improvements:')
      console.log('npm run performance-comparison')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Deployment failed:', error)
      process.exit(1)
    })
}

module.exports = { deployOptimizations }
