/* Lab 6 · 路由
   目标：看清 native / native-scope / pure 三种模式下，地址栏与子应用 location 的差异 */
(function () {
  'use strict';
  const { h, UI, Lab } = window;

  const ORIGINS = {
    base: 'http://crm-sg-test.kpay-test.com',
    child: 'http://iam.test.a.kpay-test.com',
  };

  const STATE = {
    mode: 'native-scope',
    basePath: '/system/roleList',
    childPath: '/userList',
    history: ['/system/roleList'],
    seen: {},
  };

  function derive() {
    const { mode, basePath, childPath } = STATE;
    const addressBar = ORIGINS.base + basePath;

    let childHref;
    if (mode === 'native') {
      childHref = ORIGINS.base + basePath;
    } else if (mode === 'native-scope') {
      childHref = ORIGINS.child + basePath;
    } else {
      childHref = ORIGINS.child + childPath;
    }

    let childRouterPath;
    if (mode === 'pure') childRouterPath = childPath;
    else childRouterPath = basePath;

    return {
      addressBar,
      childHref,
      childOrigin: mode === 'native' ? ORIGINS.base : ORIGINS.child,
      childRouterPath,
      sameAsBase: addressBar === childHref.split('?')[0],
    };
  }

  Lab.register({
    id: 'L6',
    order: 6,
    group: '协作机制',
    title: '路由同步',
    subtitle: '地址栏到底归谁管',
    render(root) {
      const addressBar = h('code', { class: 'mono', style: { fontSize: '13px' } }, '-');
      const childHref = h('code', { class: 'mono', style: { fontSize: '13px' } }, '-');
      const childOrigin = h('td', { class: 'mono' }, '-');
      const childRouterPath = h('td', { class: 'mono' }, '-');
      const modeDesc = h('div', { style: { marginTop: '10px' } });
      const historyBox = h('div', { class: 'demo', style: { maxHeight: '150px', overflowY: 'auto' } });
      const log = UI.log(140);

      function paint() {
        const d = derive();
        addressBar.textContent = d.addressBar;
        childHref.textContent = d.childHref;
        childOrigin.textContent = d.childOrigin;
        childRouterPath.textContent = d.childRouterPath;

        modeDesc.innerHTML = '';
        const desc = {
          native: '子应用直接用基座的 location，origin 也是基座的。适合路由天然对齐的老项目。',
          'native-scope': '用基座的地址栏，但 location.origin 指回子应用自己。子应用拼资源、跳登录不会跑到基座域名下。本项目采用。',
          pure: '地址栏完全不动，子应用内部路由独立变化。适合弹窗式、嵌入式子应用。',
        }[STATE.mode];
        modeDesc.appendChild(UI.badge(STATE.mode, ''));
        modeDesc.appendChild(document.createTextNode(' ' + desc));

        historyBox.innerHTML = '';
        STATE.history.slice(-8).forEach((p, i, arr) => {
          historyBox.appendChild(
            h(
              'div',
              { class: 'log-line ' + (i === arr.length - 1 ? 'ok' : 'info') },
              h('span', { class: 't' }, i === arr.length - 1 ? '→' : '·'),
              h('span', { class: 'm' }, ORIGINS.base + p),
            ),
          );
        });
        STATE.seen[STATE.mode] = true;
      }

      function childGo(path) {
        if (STATE.mode === 'pure') {
          STATE.childPath = path;
          log.add('info', `子应用内部 push('${path}')：pure 模式不改地址栏`);
        } else {
          STATE.basePath = path;
          STATE.childPath = path;
          STATE.history.push(path);
          log.add('info', `子应用 push('${path}') → 同步到基座地址栏`);
        }
        paint();
      }

      function baseGo(path) {
        STATE.basePath = path;
        STATE.history.push(path);
        log.add('msg', `基座 history.push('${path}') → 下发 MASTER_ROUTES_CHANGE`);
        paint();
      }

      const checks = UI.check(
        [
          {
            label: 'native-scope：地址栏是基座路径，location.origin 是子应用域名',
            test: () => {
              if (!STATE.seen['native-scope']) return '先切到 native-scope 模式看看';
              const saved = STATE.mode;
              STATE.mode = 'native-scope';
              const d = derive();
              STATE.mode = saved;
              return d.childOrigin === ORIGINS.child && d.addressBar.startsWith(ORIGINS.base)
                ? true
                : '实际：' + JSON.stringify(d);
            },
            detail: '本项目用的就是这种模式',
          },
          {
            label: 'pure：子应用跳转不改基座地址栏',
            test: () => {
              const saved = STATE.mode;
              STATE.mode = 'pure';
              const before = derive().addressBar;
              const savedBase = STATE.basePath;
              const savedChild = STATE.childPath;
              STATE.childPath = '/another';
              const after = derive().addressBar;
              STATE.mode = saved;
              STATE.basePath = savedBase;
              STATE.childPath = savedChild;
              return before === after ? true : 'pure 模式下地址栏还是变了';
            },
            detail: '地址栏归基座，pure 模式下子应用路由只在自己内部变化',
          },
          {
            label: 'native：子应用的 location 完全等于基座',
            test: () => {
              const saved = STATE.mode;
              STATE.mode = 'native';
              const d = derive();
              STATE.mode = saved;
              return d.addressBar === d.childHref ? true : '实际：' + d.addressBar + ' vs ' + d.childHref;
            },
            detail: 'origin 和 path 都指向基座',
          },
          {
            label: '三种模式都切换观察过',
            test: () => {
              const n = ['native', 'native-scope', 'pure'].filter((m) => STATE.seen[m]).length;
              return n === 3 ? true : '还差 ' + (3 - n) + ' 种模式没看过';
            },
            detail: '',
          },
        ],
        () => Lab.done('L6'),
      );

      root.appendChild(
        UI.head(
          'L6 · 协作机制',
          '路由：地址栏归基座，路径认知归子应用',
          '子应用自带 react-router，它要看 location、要 push。但地址栏是基座的。memory router 的做法是：给子应用一个"代理 location"，push 时同步给基座。',
        ),
      );

      root.appendChild(
        UI.card(
          '动手：三种模式对比',
          h(
            'div',
            { class: 'row' },
            h('button', { class: 'btn', onclick: () => { STATE.mode = 'native'; paint(); } }, 'native'),
            h('button', { class: 'btn primary', onclick: () => { STATE.mode = 'native-scope'; paint(); } }, 'native-scope（本项目）'),
            h('button', { class: 'btn', onclick: () => { STATE.mode = 'pure'; paint(); } }, 'pure'),
          ),
          h(
            'div',
            { class: 'demo' },
            h('div', { class: 'demo-label' }, '模拟浏览器地址栏'),
            addressBar,
            h('div', { class: 'demo-label', style: { marginTop: '12px' } }, '子应用内 window.location.href'),
            childHref,
            modeDesc,
          ),
          h(
            'table',
            { class: 'tbl' },
            h('thead', null, h('tr', null, h('th', null, '子应用看到的'), h('th', null, '值'))),
            h(
              'tbody',
              null,
              h('tr', null, h('td', null, 'location.origin'), childOrigin),
              h('tr', null, h('td', null, 'router 实际匹配的 path'), childRouterPath),
            ),
          ),
          h(
            'div',
            { class: 'row' },
            h('button', { class: 'btn primary', onclick: () => childGo('/system/userList') }, '子应用 push(/system/userList)'),
            h('button', { class: 'btn', onclick: () => baseGo('/merchant/list') }, '基座 push(/merchant/list)'),
            h(
              'button',
              {
                class: 'btn ghost',
                onclick: () => {
                  STATE.basePath = '/system/roleList';
                  STATE.childPath = '/userList';
                  STATE.history = ['/system/roleList'];
                  paint();
                  log.clear();
                  log.add('warn', '已重置');
                },
              },
              '重置',
            ),
          ),
          h('div', { class: 'demo-label', style: { marginTop: '12px' } }, 'ADDRESS HISTORY'),
          historyBox,
          log.el,
        ),
      );

      root.appendChild(
        UI.card(
          '实现要点',
          UI.code(
            `// 子应用读到的 location 是代理对象
const proxyLocation = new Proxy({}, {
  get(_, key) {
    if (key === 'href')   return childOrigin + microPath;
    if (key === 'origin') return childOrigin;      // native-scope 的关键
    return microPathInfo[key];
  },
});

// push 不直接改浏览器，而是先改"子应用视角的路径"，再通知基座
microHistory.pushState = (state, title, url) => {
  updateMicroLocation(url, 'push');
};`,
            'memory router 的核心',
          ),
          UI.note(
            '本项目在 <code class="inline">src/app.tsx:241-255</code> 的 <code class="inline">onRouteChange</code> 里，' +
              '匹配到带 <code class="inline">system</code> 字段的路由就 <code class="inline">microApp.setData(system, { location, type: MASTER_ROUTES_CHANGE })</code>，' +
              '子应用收到后再同步自己的 router。基座永远不直接操作子应用的内部路由。',
          ),
        ),
      );

      root.appendChild(UI.card('验收', checks.el));
      paint();
    },
  });
})();
