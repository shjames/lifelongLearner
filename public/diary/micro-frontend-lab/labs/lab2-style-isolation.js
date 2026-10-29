/* Lab 2 · 样式隔离
   目标：亲眼看到"不加前缀 → 整个页面被污染"，以及 micro-app 的属性选择器前缀方案 */
(function () {
  'use strict';
  const { h, UI, Lab } = window;

  const STATE = { mode: 'scoped', baseBg: '', childBg: '', bodyBg: '' };

  const DEMO_CSS = `body {
  background: #ef4444;      /* 子应用想给整页换底色 */
}
.card {
  background: #fbbf24;      /* 子应用自己的卡片 */
  color: #1a1a1a;
  padding: 10px;
  border-radius: 8px;
}
:root { --child-accent: #fbbf24; }`;

  // 复用内核里的公共实现（同一段逻辑不写两遍），只把宿主标签换成 micro-app
  const scopeCSS = (css, appName, enabled) =>
    window.MiniMicroApp.scopeCSS(css, appName, enabled, 'micro-app');

  function buildDemoHTML(css, mode) {
    const scoped = mode === 'scoped';
    return `<!doctype html><html><head><meta charset="utf-8"><style>
      html, body { margin: 0; font-family: system-ui, sans-serif; background: #eef1f6; }
      .frame { padding: 12px; }
      .hint { font: 11px/1.6 monospace; color: #64748b; margin: 0 0 8px; }
      .card { padding: 10px; border-radius: 8px; background: #ffffff; color: #111; margin-bottom: 8px;
              border: 1px solid #cbd5e1; }
      micro-app { display: block; }
      micro-app-body { display: block; }
${css}
    </style></head>
    <body class="frame">
      <p class="hint">基座自己的卡片（class="card"）</p>
      <div class="card base-card">我是基座的卡片</div>

      <p class="hint">子应用区域（&lt;micro-app name="demo"&gt; → &lt;micro-app-body&gt;）</p>
      <micro-app name="demo">
        <micro-app-body>
          <div class="card child-card">我是子应用的卡片</div>
        </micro-app-body>
      </micro-app>

      <script>
        // 子窗口自己测量并把结果上报给父窗口，父窗口不需要访问子文档（file:// 下也安全）
        setTimeout(function () {
          var q = function (s) { return document.querySelector(s); };
          var bg = function (el) { return getComputedStyle(el).backgroundColor; };
          parent.postMessage({
            type: 'lab2-report',
            mode: ${JSON.stringify(mode)},
            report: {
              bodyBg: bg(document.body),
              baseCard: bg(q('.base-card')),
              childCard: bg(q('.child-card'))
            }
          }, '*');
        }, 30);
      <\/script>
    </body></html>`;
  }

  function colorLabel(rgb) {
    const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(rgb || '');
    if (!m) return rgb || '-';
    const r = +m[1], g = +m[2], b = +m[3];
    const hex = '#' + [r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('');
    const name =
      r > 200 && g < 120 && b < 120 ? '红' : r > 200 && g > 150 && b < 120 ? '黄' : r > 230 && g > 230 ? '白/灰' : '';
    return hex + (name ? '（' + name + '）' : '');
  }

  Lab.register({
    id: 'L2',
    order: 2,
    group: '原生基础',
    title: '样式隔离',
    subtitle: '为什么子应用的 CSS 不会把基座刷成红色',
    render(root) {
      const frameBox = h('div');
      const resultBody = h('td', { class: 'mono' }, '-');
      const resultBase = h('td', { class: 'mono' }, '-');
      const resultChild = h('td', { class: 'mono' }, '-');
      const verdict = h('div', { style: { marginTop: '10px' } });

      const beforePre = h('pre', { class: 'code' });
      const afterPre = h('pre', { class: 'code' });

      const customCss = h('textarea', { style: { minHeight: '90px' } });
      customCss.value = `.panel { border: 2px solid #fbbf24; padding: 8px; }
body { background: #ef4444; }`;

      function paint() {
        const css = customCss.value || DEMO_CSS;
        const enabled = STATE.mode === 'scoped';
        beforePre.innerHTML = UI.highlight(enabled ? css : '/* 未开启作用域改写：原样注入 */\n\n' + css);
        afterPre.innerHTML = UI.highlight(scopeCSS(css, 'demo', enabled));

        const f = UI.frame(buildDemoHTML(scopeCSS(css, 'demo', enabled), STATE.mode), 300);
        frameBox.innerHTML = '';
        frameBox.appendChild(f);
        verdict.innerHTML = '';
        verdict.appendChild(UI.badge('等待子文档上报测量结果…', ''));
      }

      function setMode(mode) {
        STATE.mode = mode;
        paint();
      }

      window.addEventListener('message', (e) => {
        const data = e.data;
        if (!data || data.type !== 'lab2-report') return;
        if (data.mode !== STATE.mode) return; // 旧 iframe 的迟到消息，忽略
        STATE.baseBg = data.report.baseCard;
        STATE.childBg = data.report.childCard;
        STATE.bodyBg = data.report.bodyBg;

        resultBody.textContent = colorLabel(data.report.bodyBg);
        resultBase.textContent = colorLabel(data.report.baseCard);
        resultChild.textContent = colorLabel(data.report.childCard);

        verdict.innerHTML = '';
        if (STATE.mode === 'scoped') {
          verdict.appendChild(
            UI.badge('基座卡片未被污染 ✓', 'ok'),
          );
          verdict.appendChild(document.createTextNode(' '));
          verdict.appendChild(UI.badge('子应用卡片样式生效 ✓', 'ok'));
        } else {
          verdict.appendChild(UI.badge('基座卡片被子应用样式覆盖 ✗', 'err'));
          verdict.appendChild(document.createTextNode(' '));
          verdict.appendChild(UI.badge('整个 body 被刷成红色 ✗', 'err'));
        }
      });

      const checks = UI.check(
        [
          {
            label: 'body 选择器被改写成 micro-app-body',
            test: () => {
              const out = scopeCSS('body { margin: 0 }', 'demo', true);
              return /micro-app\[name=demo\]\s+micro-app-body/.test(out)
                ? true
                : '实际输出：' + out;
            },
            detail: 'micro-app[name=demo] micro-app-body { margin: 0 }',
          },
          {
            label: 'html / :root 被改写成宿主标签',
            test: () => {
              const out = scopeCSS(':root { --x: 1 }', 'demo', true);
              return /^micro-app\[name=demo\]\s*\{/m.test(out) ? true : '实际输出：' + out;
            },
            detail: '变量挂在宿主元素上，仍可被子应用继承',
          },
          {
            label: '逗号分隔的多个选择器各自加前缀',
            test: () => {
              const out = scopeCSS('.a, .b { color: red }', 'demo', true);
              const hits = (out.match(/micro-app\[name=demo\]/g) || []).length;
              return hits === 2 ? true : '前缀出现 ' + hits + ' 次，应为 2 次';
            },
            detail: '.a, .b → 两个都加，不能只加第一个',
          },
          {
            label: '实测：开启作用域后基座卡片背景未被污染',
            test: () => {
              if (STATE.mode !== 'scoped') return '先切到「加前缀」模式再看一次';
              if (!STATE.baseBg) return '还没收到测量结果，稍等或重新切换模式';
              const polluted = /rgb\(251,\s*191,\s*36\)/.test(STATE.baseBg);
              return polluted ? '基座卡片仍是黄色，说明前缀没生效' : true;
            },
            detail: 'getComputedStyle(.base-card).backgroundColor 是白/灰而非黄色',
          },
        ],
        () => Lab.done('L2'),
      );

      root.appendChild(
        UI.head(
          'L2 · 原生基础',
          '样式隔离：属性选择器前缀 vs Shadow DOM',
          '子应用和基座同处一个文档，CSS 天生互相污染。micro-app 的选择不是 Shadow DOM（弹层要 Portal 到 body，跨边界会错乱），而是给每条选择器加宿主前缀。',
        ),
      );

      root.appendChild(
        UI.card(
          '两种隔离手段',
          h(
            'table',
            { class: 'tbl' },
            h('thead', null, h('tr', null, h('th', null, '手段'), h('th', null, '做法'), h('th', null, '代价'))),
            h(
              'tbody',
              null,
              h(
                'tr',
                null,
                h('td', null, 'Shadow DOM'),
                h('td', null, 'attachShadow + 节点挂进影子树'),
                h('td', null, 'antd 弹层要 Portal 到 body，跨边界错乱；事件重定向有坑'),
              ),
              h(
                'tr',
                null,
                h('td', null, 'CSS 前缀（micro-app 采用）'),
                h('td', null, '把选择器改写成 micro-app[name=x] .foo'),
                h('td', null, '!important、行内样式、动态插入的 style 要逐个处理'),
              ),
            ),
          ),
        ),
      );

      root.appendChild(
        UI.card(
          '动手：对比两种模式',
          h(
            'div',
            { class: 'row' },
            h('button', { class: 'btn primary', onclick: () => setMode('scoped') }, '开启作用域（加前缀）'),
            h('button', { class: 'btn warn', onclick: () => setMode('raw') }, '关闭作用域（原样注入）'),
          ),
          h('div', { class: 'demo' }, h('div', { class: 'demo-label' }, 'LIVE IFRAME（同源隔离演示）'), frameBox),
          h(
            'table',
            { class: 'tbl', style: { marginTop: '12px' } },
            h('thead', null, h('tr', null, h('th', null, '测量点'), h('th', null, 'computed background'))),
            h('tbody', null, h('tr', null, h('td', null, 'iframe body'), resultBody), h('tr', null, h('td', null, '基座卡片 .base-card'), resultBase), h('tr', null, h('td', null, '子应用卡片 .child-card'), resultChild)),
          ),
          verdict,
        ),
      );

      root.appendChild(
        UI.card(
          '改写着色前后对比',
          h(
            'div',
            { class: 'split' },
            h('div', null, h('div', { class: 'demo-label' }, '子应用写的 CSS'), h('div', { class: 'code-wrap' }, beforePre)),
            h('div', null, h('div', { class: 'demo-label' }, '实际注入基座的 CSS'), h('div', { class: 'code-wrap' }, afterPre)),
          ),
          h('div', { class: 'demo-label', style: { marginTop: '14px' } }, '自定义 CSS（改完点下面的按钮重新上色）'),
          customCss,
          h('button', { class: 'btn primary', style: { marginTop: '8px' }, onclick: paint }, '重新应用'),
        ),
      );

      root.appendChild(
        UI.card(
          '验收',
          h('p', null, '先点两次模式按钮看差异，再运行验收。'),
          checks.el,
        ),
      );

      setMode('scoped');
    },
  });

  window.__lab2_scopeCSS = scopeCSS; // 供自检与调试
})();
