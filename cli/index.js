#!/usr/bin/env node
'use strict';

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const PACKAGE_ROOT = path.resolve(__dirname, '..');

function usage() {
  console.log(`
react-native-ios-controls

  Adds a WidgetKit control extension (iOS 18 Control Center / Lock Screen /
  Action Button) to your app's Xcode project.

Usage
  npx react-native-ios-controls init [options]

Options
  --project <path>    Path to the .xcodeproj. Default: autodetected under ios/
  --app-group <id>    App Group identifier. Default: group.<app bundle id>
  --name <name>       Extension target name. Default: ControlsExtension
  --dry-run           Print what would change and exit without touching anything
  --force             Re-create the target even if it already exists
  -h, --help          Show this message

What it does
  * creates the extension target with a widgetkit-extension Info.plist
  * writes entitlements for both the app and the extension with the App Group
  * drops in the library's Swift sources, on the correct targets
  * backs up project.pbxproj before saving

  It refuses to run twice, so a second invocation cannot corrupt the project.
`);
}

function parseArgs(argv) {
  const args = { command: argv[0] };
  for (let i = 1; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--force') args.force = true;
    else if (arg === '--project') args.project = argv[++i];
    else if (arg === '--app-group') args.appGroup = argv[++i];
    else if (arg === '--name') args.name = argv[++i];
    else if (arg === '-h' || arg === '--help') args.help = true;
    else {
      console.error(`error: unknown option "${arg}"`);
      process.exit(1);
    }
  }
  return args;
}

function findXcodeProject(explicit) {
  if (explicit) {
    if (!fs.existsSync(explicit)) {
      console.error(`error: no Xcode project at ${explicit}`);
      process.exit(1);
    }
    return path.resolve(explicit);
  }
  const iosDir = path.join(process.cwd(), 'ios');
  if (!fs.existsSync(iosDir)) {
    console.error(
      'error: no ios/ directory here. Run this from your app root, or pass --project.'
    );
    process.exit(1);
  }
  const projects = fs
    .readdirSync(iosDir)
    .filter((entry) => entry.endsWith('.xcodeproj'));
  if (projects.length === 0) {
    console.error(`error: no .xcodeproj found in ${iosDir}`);
    process.exit(1);
  }
  if (projects.length > 1) {
    console.error(
      `error: found several Xcode projects in ios/ (${projects.join(', ')}). Pass --project.`
    );
    process.exit(1);
  }
  return path.join(iosDir, projects[0]);
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || !args.command) {
    usage();
    process.exit(args.command ? 0 : 1);
  }

  if (args.command !== 'init') {
    console.error(`error: unknown command "${args.command}"`);
    usage();
    process.exit(1);
  }

  const projectPath = findXcodeProject(args.project);

  const payload = {
    projectPath,
    extensionName: args.name || 'ControlsExtension',
    appGroup: args.appGroup || null,
    packageIosDir: path.join(PACKAGE_ROOT, 'ios'),
    dryRun: Boolean(args.dryRun),
    force: Boolean(args.force),
  };

  const result = spawnSync('ruby', [path.join(__dirname, 'setup.rb')], {
    input: JSON.stringify(payload),
    stdio: ['pipe', 'inherit', 'inherit'],
  });

  if (result.error) {
    console.error(
      `error: could not run ruby (${result.error.message}).\n` +
        'Ruby ships with macOS; if it is missing, install it and the xcodeproj gem.'
    );
    process.exit(1);
  }
  process.exit(result.status ?? 1);
}

main();
