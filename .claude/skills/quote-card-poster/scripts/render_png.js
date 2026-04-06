#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) args[key] = true;
      else {
        args[key] = next;
        i++;
      }
    }
  }
  return args;
}

(async () => {
  const args = parseArgs(process.argv);
  if (!args.input) {
    console.error('Missing --input <json file>');
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(args.input, 'utf8'));
  const outDir = path.resolve(process.cwd(), data.outputDir || 'output/quote-card');
  const files = fs.readdirSync(outDir).filter(f => f.endsWith('.html'));
  if (!files.length) {
    console.error('No HTML files found in output directory. Run generate.js first.');
    process.exit(1);
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();
  const outputs = [];

  for (const file of files) {
    const htmlPath = path.join(outDir, file);
    const url = 'file://' + htmlPath;
    await page.goto(url);
    await page.screenshot({ path: htmlPath.replace(/\.html$/, '.png'), fullPage: true });
    outputs.push(htmlPath.replace(/\.html$/, '.png'));
  }

  await browser.close();
  console.log(JSON.stringify({ outDir, pngFiles: outputs }, null, 2));
})();
