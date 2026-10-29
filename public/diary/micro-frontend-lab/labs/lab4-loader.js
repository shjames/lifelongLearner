/* Lab 4 · 资源加载
   目标：搞懂 entry HTML 是怎么被搬进基座的，以及为什么必须做路径补全 */
(function () {
  'use strict';
  const { h, UI, Lab } = window;

  const DEFAULT_ENTRY = 'http://iam.test.a.kpay-test.com/';
  const DEFAULT_HTML = `<!DOCTYPE html><html><head>
  <title>KPay CRM</title>
  <link rel="stylesheet" href="/static/css/index.ff89371f.css">
  <script defer src="/static/js/lib-react.f5c2ee96.js"></script>
  <script defer src="static/js/index.7d46fe46.js"></script>
</head>
<body>
  <div id="user-management-root"></div>
</body></html>`;

  const RESULT = {};

  function resolveAll(entry, html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const scripts = Array.from(doc.querySelectorAll('script'));
    const links = Array.from(doc.querySelectorAll('link[href]'));
    const items = [];

    scripts.forEach((s) => {
      const raw = s.getAttribute('src');
      if (!raw) return;
      items.push({ kind: 'script', raw, resolved: new URL(raw, entry).href, el: s });
    });
    links.forEach((l) => {
      const raw = l.getAttribute('href');
      items.push({ kind: 'link', raw, resolved: new URL(raw, entry).href, el: l });
    });
    return { doc, items };
  }

  function buildScopedHTML(entry, html) {
    const { doc, items } = resolveAll(entry, html);
    const body = doc.body ? doc.body.innerHTML.trim() : '';
    const headParts = items
      .map((i) => (i.kind === 'script' ? `<script src="${i.resolved}"></script>` : `<link href="${i.resolved}" rel="stylesheet">`))
      .join('\n      ');
    return {
      html: `<micro-app name="iam-app" url="${entry}">
  <micro-app-head>
      ${headParts}
  </micro-app-head>
  <micro-app-body>
      ${body}
  </micro-app-body>
</micro-app>`,
      items,
    };
  }

  Lab.register({
    id: 'L4',
    order: 4,
    group: '原生基础',
    title: '资源加载与路径补全',
    subtitle: 'fetch HTML → 拆成 head/body → 补全相对路径',
    render(root) {
      const entryInput = h('input', { type: 'text', value: DEFAULT_ENTRY });
      const htmlEditor = h('textarea', { style: { minHeight: '150px' } });
      htmlEditor.value = DEFAULT_HTML;

      const probeInput = h('input', { type: 'text', value: './static/js/chunk.js' });
      const probeOut = h('code', { class: 'mono' }, '-');
      const probeNote = h('div', { style: { marginTop: '6px' } });

      const tableBox = h('div');
      const scopedPre = h('pre', { class: 'code' });
      const rawPre = h('pre', { class: 'code' });

      function probe() {
        try {
          const base = entryInput.value.trim();
          const raw = probeInput.value.trim();
          const resolved = new URL(raw, base).href;
          probeOut.textContent = resolved;
          RESULT.lastProbe = { base, raw, resolved };
          probeNote.innerHTML = '';
          probeNote.appendChild(
            UI.badge(
              raw.startsWith('/') ? '以 / 开头 → 相对子应用域名根目录' :
              raw.startsWith('//') ? '协议相对 → 沿用子应用协议' :
              raw.startsWith('./') || raw.startsWith('../') ? '相对当前目录 → 取决于 base 的 pathname' :
              /^https?:/.test(raw) ? '绝对地址 → 不受 base 影响' : '相对 base 目录',
              '',
            ),
          );
        } catch (e) {
          probeOut.textContent = '解析失败：' + e.message;
          probeNote.innerHTML = '';
        }
      }

      function parse() {
        const entry = entryInput.value.trim();
        const html = htmlEditor.value;
        let built;
        try {
          built = buildScopedHTML(entry, html);
        } catch (e) {
          UI.toast('解析失败：' + e.message, 'err');
          return;
        }
        RESULT.lastBuild = built;

        rawPre.innerHTML = UI.highlight(html.trim());
        scopedPre.innerHTML = UI.highlight(built.html);

        tableBox.innerHTML = '';
        const rows = built.items.map((i) =>
          h(
            'tr',
            null,
            h('td', null, i.kind),
            h('td', { class: 'mono' }, i.raw),
            h('td', { class: 'mono', style: { color: '#9fd6ff' } }, i.resolved),
            h('td', null, i.resolved.startsWith(entry) ? UI.badge('命中子应用域名 ✓', 'ok') : UI.badge('跨域资源', 'warn')),
          ),
        );
        tableBox.appendChild(
          h(
            'table',
            { class: 'tbl' },
            h(
              'thead',
              null,
              h('tr', null, h('th', null, '类型'), h('th', null, 'HTML 里写的'), h('th', null, 'new URL(path, entry) 结果'), h('th', null, '判定')),
            ),
            h('tbody', null, rows.length ? rows : h('tr', null, h('td', { colspan: 4 }, '没有解析到资源'))),
          ),
        );
        RESULT.parsed = true;
      }

      const checks = UI.check(
        [
          {
            label: '以 / 开头的资源补全到子应用域名根目录',
            test: () => {
              const r = new URL('/static/js/lib.js', DEFAULT_ENTRY).href;
              return r === 'http://iam.test.a.kpay-test.com/static/js/lib.js'
                ? true
                : '实际结果：' + r;
            },
            detail: '这是最常见的写法，容易被误以为会请求基座域名',
          },
          {
            label: '不带 / 的相对路径会拼在 entry 的目录下',
            test: () => {
              const r = new URL('static/js/a.js', 'http://iam.test.a.kpay-test.com/').href;
              const r2 = new URL('static/js/a.js', 'http://iam.test.a.kpay-test.com/system/').href;
              return r === 'http://iam.test.a.kpay-test.com/static/js/a.js' &&
                r2 === 'http://iam.test.a.kpay-test.com/system/static/js/a.js'
                ? true
                : '目录不同结果不同：' + r + ' / ' + r2;
            },
            detail: '所以 base 必须以 / 结尾，否则最后一段会被替换掉',
          },
          {
            label: '协议相对地址（//cdn）沿用 entry 的协议',
            test: () => {
              const r = new URL('//cdn.example.com/a.js', DEFAULT_ENTRY).href;
              return r === 'http://cdn.example.com/a.js' ? true : '实际结果：' + r;
            },
            detail: 'http 页面不会跳到 https 资源，部署到 https 时会自动升级',
          },
          {
            label: 'HTML 被拆成 micro-app-head / micro-app-body',
            test: () => {
              if (!RESULT.lastBuild) return '点「解析并改写」';
              const s = RESULT.lastBuild.html;
              return s.includes('<micro-app-head>') && s.includes('<micro-app-body>')
                ? true
                : '输出里没有两个容器标签';
            },
            detail: 'head 装样式和脚本，body 装子应用的挂载节点',
          },
        ],
        () => Lab.done('L4'),
      );

      root.appendChild(
        UI.head(
          'L4 · 原生基础',
          '资源加载：把子应用的 HTML 搬进基座',
          '子应用和基座不同域，但 DOM 必须放进同一个文档。于是 micro-app 用 fetch 拿 HTML，再用 DOMParser 拆成 <micro-app-head> 和 <micro-app-body>，插进基座的 <micro-app> 标签里。',
        ),
      );

      root.appendChild(
        UI.card(
          '为什么不用 iframe src',
          h(
            'ul',
            null,
            h('li', null, 'iframe 能隔离，但子应用的弹窗、下拉、水印出不了 iframe'),
            h('li', null, '基座拿不到子应用的 DOM，做不了统一的滚动、尺寸、拖拽'),
            h('li', null, '路由和滚动位置都要跨窗口通信，体验割裂'),
          ),
        ),
      );

      root.appendChild(
        UI.card(
          '动手①：new URL 路径补全',
          h('p', null, '子应用 HTML 里写的 <code class="inline">/static/js/x.js</code> 如果直接交给浏览器，会请求基座域名。必须先补全成绝对地址。'),
          h(
            'div',
            { class: 'row' },
            h('label', { class: 'field' }, h('span', null, 'entry（子应用地址）'), entryInput),
            h('label', { class: 'field' }, h('span', null, 'HTML 里的资源路径'), probeInput),
          ),
          h('div', { class: 'row' }, h('button', { class: 'btn primary', onclick: probe }, '计算绝对地址')),
          h(
            'div',
            { class: 'demo' },
            h('div', { class: 'demo-label' }, 'RESOLVED URL'),
            probeOut,
            probeNote,
          ),
          UI.note(
            '试这几组：<code class="inline">/static/a.js</code>、<code class="inline">static/a.js</code>、' +
              '<code class="inline">../assets/x.css</code>、<code class="inline">//cdn.x.com/y.js</code>。' +
              '关键在于 base 末尾有没有 <code class="inline">/</code>。',
          ),
        ),
      );

      root.appendChild(
        UI.card(
          '动手②：解析一份真实的子应用 HTML',
          h('p', null, '下面预置的是 IAM 子应用（http://iam.test.a.kpay-test.com/）的真实首页结构。'),
          htmlEditor,
          h('div', { class: 'row' }, h('button', { class: 'btn primary', onclick: parse }, '解析并改写')),
          h('div', { class: 'demo-label', style: { marginTop: '14px' } }, '资源补全结果'),
          tableBox,
          h(
            'div',
            { class: 'split', style: { marginTop: '12px' } },
            h('div', null, h('div', { class: 'demo-label' }, '子应用原始 HTML'), h('div', { class: 'code-wrap' }, rawPre)),
            h('div', null, h('div', { class: 'demo-label' }, '基座实际插入的结构'), h('div', { class: 'code-wrap' }, scopedPre)),
          ),
        ),
      );

      root.appendChild(
        UI.card(
          '验收',
          checks.el,
        ),
      );

      probe();
      parse();
    },
  });
})();
