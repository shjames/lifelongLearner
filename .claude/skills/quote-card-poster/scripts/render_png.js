#!/usr/bin/env node
/**
 * render_png.js — 将 generate.js 输出的 HTML 截图为 PNG
 *
 * 用法：
 *   node render_png.js --input output/quote-card/_input.json
 *
 * 依赖：puppeteer-core（使用系统已安装的 Chrome，无需额外下载浏览器）
 *   npm install puppeteer-core
 */
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) args[key] = true;
      else { args[key] = next; i++; }
    }
  }
  return args;
}

const SIZES = {
  portrait:  { width: 1080, height: 1440 },
  square:    { width: 1080, height: 1080 },
  landscape: { width: 1440, height: 1080 }
};

// 常见 Chrome/Edge 安装路径（Windows/macOS/Linux）
const CHROME_PATHS = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
];

function findChrome() {
  for (const p of CHROME_PATHS) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function slugify(s) {
  return String(s || 'quote-card')
    .normalize('NFKD')
    .replace(/[^\w\u4e00-\u9fa5-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'quote-card';
}

function parseMarkdown(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  let quote = '';
  let source = '';
  let author = '';
  for (const line of lines) {
    if (/^#{1,3}\s+/.test(line)) {
      quote = line.replace(/^#{1,3}\s+/, '').trim();
    } else if (/^出自[：:]/.test(line)) {
      source = line.replace(/^出自[：:]/, '').trim();
    } else if (/^作者[：:]/.test(line)) {
      author = line.replace(/^作者[：:]/, '').trim();
    }
  }
  return { quote, source, author };
}

(async () => {
  const args = parseArgs(process.argv);
  if (!args.input) { console.error('Missing --input <json file>'); process.exit(1); }

  const data = JSON.parse(fs.readFileSync(args.input, 'utf8'));

  // Resolve quote/source from markdown if needed
  if (data.markdown) {
    const parsed = parseMarkdown(data.markdown);
    if (!data.quote && parsed.quote) data.quote = parsed.quote;
    if (!data.source && parsed.source) data.source = parsed.source;
    if (!data.author && parsed.author) data.author = parsed.author;
  }

  const outDir = path.resolve(process.cwd(), data.outputDir || 'output/quote-card');

  // 找到本次生成的 summary.json
  const base = slugify(`${data.author || 'anonymous'}-${data.source || 'quote'}-${(data.quote || '').slice(0, 18)}`);
  const summaryPath = path.join(outDir, `${base}.summary.json`);
  if (!fs.existsSync(summaryPath)) {
    console.error('summary.json not found. Run generate.js first.');
    process.exit(1);
  }
  const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));

  // 找系统 Chrome
  const executablePath = findChrome();
  if (!executablePath) {
    console.error('未找到 Chrome/Edge，请安装 Google Chrome 后重试。');
    process.exit(1);
  }
  console.log('使用浏览器：', executablePath);

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const outputs = [];

  for (const item of summary) {
    const { htmlPath, metaPath } = item;
    if (!fs.existsSync(htmlPath)) {
      console.warn(`HTML not found, skipping: ${htmlPath}`);
      continue;
    }

    // 从 meta 读取尺寸
    const meta = fs.existsSync(metaPath)
      ? JSON.parse(fs.readFileSync(metaPath, 'utf8'))
      : {};
    const sizeKey = meta.size || data.size || 'portrait';
    const { width, height } = SIZES[sizeKey] || SIZES.portrait;

    const page = await browser.newPage();
    // 设置 viewport 等于卡片尺寸，JS scale() 结果为 1.0，全尺寸渲染
    await page.setViewport({ width, height, deviceScaleFactor: 1 });
    await page.goto('file:///' + htmlPath.replace(/\\/g, '/'), { waitUntil: 'networkidle0' });

    // 截取 .card 元素，精确等于卡片像素，无灰色背景
    const cardEl = await page.$('.card');
    const pngPath = htmlPath.replace(/\.html$/, '.png');
    if (cardEl) {
      await cardEl.screenshot({ path: pngPath });
    } else {
      console.warn(`No .card element in ${htmlPath}, falling back to viewport screenshot`);
      await page.screenshot({ path: pngPath, clip: { x: 0, y: 0, width, height } });
    }

    outputs.push(pngPath);
    await page.close();
  }

  await browser.close();
  console.log(JSON.stringify({ outDir, pngFiles: outputs }, null, 2));
})();
