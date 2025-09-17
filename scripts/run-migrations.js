#!/usr/bin/env node

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { execSync } = require('child_process');

// Check if required environment variables are set
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  console.error('\nPlease set these in your .env.local file');
  process.exit(1);
}

try {
  console.log('🔄 Running Supabase migrations...');
  
  // Install supabase CLI if not already installed
  try {
    execSync('supabase --version', { stdio: 'ignore' });
  } catch {
    console.log('📦 Installing Supabase CLI...');
    execSync('npm install -g supabase', { stdio: 'inherit' });
  }

  // Login to Supabase
  console.log('🔐 Logging in to Supabase...');
  execSync('supabase login', { stdio: 'inherit' });

  // Link to project
  console.log('🔗 Linking to Supabase project...');
  const projectId = supabaseUrl.split('//')[1].split('.')[0];
  execSync(`supabase link --project-ref ${projectId}`, { stdio: 'inherit' });

  // Run migrations
  console.log('📊 Running database migrations...');
  execSync('supabase db push', { stdio: 'inherit' });

  console.log('✅ Migrations completed successfully!');
  console.log('🎉 Your database is now ready for development!');

} catch (error) {
  console.error('❌ Error running migrations:', error.message);
  console.error('\n💡 Make sure you have:');
  console.error('   1. Set up your Supabase project');
  console.error('   2. Added the correct environment variables');
  console.error('   3. Installed Supabase CLI: npm install -g supabase');
  console.error('   4. Logged in to Supabase: supabase login');
  process.exit(1);
}
