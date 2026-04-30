#!/usr/bin/env node
/**
 * LinkedGuard build script
 * Generates dist/chrome/ and dist/firefox/ ready to load in each browser.
 * Run: node build.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');

// Files/dirs to copy (relative to ROOT)
const COPY_PATHS = [
  'src',
  'assets',
];

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

function buildTarget(name, manifestSrc) {
  const outDir = path.join(DIST, name);

  // Clean
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  // Copy shared assets + source
  for (const p of COPY_PATHS) {
    copyRecursive(path.join(ROOT, p), path.join(outDir, p));
  }

  // Write the correct manifest as manifest.json
  fs.copyFileSync(path.join(ROOT, manifestSrc), path.join(outDir, 'manifest.json'));

  console.log(`✓ dist/${name}/  (${manifestSrc})`);
}

buildTarget('chrome',  'manifest.json');
buildTarget('firefox', 'manifest.firefox.json');

console.log('\nDone.');
console.log('  Chrome  → Load unpacked: dist/chrome/');
console.log('  Firefox → Load Temporary Add-on: dist/firefox/manifest.json');
