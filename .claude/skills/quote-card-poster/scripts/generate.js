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
      else { args[key] = next; i++; }
    }
  }
  return args;
}

function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }

function slugify(s) {
  return String(s || 'quote-card')
    .normalize('NFKD')
    .replace(/[^\w\u4e00-\u9fa5-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'quote-card';
}

const SIZES = {
  portrait:  { width: 1080, height: 1440 },
  square:    { width: 1080, height: 1080 },
  landscape: { width: 1440, height: 1080 }
};

// HTML escape
function e(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─────────────────────────────────────────────────────────────────────────────
// COMMON WRAPPER — handles PC/mobile scaling via transform: scale()
// Each theme renderer returns { css, body } and calls wrapCard()
// ─────────────────────────────────────────────────────────────────────────────

function wrapCard(cardCSS, cardBody, W, H) {
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:100%;height:100%;overflow:hidden}
body{
  display:flex;
  align-items:flex-start;
  justify-content:center;
  background:#c8c8c8;
  min-height:100vh;
}
.card-wrapper{
  transform-origin:top center;
  flex-shrink:0;
}
.card{
  width:${W}px;
  height:${H}px;
  position:relative;
  overflow:hidden;
}
${cardCSS}
</style>
</head>
<body>
<div class="card-wrapper">
  <div class="card">
${cardBody}
  </div>
</div>
<script>
(function(){
  var wrapper = document.querySelector('.card-wrapper');
  var W = ${W}, H = ${H};
  function rescale(){
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var s = Math.min(vw / W, vh / H);
    wrapper.style.transform = 'scale(' + s + ')';
    document.body.style.height = Math.ceil(H * s) + 'px';
  }
  rescale();
  window.addEventListener('resize', rescale);
})();
</script>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// THEME RENDERERS
// ─────────────────────────────────────────────────────────────────────────────

function renderMinimal(data, W, H) {
  const isLand = W > H;
  const px = isLand ? 100 : 80;
  const py = isLand ? 90 : 110;
  const qSize = W > H ? 52 : 60;

  const css = `
.card{
  font-family:"Noto Serif SC","Source Han Serif CN","SimSun",Georgia,serif;
  background:#faf9f7;color:#1a1a1a;
  display:flex;flex-direction:column;
  padding:${py}px ${px}px;
}
.card::before,.card::after,.corner-bl,.corner-br{
  content:'';position:absolute;width:60px;height:60px;
  border-color:#bbb;border-style:solid;
}
.card::before{top:32px;left:32px;border-width:1px 0 0 1px}
.card::after{top:32px;right:32px;border-width:1px 1px 0 0}
.corner-bl{bottom:32px;left:32px;border-width:0 0 1px 1px}
.corner-br{bottom:32px;right:32px;border-width:0 1px 1px 0}
.top{flex:1;display:flex;flex-direction:column;justify-content:center}
.label{
  font-size:13px;letter-spacing:.4em;color:#999;text-transform:uppercase;
  font-family:-apple-system,"Helvetica Neue",sans-serif;font-weight:300;
  margin-bottom:52px;
}
.open-quote{
  font-size:${qSize * 2.8}px;line-height:.7;color:#ccc;
  font-family:Georgia,serif;margin-bottom:8px;user-select:none;
}
.quote{
  font-size:${qSize}px;line-height:1.75;font-weight:400;
  letter-spacing:.06em;color:#1a1a1a;white-space:pre-wrap;
}
.divider{
  width:${W > H ? 80 : 60}px;height:1px;background:#ccc;
  margin:52px 0 32px;
}
.bottom{display:flex;flex-direction:column;gap:10px}
.source{font-size:22px;font-weight:300;color:#555;letter-spacing:.05em}
.author{
  font-size:19px;font-weight:300;color:#888;letter-spacing:.08em;
  font-family:-apple-system,"Helvetica Neue",sans-serif;
}
.branding{display:none}`;

  const body = `
    <div class="corner-bl"></div><div class="corner-br"></div>
    <div class="top">
      <div class="label">Quote</div>
      <div class="open-quote">"</div>
      <div class="quote">${e(data.quote)}</div>
      <div class="divider"></div>
      <div class="bottom">
        ${data.source ? `<div class="source">《${e(data.source)}》</div>` : ''}
        ${data.author ? `<div class="author">— ${e(data.author)}</div>` : ''}
      </div>
    </div>
    <div class="branding">Minimal</div>`;

  return wrapCard(css, body, W, H);
}

function renderLiterary(data, W, H) {
  const isLand = W > H;
  const px = isLand ? 110 : 90;
  const py = isLand ? 90 : 120;
  const qSize = isLand ? 48 : 54;

  const css = `
.card{
  font-family:"Noto Serif SC","Source Han Serif CN","FangSong","STFangsong",Georgia,serif;
  display:flex;flex-direction:column;justify-content:space-between;
  padding:${py}px ${px}px;
  background:
    radial-gradient(ellipse 60% 40% at 20% 10%, rgba(180,140,80,.18) 0%, transparent 55%),
    radial-gradient(ellipse 50% 50% at 80% 90%, rgba(150,110,60,.12) 0%, transparent 50%),
    linear-gradient(165deg, #f9f4e8 0%, #f0e8d2 50%, #ece0c5 100%);
  color:#2c2016;
}
.card::before{
  content:'';position:absolute;inset:0;pointer-events:none;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
  opacity:.6;mix-blend-mode:multiply;
}
.card::after{
  content:'';position:absolute;
  top:${py - 30}px;left:${px}px;right:${px}px;height:1px;
  background:linear-gradient(90deg,transparent,rgba(140,100,40,.35),transparent);
}
.header{display:flex;align-items:center;gap:16px;margin-bottom:${isLand?40:60}px}
.header-line{flex:1;height:1px;background:rgba(140,100,40,.25)}
.header-text{
  font-size:13px;letter-spacing:.35em;color:#a08050;text-transform:uppercase;
  font-family:-apple-system,sans-serif;font-weight:300;white-space:nowrap;
}
.body{flex:1;display:flex;flex-direction:column;justify-content:center}
.big-quote{
  font-size:${qSize*3.2}px;line-height:.6;color:rgba(140,100,40,.22);
  font-family:"Times New Roman",Georgia,serif;
  margin-bottom:${isLand?12:20}px;user-select:none;
}
.quote{
  font-size:${qSize}px;line-height:1.85;font-weight:400;
  letter-spacing:.05em;color:#2c2016;white-space:pre-wrap;
}
.footer{display:flex;flex-direction:column;gap:12px}
.deco-line{
  width:50px;height:2px;margin-bottom:${isLand?24:32}px;
  background:linear-gradient(90deg,rgba(140,100,40,.6),rgba(140,100,40,.1));
}
.source{font-size:${isLand?22:25}px;color:#6b4f28;letter-spacing:.06em;font-weight:400;}
.author{
  font-size:${isLand?18:21}px;color:#9b7a48;letter-spacing:.1em;font-weight:300;
  font-family:-apple-system,sans-serif;
}
.stamp{display:none}`;

  const body = `
    <div class="header">
      <div class="header-line"></div>
      <div class="header-text">Literary</div>
      <div class="header-line"></div>
    </div>
    <div class="body">
      <div class="big-quote">"</div>
      <div class="quote">${e(data.quote)}</div>
    </div>
    <div class="footer">
      <div class="deco-line"></div>
      ${data.source ? `<div class="source">《${e(data.source)}》</div>` : ''}
      ${data.author ? `<div class="author">— ${e(data.author)}</div>` : ''}
    </div>
    <div class="stamp">文艺</div>`;

  return wrapCard(css, body, W, H);
}

function renderRetro(data, W, H) {
  const isLand = W > H;
  const px = isLand ? 100 : 82;
  const py = isLand ? 80 : 100;
  const qSize = isLand ? 46 : 52;

  const css = `
.card{
  font-family:"Noto Serif SC","Source Han Serif CN","STKaiti","KaiTi",Georgia,serif;
  display:flex;flex-direction:column;padding:${py}px ${px}px;
  background:
    repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(100,70,30,.07) 39px, rgba(100,70,30,.07) 40px),
    linear-gradient(160deg,#e8d5a8 0%,#d4bc8a 40%,#c9ae78 100%);
  color:#2a1e0e;
}
.card::before{
  content:'';position:absolute;inset:0;pointer-events:none;
  background:radial-gradient(ellipse at center, transparent 40%, rgba(80,50,20,.18) 100%);
  mix-blend-mode:multiply;
}
.frame-outer{position:absolute;top:28px;left:28px;right:28px;bottom:28px;border:2px solid rgba(80,50,20,.4);}
.frame-inner{position:absolute;top:38px;left:38px;right:38px;bottom:38px;border:1px solid rgba(80,50,20,.2);}
.stamp-bar{display:flex;align-items:center;gap:0;margin-bottom:${isLand?36:52}px;margin-top:16px;}
.stamp-line{flex:1;height:2px;background:rgba(80,50,20,.35)}
.stamp-center{
  padding:10px 28px;border:2px solid rgba(80,50,20,.4);
  font-size:12px;letter-spacing:.5em;color:#6b4a22;text-transform:uppercase;
  font-family:-apple-system,sans-serif;font-weight:600;
  background:rgba(210,180,120,.5);
}
.body{flex:1;display:flex;flex-direction:column;justify-content:center}
.ornament{
  font-size:${qSize*2.5}px;line-height:.65;color:rgba(100,65,25,.25);
  font-family:Georgia,serif;margin-bottom:10px;user-select:none;
}
.quote{
  font-size:${qSize}px;line-height:1.82;font-weight:400;
  letter-spacing:.04em;color:#2a1e0e;white-space:pre-wrap;
}
.rule{
  width:100%;height:2px;margin:${isLand?28:40}px 0 24px;
  background:repeating-linear-gradient(90deg,
    rgba(80,50,20,.4) 0,rgba(80,50,20,.4) 6px,transparent 6px,transparent 10px);
}
.meta{display:flex;flex-direction:column;gap:12px}
.source{font-size:${isLand?21:24}px;color:#5a3e1a;letter-spacing:.05em;}
.author{font-size:${isLand?17:20}px;color:#7a5a2a;letter-spacing:.1em;font-family:-apple-system,sans-serif;}
.corner-deco{position:absolute;font-size:28px;color:rgba(80,50,20,.3);font-family:Georgia,serif;line-height:1;}
.corner-deco.tl{top:52px;left:52px}
.corner-deco.tr{top:52px;right:52px}
.corner-deco.bl{bottom:52px;left:52px}
.corner-deco.br{bottom:52px;right:52px}`;

  const body = `
    <div class="frame-outer"></div>
    <div class="frame-inner"></div>
    <div class="corner-deco tl">✦</div>
    <div class="corner-deco tr">✦</div>
    <div class="corner-deco bl">✦</div>
    <div class="corner-deco br">✦</div>
    <div class="stamp-bar">
      <div class="stamp-line"></div>
      <div class="stamp-center">Retro · 复古</div>
      <div class="stamp-line"></div>
    </div>
    <div class="body">
      <div class="ornament">"</div>
      <div class="quote">${e(data.quote)}</div>
    </div>
    <div class="rule"></div>
    <div class="meta">
      ${data.source ? `<div class="source">《${e(data.source)}》</div>` : ''}
      ${data.author ? `<div class="author">— ${e(data.author)}</div>` : ''}
    </div>`;

  return wrapCard(css, body, W, H);
}

function renderDark(data, W, H) {
  const isLand = W > H;
  const px = isLand ? 108 : 88;
  const py = isLand ? 88 : 110;
  const qSize = isLand ? 50 : 56;
  const gold = '#c9a84c';
  const goldLight = '#e8cc80';

  const css = `
.card{
  font-family:"Noto Serif SC","Source Han Serif CN",Georgia,serif;
  display:flex;flex-direction:column;justify-content:space-between;
  padding:${py}px ${px}px;
  background:
    radial-gradient(ellipse 70% 50% at 15% 0%, rgba(201,168,76,.12) 0%, transparent 50%),
    radial-gradient(ellipse 60% 60% at 85% 100%, rgba(100,80,30,.15) 0%, transparent 45%),
    linear-gradient(160deg,#141618 0%,#0d0e11 50%,#0a0b0e 100%);
  color:#e8e2d4;
}
.card::before{
  content:'';position:absolute;top:-1px;left:${px}px;right:${px}px;height:1px;
  background:linear-gradient(90deg,transparent,${gold},transparent);
}
.card::after{
  content:'';position:absolute;bottom:-1px;left:${px}px;right:${px}px;height:1px;
  background:linear-gradient(90deg,transparent,rgba(201,168,76,.4),transparent);
}
.header{display:none;}
.top-deco{
  position:absolute;top:${py}px;left:${px}px;right:${px}px;
  display:flex;flex-direction:column;gap:10px;
}
.top-deco-line{height:1px;}
.top-deco-line:nth-child(1){background:linear-gradient(90deg,${gold},rgba(201,168,76,.0));opacity:.9;}
.top-deco-line:nth-child(2){background:linear-gradient(90deg,rgba(201,168,76,.5),rgba(201,168,76,.0));width:65%;}
.top-deco-line:nth-child(3){background:linear-gradient(90deg,rgba(201,168,76,.25),rgba(201,168,76,.0));width:40%;}
.top-deco-diamond{
  width:10px;height:10px;margin-top:6px;
  border:1px solid ${gold};transform:rotate(45deg);opacity:.6;
}
.body{flex:1;display:flex;flex-direction:column;justify-content:center;margin-top:${isLand?-20:-30}px}
.big-quote{
  font-size:${qSize*3}px;line-height:.55;
  background:linear-gradient(135deg,${goldLight},${gold},rgba(201,168,76,.3));
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;
  font-family:Georgia,serif;margin-bottom:${isLand?14:22}px;user-select:none;
}
.quote{
  font-size:${qSize}px;line-height:1.8;font-weight:400;
  letter-spacing:.04em;color:#e8e2d4;white-space:pre-wrap;
}
.footer{display:flex;flex-direction:column;gap:0}
.gold-rule{width:56px;height:1px;margin-bottom:28px;background:linear-gradient(90deg,${gold},transparent);}
.source{font-size:${isLand?22:25}px;color:${gold};letter-spacing:.06em;margin-bottom:12px;font-weight:300;}
.author{font-size:${isLand?18:21}px;color:rgba(201,168,76,.55);letter-spacing:.12em;font-family:-apple-system,sans-serif;font-weight:300;}
.corner-gem{display:none}`;

  const body = `
    <div class="header"></div>
    <div class="top-deco">
      <div class="top-deco-line"></div>
      <div class="top-deco-line"></div>
      <div class="top-deco-line"></div>
      <div class="top-deco-diamond"></div>
    </div>
    <div class="body">
      <div class="big-quote">"</div>
      <div class="quote">${e(data.quote)}</div>
    </div>
    <div class="footer">
      <div class="gold-rule"></div>
      ${data.source ? `<div class="source">《${e(data.source)}》</div>` : ''}
      ${data.author ? `<div class="author">— ${e(data.author)}</div>` : ''}
    </div>
    <div class="corner-gem">暗黑</div>`;

  return wrapCard(css, body, W, H);
}

function renderOriental(data, W, H) {
  const isLand = W > H;
  const px = isLand ? 108 : 88;
  const py = isLand ? 88 : 110;
  const qSize = isLand ? 46 : 52;
  const red = '#8b1a1a';
  const redLight = '#c0392b';
  const ink = '#1a1007';

  const css = `
.card{
  font-family:"Noto Serif SC","Source Han Serif CN","STKaiti","KaiTi",serif;
  display:flex;flex-direction:${isLand?'row':'column'};
  background:
    radial-gradient(ellipse 80% 30% at 50% 0%, rgba(139,26,26,.06) 0%, transparent 60%),
    linear-gradient(175deg,#f8f0e2 0%,#f2e8d5 60%,#ecddc5 100%);
  color:${ink};
}
.red-bar{
  position:absolute;${isLand?'top:0;left:0;right:0;height:12px;':'left:0;top:0;bottom:0;width:14px;'}
  background:linear-gradient(${isLand?'90deg':'180deg'},${red},${redLight},${red});
}
.seal{
  position:absolute;
  ${isLand ? `top:${py}px;right:${px}px;` : `bottom:${py}px;right:${px}px;`}
  width:80px;height:80px;border-radius:50%;
  border:3px solid ${red};
  display:flex;align-items:center;justify-content:center;
  color:${red};font-size:18px;letter-spacing:.1em;font-weight:700;opacity:.7;
}
.content{
  flex:1;padding:${py}px ${isLand?px:px+20}px ${py}px ${isLand?px:px+24}px;
  display:flex;flex-direction:column;justify-content:space-between;
}
.header{margin-bottom:${isLand?36:52}px}
.chapter-num{display:inline-flex;align-items:center;gap:14px;}
.red-dash{width:${isLand?32:24}px;height:2px;background:${red}}
.chapter-label{font-size:13px;letter-spacing:.45em;color:${red};text-transform:uppercase;font-family:-apple-system,sans-serif;font-weight:400;}
.body{flex:1;display:flex;flex-direction:column;justify-content:center}
.quote-mark-top{font-size:${qSize*1.8}px;line-height:1;color:rgba(139,26,26,.18);font-family:Georgia,serif;margin-bottom:${isLand?10:16}px;user-select:none;}
.quote{font-size:${qSize}px;line-height:1.88;font-weight:400;letter-spacing:.06em;color:${ink};white-space:pre-wrap;}
.footer-area{margin-top:${isLand?28:44}px}
.ink-line{width:100%;height:1px;margin-bottom:${isLand?20:28}px;background:linear-gradient(90deg,${red},rgba(139,26,26,.08));}
.source{font-size:${isLand?22:25}px;color:#4a2010;letter-spacing:.06em;margin-bottom:10px;}
.author{font-size:${isLand?18:21}px;color:#6b3820;letter-spacing:.1em;font-family:-apple-system,sans-serif;font-weight:300;}
.vert-deco{
  position:absolute;
  ${isLand ? `left:${px}px;top:50%;transform:translateY(-50%);` : `right:${px}px;top:50%;transform:translateY(-50%);`}
  writing-mode:vertical-rl;text-orientation:mixed;
  font-size:13px;letter-spacing:.4em;color:rgba(139,26,26,.25);
  font-family:-apple-system,sans-serif;
}`;

  const body = `
    <div class="red-bar"></div>
    <div class="seal">国风</div>
    <div class="vert-deco">书中岁月</div>
    <div class="content">
      <div class="header">
        <div class="chapter-num">
          <div class="red-dash"></div>
          <div class="chapter-label">Oriental · 国风</div>
          <div class="red-dash"></div>
        </div>
      </div>
      <div class="body">
        <div class="quote-mark-top">❝</div>
        <div class="quote">${e(data.quote)}</div>
      </div>
      <div class="footer-area">
        <div class="ink-line"></div>
        ${data.source ? `<div class="source">《${e(data.source)}》</div>` : ''}
        ${data.author ? `<div class="author">— ${e(data.author)}</div>` : ''}
      </div>
    </div>`;

  return wrapCard(css, body, W, H);
}

function renderMagazine(data, W, H) {
  const isLand = W > H;
  const px = isLand ? 100 : 80;
  const py = isLand ? 80 : 100;
  const qSize = isLand ? 62 : 68;
  const accent = '#e63333';
  const topH = isLand ? 100 : 120;

  const css = `
.card{
  font-family:-apple-system,"Helvetica Neue","Arial","PingFang SC","Microsoft YaHei",sans-serif;
  display:flex;flex-direction:column;
  background:#f5f5f3;color:#0f0f0f;
}
.top-block{
  height:${topH}px;background:#0f0f0f;flex-shrink:0;
  display:flex;align-items:flex-end;padding:0 ${px}px 20px;
  position:relative;
}
.top-block::before{content:'';position:absolute;left:0;top:0;bottom:0;width:10px;background:${accent};}
.mag-title{font-size:14px;letter-spacing:.6em;color:#fff;text-transform:uppercase;font-weight:700;}
.issue{margin-left:auto;font-size:13px;letter-spacing:.2em;color:rgba(255,255,255,.45);font-weight:300;}
.body{flex:1;padding:${isLand?52:70}px ${px}px;display:flex;flex-direction:column;justify-content:space-between;}
.giant-quote{
  font-size:${qSize*4.5}px;line-height:.65;color:rgba(0,0,0,.06);
  font-family:"Times New Roman",Georgia,serif;
  position:absolute;top:${topH}px;left:${px - 20}px;
  user-select:none;pointer-events:none;font-weight:900;
}
.quote-area{flex:1;display:flex;flex-direction:column;justify-content:center;position:relative;z-index:1}
.accent-bar{width:${isLand?5:6}px;height:${isLand?64:80}px;background:${accent};margin-bottom:32px;}
.quote{
  font-size:${qSize}px;line-height:1.4;font-weight:800;
  letter-spacing:-.01em;color:#0f0f0f;white-space:pre-wrap;
  font-family:-apple-system,"Helvetica Neue",sans-serif;
}
.meta-block{
  border-top:3px solid #0f0f0f;padding-top:24px;
  display:flex;flex-direction:${isLand?'row':'column'};
  ${isLand?'align-items:center;gap:40px;':'gap:10px;'}
}
.source{font-size:${isLand?24:27}px;font-weight:700;letter-spacing:.02em;color:#0f0f0f;}
.sep{${isLand?'width:1px;height:28px;background:#ccc':'display:none'}}
.author{font-size:${isLand?20:22}px;font-weight:400;color:#666;letter-spacing:.02em;}
.byline-label{font-size:12px;letter-spacing:.3em;text-transform:uppercase;color:${accent};font-weight:700;margin-bottom:6px;}
.page-num{
  position:absolute;bottom:${py}px;right:${px}px;
  font-size:48px;font-weight:900;color:rgba(0,0,0,.06);
  font-family:-apple-system,sans-serif;letter-spacing:-.02em;
}`;

  const body = `
    <div class="top-block">
      <div class="mag-title">Magazine</div>
      <div class="issue">Vol. 01</div>
    </div>
    <div class="giant-quote">"</div>
    <div class="body">
      <div class="quote-area">
        <div class="accent-bar"></div>
        <div class="quote">${e(data.quote)}</div>
      </div>
      <div class="meta-block">
        ${data.source ? `<div>
          <div class="byline-label">出自</div>
          <div class="source">《${e(data.source)}》</div>
        </div>` : ''}
        ${(data.source && data.author) ? `<div class="sep"></div>` : ''}
        ${data.author ? `<div>
          ${!data.source ? `<div class="byline-label">作者</div>` : ''}
          <div class="author">${e(data.author)}</div>
        </div>` : ''}
      </div>
    </div>
    <div class="page-num">01</div>`;

  return wrapCard(css, body, W, H);
}

// ─────────────────────────────────────────────────────────────────────────────
// THEME REGISTRY
// ─────────────────────────────────────────────────────────────────────────────

const THEMES = {
  minimal:  { name: 'minimal',  render: renderMinimal  },
  literary: { name: 'literary', render: renderLiterary },
  retro:    { name: 'retro',    render: renderRetro    },
  dark:     { name: 'dark',     render: renderDark     },
  oriental: { name: 'oriental', render: renderOriental },
  magazine: { name: 'magazine', render: renderMagazine }
};

function pickTheme(theme) {
  const keys = Object.keys(THEMES);
  if (!theme || theme === 'random') return THEMES[keys[Math.floor(Math.random() * keys.length)]];
  return THEMES[theme] || THEMES.minimal;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

function main() {
  const args = parseArgs(process.argv);
  const inputPath = args.input;
  if (!inputPath) { console.error('Missing --input <json file>'); process.exit(1); }

  const raw = fs.readFileSync(inputPath, 'utf8');
  const data = JSON.parse(raw);
  if (!data.quote) { console.error('Input must include "quote"'); process.exit(1); }

  const outDir = path.resolve(process.cwd(), data.outputDir || 'output/quote-card');
  ensureDir(outDir);

  const base = slugify(`${data.author || 'anonymous'}-${data.source || 'quote'}-${data.quote.slice(0, 18)}`);
  const themes = Array.isArray(data.themes) && data.themes.length ? data.themes : [data.theme || 'random'];
  const sizeKey = data.size || 'portrait';
  const size = SIZES[sizeKey] || SIZES.portrait;
  const results = [];

  for (const theme of themes) {
    const themeObj = pickTheme(theme);
    const suffix = themes.length > 1 ? `-${themeObj.name}` : '';
    const html = themeObj.render(data, size.width, size.height);
    const htmlPath = path.join(outDir, `${base}${suffix}.html`);
    const metaPath = path.join(outDir, `${base}${suffix}.meta.json`);
    fs.writeFileSync(htmlPath, html, 'utf8');
    fs.writeFileSync(metaPath, JSON.stringify({
      ...data, theme: themeObj.name, size: sizeKey, htmlPath
    }, null, 2), 'utf8');
    results.push({ theme: themeObj.name, htmlPath, metaPath });
  }

  const summaryPath = path.join(outDir, `${base}.summary.json`);
  fs.writeFileSync(summaryPath, JSON.stringify(results, null, 2), 'utf8');
  console.log(JSON.stringify({ outDir, summaryPath, results }, null, 2));
}

main();
