#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const thisDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(thisDir, '..');

function usage() {
  console.error('Usage: node scripts/bump-version.mjs <version>');
  process.exit(1);
}

const rawArg = process.argv[2];
if (!rawArg) usage();

const version = rawArg.replace(/^v/, '');
if (!/^\d+\.\d+\.\d+$/.test(version)) {
  console.error(`Invalid version string: ${rawArg}`);
  usage();
}

const pkgPath = path.join(root, 'package.json');
const phpPath = path.join(root, 'shooters-hub.php');
const readmePath = path.join(root, 'readme.txt');

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
pkg.version = version;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

const phpOrig = fs.readFileSync(phpPath, 'utf-8');
if (!/(\* Version: )\d+\.\d+\.\d+/.test(phpOrig)) {
  console.error('Failed to locate version header in shooters-hub.php');
  process.exit(1);
}
let phpUpdated = phpOrig.replace(/(\* Version: )\d+\.\d+\.\d+/, `$1${version}`);
phpUpdated = phpUpdated.replace(/(define\('SH_PLUGIN_VERSION', ')\d+\.\d+\.\d+('\);)/, `$1${version}$2`);
fs.writeFileSync(phpPath, phpUpdated);

const readmeOrig = fs.readFileSync(readmePath, 'utf-8');
if (!/(Stable tag:\s*)\d+\.\d+\.\d+/.test(readmeOrig)) {
  console.error('Failed to locate stable tag in readme.txt');
  process.exit(1);
}
const readmeUpdated = readmeOrig.replace(/(Stable tag:\s*)\d+\.\d+\.\d+/, `$1${version}`);
fs.writeFileSync(readmePath, readmeUpdated);

console.log(`Bumped plugin version to ${version}`);
