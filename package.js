#!/usr/bin/env node
/**
 * LinkedGuard packaging script
 * Builds + zips dist/chrome/ and dist/firefox/ into store-ready archives.
 * Output: dist/linkedguard-chrome-<version>.zip
 *         dist/linkedguard-firefox-<version>.zip
 *
 * Run: node package.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');

// 1. Run the build first so dist/chrome and dist/firefox are fresh
console.log('▶ Building dist/chrome and dist/firefox …');
execSync('node build.js', { cwd: ROOT, stdio: 'inherit' });

// 2. Read version from each manifest (Chrome and Firefox can drift, so we
//    pick the version per-target from its own manifest).
function readVersion(manifestPath) {
  const json = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  return json.version || '0.0.0';
}

// 3. Zip with the system `zip` command (universally available on macOS/Linux;
//    on Windows users typically have it via Git Bash or WSL).
function zipDir(srcDir, outFile) {
  if (fs.existsSync(outFile)) fs.rmSync(outFile);
  // -r recursive, -X strip extra file attributes, -q quiet
  execSync(`zip -rqX "${outFile}" .`, { cwd: srcDir, stdio: 'inherit' });
  const sizeKB = (fs.statSync(outFile).size / 1024).toFixed(1);
  return sizeKB;
}

console.log('\n▶ Packaging …');

const chromeDir = path.join(DIST, 'chrome');
const firefoxDir = path.join(DIST, 'firefox');
const chromeVersion = readVersion(path.join(chromeDir, 'manifest.json'));
const firefoxVersion = readVersion(path.join(firefoxDir, 'manifest.json'));

const chromeZip = path.join(DIST, `linkedguard-chrome-${chromeVersion}.zip`);
const firefoxZip = path.join(DIST, `linkedguard-firefox-${firefoxVersion}.zip`);

const chromeSize = zipDir(chromeDir, chromeZip);
const firefoxSize = zipDir(firefoxDir, firefoxZip);

console.log('\n✓ Done.');
console.log(`  Chrome  → ${path.relative(ROOT, chromeZip)}  (${chromeSize} KB)`);
console.log(`  Firefox → ${path.relative(ROOT, firefoxZip)}  (${firefoxSize} KB)`);
console.log('\nUpload to:');
console.log('  Chrome Web Store → https://chrome.google.com/webstore/devconsole');
console.log('  Firefox AMO      → https://addons.mozilla.org/developers/');
