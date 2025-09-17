#!/usr/bin/env node

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { execSync } = require('child_process');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path');

// Check if required environment variables are set
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL');
  console.error('   NEXT_PUBLIC_SUPABASE_ANON_KEY');
  console.error('\nPlease set these in your .env.local file');
  process.exit(1);
}

try {
  console.log('🔄 Generating TypeScript types from Supabase schema...');
  
  // Install supabase CLI if not already installed
  try {
    execSync('supabase --version', { stdio: 'ignore' });
  } catch {
    console.log('📦 Installing Supabase CLI...');
    execSync('npm install -g supabase', { stdio: 'inherit' });
  }

  // Generate types using Supabase CLI
  execSync(
    `supabase gen types typescript --project-id ${supabaseUrl.split('//')[1].split('.')[0]} > temp-types.ts`,
    { encoding: 'utf8' }
  );

  // Read the generated types
  const generatedTypes = fs.readFileSync('temp-types.ts', 'utf8');
  
  // Clean up temp file
  fs.unlinkSync('temp-types.ts');

  // Write to the types file
  const typesPath = path.join(__dirname, '../src/lib/supabase/types.ts');
  fs.writeFileSync(typesPath, generatedTypes);

  console.log('✅ Types generated successfully!');
  console.log(`📁 Types saved to: ${typesPath}`);

} catch (err) {
  console.error('❌ Error generating types:', err.message);
  console.error('\n💡 Make sure you have:');
  console.error('   1. Set up your Supabase project');
  console.error('   2. Added the correct environment variables');
  console.error('   3. Installed Supabase CLI: npm install -g supabase');
  console.error('   4. Logged in to Supabase: supabase login');
  process.exit(1);
}
