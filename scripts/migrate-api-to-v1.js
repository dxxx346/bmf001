#!/usr/bin/env node

/**
 * Script to migrate current API endpoints to v1 folder structure
 * This preserves the existing API while setting up versioning
 */

const fs = require('fs');
const path = require('path');

const API_DIR = path.join(__dirname, '..', 'src', 'app', 'api');
const V1_DIR = path.join(API_DIR, 'v1');

// Directories to skip (these are not API endpoints)
const SKIP_DIRS = [
  'v1',
  'v2',
  'health', // Keep health checks unversioned
  'docs',   // Keep docs unversioned
  'swagger' // Keep swagger unversioned
];

// Files to skip
const SKIP_FILES = [
  'route.ts' // Skip root route.ts files that might be middleware
];

/**
 * Recursively copy directory structure
 */
function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      // Skip directories that shouldn't be versioned
      if (SKIP_DIRS.includes(entry.name)) {
        console.log(`Skipping directory: ${entry.name}`);
        continue;
      }

      console.log(`Copying directory: ${srcPath} -> ${destPath}`);
      copyDir(srcPath, destPath);
    } else if (entry.isFile()) {
      // Skip files that shouldn't be versioned
      if (SKIP_FILES.includes(entry.name)) {
        console.log(`Skipping file: ${entry.name}`);
        continue;
      }

      console.log(`Copying file: ${srcPath} -> ${destPath}`);
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Update import paths in copied files
 */
function updateImportPaths(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const filePath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      updateImportPaths(filePath);
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      let content = fs.readFileSync(filePath, 'utf8');
      let updated = false;

      // Update relative imports that might be broken
      const importRegex = /from ['"]([^'"]+)['"]/g;
      content = content.replace(importRegex, (match, importPath) => {
        // Skip absolute imports and node_modules
        if (importPath.startsWith('@/') || !importPath.startsWith('.')) {
          return match;
        }

        // For relative imports, we might need to adjust paths
        // This is a simple heuristic - in practice, you might need more sophisticated logic
        if (importPath.startsWith('../') && !importPath.includes('../../')) {
          const newPath = `../${importPath}`;
          updated = true;
          return match.replace(importPath, newPath);
        }

        return match;
      });

      if (updated) {
        fs.writeFileSync(filePath, content);
        console.log(`Updated imports in: ${filePath}`);
      }
    }
  }
}

/**
 * Create version compatibility file
 */
function createVersionCompatibilityFile() {
  const compatibilityContent = `import { NextRequest, NextResponse } from 'next/server';

/**
 * API v1 Compatibility Layer
 * This file provides backward compatibility for v1 API endpoints
 */

export function withV1Compatibility(handler: Function) {
  return async (request: NextRequest, context?: any) => {
    try {
      // Add v1-specific headers
      const response = await handler(request, context);
      
      if (response instanceof NextResponse) {
        response.headers.set('API-Version', 'v1');
        response.headers.set('API-Version-Number', '1.0.0');
        response.headers.set('Deprecation', 'true');
        response.headers.set('Deprecation-Date', '2024-06-01');
        response.headers.set('Sunset', '2025-01-01');
        response.headers.set('Link', '</docs/api/migration/v1-to-v2>; rel="migration-guide"');
        response.headers.set('Warning', '299 - "API version v1 is deprecated. Please migrate to v2."');
      }
      
      return response;
    } catch (error) {
      console.error('v1 API error:', error);
      throw error;
    }
  };
}

export default withV1Compatibility;
`;

  const compatibilityPath = path.join(V1_DIR, '_compatibility.ts');
  fs.writeFileSync(compatibilityPath, compatibilityContent);
  console.log(`Created compatibility layer: ${compatibilityPath}`);
}

/**
 * Main migration function
 */
function migrateToV1() {
  console.log('Starting API v1 migration...');
  console.log(`Source: ${API_DIR}`);
  console.log(`Destination: ${V1_DIR}`);

  // Ensure v1 directory exists
  if (!fs.existsSync(V1_DIR)) {
    fs.mkdirSync(V1_DIR, { recursive: true });
    console.log(`Created v1 directory: ${V1_DIR}`);
  }

  // Copy all API endpoints to v1
  copyDir(API_DIR, V1_DIR);

  // Update import paths in copied files
  console.log('Updating import paths...');
  updateImportPaths(V1_DIR);

  // Create compatibility layer
  createVersionCompatibilityFile();

  console.log('API v1 migration completed!');
  console.log('');
  console.log('Next steps:');
  console.log('1. Review the copied files in src/app/api/v1/');
  console.log('2. Update any broken imports manually');
  console.log('3. Test the v1 endpoints');
  console.log('4. Create v2 endpoints with improvements');
}

// Run the migration
if (require.main === module) {
  migrateToV1();
}

module.exports = { migrateToV1 };
