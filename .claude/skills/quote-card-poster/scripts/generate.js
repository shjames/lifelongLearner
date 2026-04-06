#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

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

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function slugify(s) {
  return String(s || 'quote-card')
    .normalize('NFKD')
    .replace(/[^\w\u4e00-\u9fa5-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'quote-card';
}

const THEMES = {
  minimal: {
    name: 'minimal',
    css: 'background:#f7f4ee;color:#1f1f1f;'
      + 'background-image:linear-gradient(180deg,rgba(0,0,0,.02),rgba(0,0,0,0));'
  },
  literary: {
    name: 'literary',
    css: 'background:#f3efe7;color:#2e261f;'
      + 'background-image:radial-gradient(circle at top left,rgba(120,90,60,.12),transparent 28%),linear-gradient(180deg,#f8f4ec,#efe6d8);'
  },
  retro: {
    name: 'retro',
    css: 'background:#e8dcc7;color:#3b2d1f;'
      + 'background-image:linear-gradient(135deg,rgba(110,70,40,.08),transparent 40%),repeating-linear-gradient(0deg,rgba(80,50,30,.02),rgba(80,50,30,.02) 2px,transparent 2px,transparent 4px);'
  },
  dark: {
    name: 'dark',
    css: 'background:#111315;color:#f2f2f2;'
      + 'background-image:radial-gradient(circle at top right,rgba(255,255,255,.08),transparent 25%),linear-gradient(180deg,#15181c,#0f1012);'
  },
  oriental: {
    name: 'oriental',
    css: 'background:#f6f1e7;color:#2a241d;'
      + 'background-image:linear-gradient(180deg,rgba(160,40,40,.08),transparent 18%),radial-gradient(circle at bottom right,rgba(140,30,30,.08),transparent 22%);'
  },
  magazine: {
    name: 'magazine',
    css: 'background:#f8f8f8;color:#111;'
      + 'background-image:linear-gradient(120deg,rgba(0,0,0,.04),transparent 30%);'
  }
};

const SIZES = {
  portrait: { width: 1080, height: 1440 },
  square: { width: 1080, height: 1080 },
  landscape: { width: 1440, height: 1080 }
};

function pickTheme(theme) {
  const keys = Object.keys(THEMES);
  if (!theme || theme === 'random') return THEMES[keys[Math.floor(Math.random() * keys.length)]];
  return THEMES[theme] || THEMES.minimal;
}

function htmlForCard(data, themeObj, sizeObj) {
  const esc = (s) => String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${esc(data.quote)}</title>
<style>
*{box-sizing:border-box}html,body{margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif;}
.poster{width:${sizeObj.width}px;height:${sizeObj.height}px;position:relative;overflow:hidden;${themeObj.css}}
.inner{position:absolute;inset:0;padding:${sizeObj.width > sizeObj.height ? '88px 96px' : '110px 90px'};display:flex;flex-direction:column;justify-content:space-between}
.kicker{font-size:24px;letter-spacing:.24em;text-transform:uppercase;opacity:.7}
.quote{font-size:${sizeObj.width > sizeObj.height ? '62px' : '68px'};line-height:1.45;font-weight:700;letter-spacing:.01em;white-space:pre-wrap}
.meta{display:flex;flex-direction:column;gap:14px;align-items:flex-start}
.source{font-size:30px;opacity:.88}
.author{font-size:26px;opacity:.68}
.footer{font-size:18px;opacity:.45;letter-spacing:.12em}
.badge{position:absolute;top:36px;right:36px;font-size:18px;padding:10px 14px;border-radius:999px;background:rgba(255,255,255,.16);backdrop-filter:blur(8px)}
.line{width:120px;height:3px;background:currentColor;opacity:.22;margin:22px 0 10px}
</style>
</head>
<body>
  <main class="poster">
    <div class="badge">${esc(themeObj.name)}</div>
    <section class="inner">
      <div>
        <div class="kicker">QUOTE CARD</div>
        <div class="line"></div>
        <div class="quote">${esc(data.quote)}</div>
      </div>
      <div class="meta">
        <div class="source">出自：${esc(data.source || '未注明出处')}</div>
        ${data.author ? `<div class="author">作者：${esc(data.author)}</div>` : ''}
      </div>
    </section>
  </main>
</body>
</html>`;
}

function main() {
  const args = parseArgs(process.argv);
  const inputPath = args.input;
  if (!inputPath) {
    console.error('Missing --input <json file>');
    process.exit(1);
  }
  const raw = fs.readFileSync(inputPath, 'utf8');
  const data = JSON.parse(raw);
  if (!data.quote) {
    console.error('Input must include "quote"');
    process.exit(1);
  }

  const outDir = path.resolve(process.cwd(), data.outputDir || 'output/quote-card');
  ensureDir(outDir);

  const base = slugify(`${data.author || 'anonymous'}-${data.source || 'quote'}-${data.quote.slice(0, 18)}`);
  const themes = Array.isArray(data.themes) && data.themes.length ? data.themes : [data.theme || 'random'];
  const size = SIZES[data.size || 'portrait'] || SIZES.portrait;
  const results = [];

  for (const theme of themes) {
    const themeObj = pickTheme(theme);
    const suffix = themes.length > 1 ? `-${themeObj.name}` : '';
    const html = htmlForCard(data, themeObj, size);
    const htmlPath = path.join(outDir, `${base}${suffix}.html`);
    const metaPath = path.join(outDir, `${base}${suffix}.meta.json`);
    fs.writeFileSync(htmlPath, html, 'utf8');
    fs.writeFileSync(metaPath, JSON.stringify({ ...data, theme: themeObj.name, size: data.size || 'portrait', htmlPath }, null, 2), 'utf8');
    results.push({ theme: themeObj.name, htmlPath, metaPath });
  }

  const summaryPath = path.join(outDir, `${base}.summary.json`);
  fs.writeFileSync(summaryPath, JSON.stringify(results, null, 2), 'utf8');
  console.log(JSON.stringify({ outDir, summaryPath, results }, null, 2));
}

main();
