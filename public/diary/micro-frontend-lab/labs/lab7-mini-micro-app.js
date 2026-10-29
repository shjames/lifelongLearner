/* Lab 7 · 迷你微前端
   目标：用约 260 行的内核，把前面六节的知识组装成一个能真正跑起来的微前端 */
(function () {
  'use strict';
  const { h, UI, Lab, MiniMicroApp } = window;
  const { registerApp, defineTag } = MiniMicroApp;

  /* ---------------- 两个演示子应用（独立"构建产物"） ---------------- */

  const APPS = {
    'app-a': {
      html: '<div id="app-root"></div>',
      css: `body { background: #3d2f0a; padding: 10px; border-radius: 8px; }
.box { background: #fbbf24; color: #1a1a1a; padding: 12px; border-radius: 8px; font-family: system-ui; font-size: 13px; }
.box b { font-size: 14px; }
.count { font-family: monospace; font-weight: 700; }
button { margin-top: 8px; padding: 4px 10px; border-radius: 6px; border: 1px solid #a16207; background: #fde68a; cursor: pointer; }
.tip { margin-top: 6px; font-size: 11px; color: #7c2d12; }`,
      js: `
var state = { count: 0 };
window.theme = 'yellow';

function render() {
  var root = document.getElementById('app-root');
  root.innerHTML =
    '<div class="box">' +
      '<b>子应用 A</b> · window.theme = ' + window.theme +
      '<div>计数：<span class="count">' + state.count + '</span></div>' +
      '<button data-act="inc">点我 +1</button>' +
      '<div class="tip">我的 body 背景是深黄，但基座没变</div>' +
    '</div>';
  root.querySelector('[data-act="inc"]').addEventListener('click', function () {
    state.count++;
    render();
  });
}

microApp.addDataListener(function (data) {
  var root = document.getElementById('app-root');
  var tip = document.createElement('div');
  tip.className = 'tip';
  tip.textContent = '收到基座消息：' + JSON.stringify(data);
  root.appendChild(tip);
}, true);

render();
microApp.dispatch({ type: 'READY', app: 'app-a', theme: window.theme });
`,
    },
    'app-b': {
      html: '<div id="app-root"></div>',
      css: `body { background: #0f2742; padding: 10px; border-radius: 8px; }
.box { background: #60a5fa; color: #0b1220; padding: 12px; border-radius: 8px; font-family: system-ui; font-size: 13px; }
.box b { font-size: 14px; }
.count { font-family: monospace; font-weight: 700; }
button { margin-top: 8px; padding: 4px 10px; border-radius: 6px; border: 1px solid #1d4ed8; background: #bfdbfe; cursor: pointer; }
.tip { margin-top: 6px; font-size: 11px; color: #0c2d57; }`,
      js: `
var state = { count: 100 };
window.theme = 'blue';

function render() {
  var root = document.getElementById('app-root');
  root.innerHTML =
    '<div class="box">' +
      '<b>子应用 B</b> · window.theme = ' + window.theme +
      '<div>计数：<span class="count">' + state.count + '</span></div>' +
      '<button data-act="inc">点我 +1</button>' +
      '<div class="tip">我的 body 背景是深蓝，和 A 互不影响</div>' +
    '</div>';
  root.querySelector('[data-act="inc"]').addEventListener('click', function () {
    state.count++;
    render();
  });
}

microApp.addDataListener(function (data) {
  var root = document.getElementById('app-root');
  var tip = document.createElement('div');
  tip.className = 'tip';
  tip.textContent = '收到基座消息：' + JSON.stringify(data);
  root.appendChild(tip);
}, true);

render();
microApp.dispatch({ type: 'READY', app: 'app-b', theme: window.theme });
`,
    },
  };

  Object.keys(APPS).forEach((name) => registerApp(name, APPS[name]));
  defineTag('mini-app');

  const STATE = {
    active: new Set(),
    mountedOnce: false,
    messages: 0,
    themes: {},
    baseTheme: undefined,
  };

  Lab.register({
    id: 'L7',
    order: 7,
    group: '组装',
    title: '迷你微前端',
    subtitle: '把前六节拼成一个能跑的内核',
    render(root) {
      const lifeLog = UI.log(150);
      const msgLog = UI.log(120);
      const slotA = h('div', { class: 'slot', dataset: { app: 'app-a' }, style: { marginBottom: '12px' } });
      const slotB = h('div', { class: 'slot', dataset: { app: 'app-b' } });
      const themeCellA = h('td', { class: 'mono' }, '—');
      const themeCellB = h('td', { class: 'mono' }, '—');
      const baseThemeCell = h('td', { class: 'mono' }, '—');
      const stage = h('div', { class: 'demo' }, h('div', { class: 'demo-label' }, 'STAGE · 基座内容区'), slotA, slotB);

      const msgInput = h('input', { type: 'text', value: '{"notice":"v2 版本已发布"}', style: { flex: '1 1 300px' } });

      function slots() {
        return { 'app-a': slotA, 'app-b': slotB };
      }

      function refreshIsolation() {
        STATE.baseTheme = window.theme;
        baseThemeCell.textContent =
          window.theme === undefined ? 'undefined（未被污染 ✓）' : JSON.stringify(window.theme);

        ['app-a', 'app-b'].forEach((name) => {
          const el = slots()[name].querySelector('mini-app');
          const snap = el ? el.getSandboxSnapshot() : [];
          const hit = snap.find((s) => s[0] === 'theme');
          STATE.themes[name] = hit ? hit[1] : undefined;
          const cell = name === 'app-a' ? themeCellA : themeCellB;
          cell.textContent = el ? (hit ? hit[1] : '（未设置）') : '（未挂载）';
        });
      }

      function mount(name) {
        const slot = slots()[name];
        if (slot.querySelector('mini-app')) {
          UI.toast(name + ' 已经在运行', 'err');
          return;
        }
        const el = document.createElement('mini-app');
        el.setAttribute('name', name); // 必须先设属性再插入，否则 connectedCallback 拿不到 name
        slot.appendChild(el);
        STATE.active.add(name);
        STATE.mountedOnce = true;
        refreshIsolation();
      }

      function unmount(name) {
        const el = slots()[name].querySelector('mini-app');
        if (!el) {
          UI.toast(name + ' 本来就没挂载', 'err');
          return;
        }
        el.remove();
        STATE.active.delete(name);
        refreshIsolation();
      }

      function sendTo(name, data) {
        const el = slots()[name].querySelector('mini-app');
        if (!el) {
          UI.toast('先挂载 ' + name, 'err');
          return;
        }
        el.setData(data);
        STATE.messages += 1;
        msgLog.add('msg', `基座 → ${name}：${JSON.stringify(data)}`);
      }

      /* 生命周期 / 消息监听（委托到章节根节点，事件会冒泡） */
      root.addEventListener('app-lifecycle', (e) => {
        const d = e.detail;
        lifeLog.add(
          'life',
          `${String(d.phase).padEnd(12)} ${d.name || ''}${d.message ? ' · ' + d.message : ''}`,
        );
        if (d.phase === 'mounted') refreshIsolation();
      });
      root.addEventListener('app-message', (e) => {
        const { app, data } = e.detail;
        msgLog.add('info', `${app} → 基座：${JSON.stringify(data)}`);
        STATE.messages += 1;
      });

      const checks = UI.check(
        [
          {
            label: 'mini-app 自定义元素已注册',
            test: () => (customElements.get('mini-app') ? true : '内核未初始化'),
            detail: '其实就是 Lab 1 学的 customElements.define',
          },
          {
            label: '挂载后子应用 DOM 出现在 <mini-app-body> 里',
            test: () => {
              const el = slotA.querySelector('mini-app');
              if (!el) return '先点「挂载 A」';
              const body = el.querySelector('mini-app-body');
              return body && body.querySelector('#app-root')
                ? true
                : '没找到 mini-app-body 里的挂载节点';
            },
            detail: 'DOM 被搬进基座文档，而不是塞在 iframe 里',
          },
          {
            label: '样式被隔离：A、B 的 body 背景互不影响',
            test: () => {
              const a = slotA.querySelector('mini-app');
              const b = slotB.querySelector('mini-app');
              if (!a || !b) return '先把 A、B 都挂载';
              const bgA = getComputedStyle(a.querySelector('mini-app-body')).backgroundColor;
              const bgB = getComputedStyle(b.querySelector('mini-app-body')).backgroundColor;
              return bgA !== bgB
                ? true
                : `A 和 B 的背景相同（${bgA}），说明前缀没生效`;
            },
            detail: '两条 CSS 都写了 body{background}，靠宿主前缀分开',
          },
          {
            label: '沙箱隔离：A 的 window.theme 与 B 不同，且基座未被污染',
            test: () => {
              if (!STATE.themes['app-a'] || !STATE.themes['app-b'])
                return '先把 A、B 都挂载，再看隔离面板';
              if (STATE.themes['app-a'] === STATE.themes['app-b'])
                return '两个子应用的 theme 相同，沙箱没隔离住';
              if (window.theme !== undefined) return '基座 window.theme 被污染了';
              return true;
            },
            detail: 'A=yellow、B=blue，基座 window.theme = undefined',
          },
          {
            label: '通信走通：基座发消息、子应用 dispatch 回消息',
            test: () => (STATE.messages > 0 ? true : '点「发送给 A」或观察挂载时的 READY 消息'),
            detail: 'READY 是子应用 dispatch 的，基座消息是 setData 下发的',
          },
        ],
        () => Lab.done('L7'),
      );

      root.appendChild(
        UI.head(
          'L7 · 组装',
          '迷你微前端：260 行内核跑起来',
          '这一节把前面的零件装到一起：自定义元素负责生命周期，with + Proxy 负责 JS 隔离，CSS 前缀负责样式隔离，事件中心负责通信。两个子应用同时运行，互不干扰。',
        ),
      );

      root.appendChild(
        UI.card(
          '动手：同时挂载两个子应用',
          h(
            'div',
            { class: 'row' },
            h('button', { class: 'btn primary', onclick: () => mount('app-a') }, '挂载 A'),
            h('button', { class: 'btn', onclick: () => unmount('app-a') }, '卸载 A'),
            h('button', { class: 'btn primary', onclick: () => mount('app-b') }, '挂载 B'),
            h('button', { class: 'btn', onclick: () => unmount('app-b') }, '卸载 B'),
            h(
              'button',
              {
                class: 'btn ghost',
                onclick: () => {
                  unmount('app-a');
                  unmount('app-b');
                  lifeLog.clear();
                  msgLog.clear();
                  STATE.messages = 0;
                  refreshIsolation();
                },
              },
              '全部重置',
            ),
          ),
          stage,
          h('div', { class: 'demo-label', style: { marginTop: '12px' } }, '基座 → 子应用（setData）'),
          h(
            'div',
            { class: 'row' },
            msgInput,
            h('button', { class: 'btn', onclick: () => { sendTo('app-a', safeParse(msgInput.value)); } }, '发送给 A'),
            h('button', { class: 'btn', onclick: () => { sendTo('app-b', safeParse(msgInput.value)); } }, '发送给 B'),
          ),
          h(
            'div',
            { class: 'split', style: { marginTop: '12px' } },
            h('div', null, h('div', { class: 'demo-label' }, '生命周期'), lifeLog.el),
            h('div', null, h('div', { class: 'demo-label' }, '消息'), msgLog.el),
          ),
        ),
      );

      root.appendChild(
        UI.card(
          '隔离验证面板',
          h(
            'table',
            { class: 'tbl' },
            h('thead', null, h('tr', null, h('th', null, '位置'), h('th', null, 'window.theme 的值'))),
            h(
              'tbody',
              null,
              h('tr', null, h('td', null, '基座 window'), baseThemeCell),
              h('tr', null, h('td', null, '子应用 A 的沙箱'), themeCellA),
              h('tr', null, h('td', null, '子应用 B 的沙箱'), themeCellB),
            ),
          ),
          h(
            'div',
            { class: 'row', style: { marginTop: '8px' } },
            h('button', { class: 'btn', onclick: refreshIsolation }, '刷新隔离面板'),
          ),
          UI.note(
            '三个 theme 值各不相同，就是"写隔离"最直观的证据。' +
              '代码里的 <code class="inline">document.getElementById("app-root")</code> 在两个子应用里都存在，' +
              '但因为 <code class="inline">document</code> 被替换成限定在各自容器内的代理，所以互不干扰。',
            'ok',
          ),
        ),
      );

      root.appendChild(
        UI.card(
          '内核结构（对应 micro-app 的真实实现）',
          h(
            'table',
            { class: 'tbl' },
            h(
              'thead',
              null,
              h('tr', null, h('th', null, '本实现'), h('th', null, 'micro-app 对应物'), h('th', null, '作用')),
            ),
            h(
              'tbody',
              null,
              h('tr', null, h('td', null, 'MiniAppElement'), h('td', null, 'MicroAppElement'), h('td', null, '自定义元素 + 生命周期')),
              h('tr', null, h('td', null, 'WithSandbox'), h('td', null, 'WithSandBox / IframeSandbox'), h('td', null, 'JS 隔离')),
              h('tr', null, h('td', null, 'scopeCSS'), h('td', null, 'CSSParser'), h('td', null, '样式隔离')),
              h('tr', null, h('td', null, 'EventCenter'), h('td', null, 'EventCenter'), h('td', null, '通信')),
              h('tr', null, h('td', null, 'createScopedDocument'), h('td', null, 'patchDocument'), h('td', null, 'DOM 查询作用域')),
            ),
          ),
          UI.note(
            '真实 micro-app 还多做了：<b>资源加载</b>（fetch entry HTML、补全路径）、' +
              '<b>memory router</b>（代理 location/history）、<b>事件与定时器回收</b>、<b>keep-alive / 预渲染</b>。' +
              '核心思想与这里完全一致。',
            'warn',
          ),
        ),
      );

      root.appendChild(UI.card('验收', checks.el));

      /* 从其他章节切回来时，恢复已挂载的子应用 */
      ['app-a', 'app-b'].forEach((name) => {
        if (STATE.active.has(name)) {
          const el = document.createElement('mini-app');
          el.setAttribute('name', name);
          slots()[name].appendChild(el);
        }
      });
      refreshIsolation();
    },
  });

  function safeParse(str) {
    try {
      return JSON.parse(str);
    } catch (e) {
      return { raw: str };
    }
  }
})();
