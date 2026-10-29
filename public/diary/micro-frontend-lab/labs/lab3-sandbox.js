/* Lab 3 · with + Proxy 沙箱
   目标：看清"读穿透、写隔离"，以及 window.microApp 只是通信对象而非沙箱 */
(function () {
  'use strict';
  const { h, UI, Lab } = window;

  const DEFAULT_CODE = `var appName = 'child-a';
window.theme = 'yellow';
console.log('子应用启动：' + appName + ' / ' + window.theme);
console.log('读到基座的 Math.PI = ' + Math.PI);`;

  const STATE = {
    lastMode: null,
    globalKeys: [],
    sandboxKeys: [],
    output: [],
  };

  /** 生成执行环境 iframe：代码直接内联进 srcdoc，执行完自己上报结果 */
  function buildRunner(code, mode) {
    const safeCode = JSON.stringify(code).replace(/<\//g, '<\\/');
    return `<!doctype html><html><head><meta charset="utf-8"><style>
      html,body{margin:0;height:100%;background:#080a0e;color:#7ee787;
        font:12px/1.6 monospace;padding:10px;box-sizing:border-box;overflow:auto}
      .dim{color:#46536a}
    </style></head><body>
    <div class="dim">// 执行环境（隐藏的实验容器 iframe）</div>
    <div id="out"></div>
    <script>
      var CODE = ${safeCode};
      var MODE = ${JSON.stringify(mode)};
      var out = document.getElementById('out');
      var lines = [];
      function print(s) { lines.push(String(s)); out.innerHTML = lines.map(function (l) {
        return '<div>' + l.replace(/[&<>]/g, function (c) {
          return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c];
        }) + '</div>';
      }).join(''); }
      var fakeConsole = { log: print, warn: print, error: print, info: print };

      var beforeKeys = Object.keys(window).slice();
      var sandbox = null;
      var error = null;

      function buildSandbox() {
        class FakeWindow {}
        var fake = new FakeWindow();
        var proxy = new Proxy(fake, {
          get: function (t, k) {
            if (Reflect.has(t, k)) return Reflect.get(t, k);
            return Reflect.get(window, k);          // 读穿透
          },
          set: function (t, k, v) { Reflect.set(t, k, v); return true; }, // 写隔离
          has: function (t, k) { return k in t; },
          deleteProperty: function (t, k) { return Reflect.deleteProperty(t, k); }
        });
        fake.window = fake.self = fake.globalThis = proxy;
        fake.console = fakeConsole;
        return fake;
      }

      var rawLog = console.log;
      console.log = fakeConsole.log;
      console.warn = fakeConsole.warn;
      console.error = fakeConsole.error;

      try {
        if (MODE === 'raw') {
          // 间接 eval：代码在全局作用域执行，顶层 var 会落到真 window
          var indirectEval = eval;
          indirectEval(CODE);
        } else {
          // with + Proxy：与 micro-app 同原理
          sandbox = buildSandbox();
          var fn = new Function('proxyWindow', 'with(proxyWindow){' + CODE + '\\n}');
          fn(sandbox.window);
        }
      } catch (e) {
        error = e && e.message ? e.message : String(e);
      } finally {
        console.log = rawLog;
      }

      var afterKeys = Object.keys(window);
      var added = afterKeys.filter(function (k) { return beforeKeys.indexOf(k) === -1; });

      // 沙箱对象快照：只列可枚举、非函数的值
      var snap = [];
      if (sandbox) {
        Object.keys(sandbox).forEach(function (k) {
          var v = sandbox[k];
          if (typeof v === 'function' || k === 'window' || k === 'self' || k === 'globalThis') return;
          snap.push([k, typeof v === 'object' ? '[object]' : String(v)]);
        });
      }

      setTimeout(function () {
        parent.postMessage({
          type: 'lab3-report',
          mode: MODE,
          added: added,
          snapshot: snap,
          output: lines,
          error: error,
          hasRawWindow: !!window.__MICRO_APP_PROXY_WINDOW__
        }, '*');
      }, 20);
    <\/script>
    </body></html>`;
  }

  Lab.register({
    id: 'L3',
    order: 3,
    group: '原生基础',
    title: 'with + Proxy 沙箱',
    subtitle: '读穿透、写隔离——两个子应用为什么不会打架',
    render(root) {
      const editor = h('textarea', { style: { minHeight: '132px' } });
      editor.value = DEFAULT_CODE;

      const frameBox = h('div');
      const outBox = UI.log(180);
      const addedCell = h('td', { class: 'mono' }, '-');
      const snapCell = h('td', { class: 'mono' }, '-');
      const modeCell = h('td', { class: 'mono' }, '-');
      const verdict = h('div', { style: { marginTop: '10px' } });

      function run(mode) {
        frameBox.innerHTML = '';
        frameBox.appendChild(UI.frame(buildRunner(editor.value, mode), 130));
        outBox.clear();
        addedCell.textContent = '…';
        snapCell.textContent = '…';
        modeCell.textContent = mode === 'raw' ? 'raw（间接 eval）' : 'with + Proxy';
        verdict.innerHTML = '';
      }

      window.addEventListener('message', (e) => {
        const d = e.data;
        if (!d || d.type !== 'lab3-report') return;
        STATE.lastMode = d.mode;
        STATE.globalKeys = d.added;
        STATE.sandboxKeys = d.snapshot;
        STATE.output = d.output;

        (d.output || []).forEach((line) => outBox.add('info', line));
        if (d.error) outBox.add('err', '抛出异常：' + d.error);
        addedCell.textContent = d.added.length ? d.added.join(', ') : '（无）';
        snapCell.textContent = d.snapshot.length
          ? d.snapshot.map(([k, v]) => k + ' = ' + v).join('\n')
          : '（无）';

        verdict.innerHTML = '';
        if (d.mode === 'raw') {
          verdict.appendChild(UI.badge('真 window 被污染：' + (d.added.join(', ') || '无'), 'err'));
          verdict.appendChild(document.createTextNode(' '));
          verdict.appendChild(UI.badge('沙箱未参与', ''));
        } else if (d.added.length === 0) {
          verdict.appendChild(UI.badge('真 window 零污染 ✓', 'ok'));
          verdict.appendChild(document.createTextNode(' '));
          verdict.appendChild(
            UI.badge('变量全部落在沙箱对象上：' + (d.snapshot.map((s) => s[0]).join(', ') || '—'), 'ok'),
          );
        } else {
          verdict.appendChild(UI.badge('仍有泄漏：' + d.added.join(', '), 'warn'));
        }
      });

      const checks = UI.check(
        [
          {
            label: 'raw 模式：顶层 var 泄漏到了真 window',
            test: () =>
              STATE.lastMode === 'raw' && STATE.globalKeys.length > 0
                ? true
                : '先点「直接执行」，看真 window 新增了哪些键',
            detail: '间接 eval 在全局作用域执行，var / 隐式赋值都会挂到 window',
          },
          {
            label: 'with 沙箱：真 window 没有新增键',
            test: () =>
              STATE.lastMode !== 'raw' && STATE.globalKeys.length === 0
                ? true
                : '点「沙箱执行」，再对比真 window 的键列表',
            detail: '写操作被 Proxy 的 set 拦截，落在伪 window 上',
          },
          {
            label: 'with 沙箱：window.theme 出现在沙箱对象的快照里',
            test: () => {
              if (STATE.lastMode === 'raw') return '先执行一次沙箱模式';
              return STATE.sandboxKeys.some((s) => s[0] === 'theme') ? true : '沙箱快照里没有 theme';
            },
            detail: '沙箱对象才是真正的"子应用 window"',
          },
          {
            label: '读穿透：沙箱里能读到基座的内置对象',
            test: () => {
              if (!STATE.output.length) return '先执行一次沙箱模式';
              return STATE.output.some((l) => l.indexOf('Math.PI') !== -1)
                ? true
                : '输出里没看到读取 Math.PI 的那行';
            },
            detail: 'Proxy.get 找不到就去真 window 取，所以 Math / JSON 都能用',
          },
        ],
        () => Lab.done('L3'),
      );

      root.appendChild(
        UI.head(
          'L3 · 原生基础',
          'with + Proxy：沙箱的真面目',
          '沙箱不是"往 window 上挂一个 microApp 属性"。沙箱是一个伪 window 对象 + Proxy 门面；window.microApp 只是被塞进这个伪 window 里的通信 API。',
        ),
      );

      root.appendChild(
        UI.card(
          'with 语句：让变量查找先落到指定对象上',
          UI.code(
            `const sandbox = { name: 'child' };
const name = 'base';

with (sandbox) {
  console.log(name);  // 'child'  —— 先查 sandbox
  age = 18;           // 落在 sandbox 上，不碰真 window
}
console.log(sandbox.age); // 18`,
            'with 的作用域行为',
          ),
          h('p', null, '但 with 还缺两件事，要靠 Proxy 补：', ),
          h(
            'ul',
            null,
            h('li', null, '子应用读 Math / JSON / document 时 → 沙箱里没有，要能从真 window 借（读穿透）'),
            h('li', null, '子应用写 window.foo → 要落在沙箱上而不是真 window（写隔离）'),
          ),
          UI.code(
            `const proxyWindow = new Proxy(microAppWindow, {
  get(t, k) { return Reflect.has(t, k) ? Reflect.get(t, k) : Reflect.get(rawWindow, k); },
  set(t, k, v) { Reflect.set(t, k, v); return true; },
});

// window / self / globalThis 一律指回代理
microAppWindow.window = microAppWindow.self = microAppWindow.globalThis = proxyWindow;`,
            'Proxy 门面（micro-app 同款）',
          ),
        ),
      );

      root.appendChild(
        UI.card(
          '动手：同一段代码，两种执行方式',
          h('p', null, '修改下面的代码，分别用两种方式执行，观察真 window 的键列表。'),
          editor,
          h(
            'div',
            { class: 'row' },
            h('button', { class: 'btn warn', onclick: () => run('raw') }, '① 直接执行（间接 eval）'),
            h('button', { class: 'btn primary', onclick: () => run('sandbox') }, '② with + Proxy 沙箱执行'),
          ),
          h('div', { class: 'demo' }, h('div', { class: 'demo-label' }, 'EXECUTION ENVIRONMENT'), frameBox),
          h(
            'table',
            { class: 'tbl' },
            h(
              'thead',
              null,
              h('tr', null, h('th', null, '观察项'), h('th', null, '结果')),
            ),
            h(
              'tbody',
              null,
              h('tr', null, h('td', null, '执行方式'), modeCell),
              h('tr', null, h('td', null, '真 window 新增的键'), addedCell),
              h('tr', null, h('td', null, '沙箱对象快照'), snapCell),
            ),
          ),
          verdict,
          h('div', { class: 'demo-label', style: { marginTop: '12px' } }, 'CONSOLE OUTPUT'),
          outBox.el,
        ),
      );

      /* ---------- Proxy trap 观察器：手册 §3.10 源码原理的可交互版 ---------- */

      const trapLog = UI.log(210);
      const cellSandbox = h('td', { class: 'mono' }, 'undefined');
      const cellProxy = h('td', { class: 'mono' }, 'undefined');
      const cellRaw = h('td', { class: 'mono' }, 'undefined');
      const pollutionBadge = h('div', { style: { marginTop: '8px' } });

      // 与 micro-app 同构：CustomWindow 是空类，new 出来的空对象当 Proxy target
      class CustomWindow {}
      const sandboxTarget = new CustomWindow();
      const rawWindow = window;

      function fmt(v) {
        if (v === undefined) return 'undefined';
        if (v === null) return 'null';
        if (typeof v === 'function') return 'ƒ（已 bind）';
        if (typeof v === 'object') return '[object]';
        return JSON.stringify(v);
      }

      const proxyWindow = new Proxy(sandboxTarget, {
        get(target, key) {
          if (Reflect.has(target, key)) {
            trapLog.add('ok', 'GET    ' + String(key) + '  → 命中沙箱：' + fmt(Reflect.get(target, key)));
            return Reflect.get(target, key);
          }
          trapLog.add('info', 'GET    ' + String(key) + '  → 沙箱没有，穿透到真 window（函数会 bind this）');
          const v = Reflect.get(rawWindow, key);
          return typeof v === 'function' ? v.bind(rawWindow) : v;
        },
        set(target, key, value) {
          trapLog.add('msg', 'SET    ' + String(key) + ' = ' + fmt(value) + '  → 只写沙箱，真 window 不动');
          return Reflect.set(target, key, value);
        },
        has(target, key) {
          const inSandbox = Reflect.has(target, key);
          const inRaw = Reflect.has(rawWindow, key);
          trapLog.add(
            'info',
            'HAS    "' + String(key) + '" in window  → ' + (inSandbox || inRaw) +
              '（沙箱 ' + inSandbox + ' / 真 window ' + inRaw + '）',
          );
          return inSandbox || inRaw;
        },
        deleteProperty(target, key) {
          trapLog.add('warn', 'DELETE ' + String(key) + '  → 从沙箱移除，真 window 不受影响');
          return Reflect.deleteProperty(target, key);
        },
        ownKeys(target) {
          const rawKeys = Reflect.ownKeys(rawWindow);
          const ownKeys = Reflect.ownKeys(target);
          const merged = Array.from(new Set(rawKeys.concat(ownKeys)));
          trapLog.add(
            'info',
            'OWN_KEYS  → 真 window ' + rawKeys.length + ' 个键 ∪ 沙箱 ' + ownKeys.length + ' 个 = ' + merged.length + ' 个',
          );
          return merged;
        },
      });

      function paintInspector() {
        const own = Object.prototype.hasOwnProperty.call(sandboxTarget, 'theme');
        cellSandbox.textContent = fmt(own ? sandboxTarget.theme : undefined);
        cellProxy.textContent = fmt(own ? sandboxTarget.theme : rawWindow.theme);
        cellRaw.textContent = fmt(rawWindow.theme);
        pollutionBadge.innerHTML = '';
        pollutionBadge.appendChild(
          rawWindow.theme === undefined
            ? UI.badge('基座真 window.theme 仍是 undefined ✓', 'ok')
            : UI.badge('基座被污染：window.theme = ' + fmt(rawWindow.theme), 'err'),
        );
      }

      const trapButtons = UI.buttons([
        {
          label: '① proxyWindow.theme = "yellow"',
          kind: 'primary',
          onClick: () => {
            proxyWindow.theme = 'yellow';
            paintInspector();
          },
        },
        {
          label: '② 读 proxyWindow.theme',
          onClick: () => {
            const v = proxyWindow.theme;
            trapLog.add('ok', '→ 子应用读到的值：' + fmt(v));
            paintInspector();
          },
        },
        {
          label: '③ 读 proxyWindow.Math.PI',
          onClick: () => {
            trapLog.add('ok', '→ Math.PI = ' + proxyWindow.Math.PI + '（走读穿透）');
            paintInspector();
          },
        },
        {
          label: '④ "theme" in proxyWindow',
          onClick: () => {
            trapLog.add('ok', '→ 结果：' + ('theme' in proxyWindow));
            paintInspector();
          },
        },
        {
          label: '⑤ delete proxyWindow.theme',
          onClick: () => {
            delete proxyWindow.theme;
            paintInspector();
          },
        },
        {
          label: '⑥ Object.keys 的长度',
          onClick: () => {
            trapLog.add('ok', '→ Object.keys(proxyWindow).length = ' + Object.keys(proxyWindow).length);
            paintInspector();
          },
        },
        {
          label: '重置',
          kind: 'ghost',
          onClick: () => {
            delete proxyWindow.theme;
            trapLog.clear();
            trapLog.add('info', '已重置沙箱');
            paintInspector();
          },
        },
      ]);

      root.appendChild(
        UI.card(
          '内核内部：Proxy 的每个 trap 在做什么（本页面真实运行）',
          h(
            'p',
            null,
            '下面这个 ',
            h('code', { class: 'mono' }, 'proxyWindow'),
            ' 是真的 Proxy。点按钮触发各个 trap，日志会告诉你拦截到了什么、值去了哪里。',
          ),
          UI.code(
            `class CustomWindow {}                       // 空类，和 micro-app 源码一样
const sandboxTarget = new CustomWindow();    // 只是一个普通空对象
const proxyWindow = new Proxy(sandboxTarget, { /* 5 个 trap */ });`,
            '沙箱的三个成员：空类 → 空对象 → Proxy 门面',
          ),
          trapButtons,
          h(
            'table',
            { class: 'tbl', style: { marginTop: '12px' } },
            h('thead', null, h('tr', null, h('th', null, '观察点'), h('th', null, 'theme 的值'))),
            h(
              'tbody',
              null,
              h('tr', null, h('td', null, '基座真 window'), cellRaw),
              h('tr', null, h('td', null, 'proxyWindow（子应用代码里的 window）'), cellProxy),
              h('tr', null, h('td', null, 'sandboxTarget = new CustomWindow()'), cellSandbox),
            ),
          ),
          pollutionBadge,
          h('div', { class: 'demo-label', style: { marginTop: '12px' } }, 'TRAP LOG'),
          trapLog.el,
          UI.note(
            '注意这张表里<b>没有 microApp 这一项</b>——沙箱的存在与 <code class="inline">window.microApp</code> 无关。' +
              'micro-app 是在造好沙箱之后，才把通信对象当普通属性挂进沙箱的（<code class="inline">initStaticGlobalKeys</code> 最后一行）。',
            'warn',
          ),
        ),
      );

      paintInspector();

      root.appendChild(
        UI.card(
          '源码对照：本实现的 5 个 trap vs micro-app 的 7 个',
          h(
            'table',
            { class: 'tbl' },
            h(
              'thead',
              null,
              h('tr', null, h('th', null, 'trap'), h('th', null, 'micro-app 的加强处理'), h('th', null, '为什么需要')),
            ),
            h(
              'tbody',
              null,
              h('tr', null, h('td', null, h('code', null, 'get')), h('td', null, '先查 scopeProperties 与 __MICRO_APP_* 前缀；穿透时 bindFunctionToRawTarget'), h('td', null, 'Vue / webpackJsonp 不能穿透；函数不 bind 会 Illegal invocation')),
              h('tr', null, h('td', null, h('code', null, 'set')), h('td', null, 'location 直写真 window；escapeProperties 同时写回真 window 并记账'), h('td', null, '地址栏归基座；UMD / SystemJS 必须活在最外层')),
              h('tr', null, h('td', null, h('code', null, 'has')), h('td', null, 'scopeProperties 未被注入时强制返回 false'), h('td', null, '否则子应用会把基座的 Vue 当成自己的')),
              h('tr', null, h('td', null, h('code', null, 'getOwnPropertyDescriptor')), h('td', null, '用 descriptorTargetMap 记录来源，供 defineProperty 使用'), h('td', null, 'Object.defineProperty 是"先读后写"两步操作')),
              h('tr', null, h('td', null, h('code', null, 'defineProperty')), h('td', null, '按上一步记录的来源，落到 target 或 rawWindow'), h('td', null, '写错目标会让原生属性失效')),
              h('tr', null, h('td', null, h('code', null, 'ownKeys')), h('td', null, '真 window ∪ 沙箱去重'), h('td', null, '子应用遍历全局变量时不能"少看见"')),
              h('tr', null, h('td', null, h('code', null, 'deleteProperty')), h('td', null, '逃逸过的键连真 window 一起删'), h('td', null, '否则卸载后真 window 留残渣')),
            ),
          ),
          UI.note(
            '本页观察器只实现了 5 个 trap，是为了让日志可读。七个 trap 的完整源码见手册 §3.10.3（' +
              '<code class="inline">lib/index.esm.js:3452</code>）。',
          ),
        ),
      );

      root.appendChild(
        UI.card(
          '一个必须知道的边界',
          UI.note(
            '沙箱只拦得住 <b>window.xxx = ...</b> 和 <b>with 作用域内的隐式赋值</b>。' +
              '如果子应用在非严格模式下写裸赋值（<code class="inline">theme = 1</code> 且作用域链上找不到声明），' +
              '赋值会漏到真 window —— 这是 with 沙箱的固有短板，micro-app 也是靠子应用规范（严格模式/显式声明）来规避。',
            'warn',
          ),
          h(
            'div',
            { class: 'row' },
            h(
              'button',
              {
                class: 'btn',
                onclick: () => {
                  editor.value = "leaked = 'oops';  // 裸赋值\nconsole.log('裸赋值执行完毕');";
                  run('sandbox');
                },
              },
              '试一试：裸赋值会漏吗？',
            ),
          ),
        ),
      );

      root.appendChild(UI.card('验收', checks.el));

      run('sandbox');
    },
  });
})();
