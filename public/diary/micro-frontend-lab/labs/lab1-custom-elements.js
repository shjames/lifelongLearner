/* Lab 1 · Custom Elements 自定义元素
   目标：亲手注册一个标签，看到浏览器的四个生命周期回调按什么顺序触发 */
(function () {
  'use strict';
  const { h, UI, Lab } = window;

  const STATE = { defined: false, events: [], count: 0 };
  let log = null;
  let store = null;

  function renderCard(el) {
    const title = el.getAttribute('title') || '未命名卡片';
    const tone = el.getAttribute('tone') || 'default';
    const palette = {
      default: ['#1d2531', '#e6edf6', '#26303f'],
      warm: ['#3d2f0a', '#ffd200', '#6b5310'],
      cool: ['#0f2742', '#7fb3ff', '#1b3b60'],
    };
    const [bg, fg, border] = palette[tone] || palette.default;
    el.shadowRoot.innerHTML = `
      <style>
        :host { display:block; font-family: system-ui, sans-serif; }
        .card { background:${bg}; color:${fg}; border:1px solid ${border};
                border-radius:10px; padding:12px 14px; }
        .tag { font-size:11px; opacity:.7; font-family:monospace; }
        .title { font-size:15px; font-weight:600; margin-top:4px; }
      </style>
      <div class="card">
        <div class="tag">&lt;my-card tone="${tone}"&gt;</div>
        <div class="title">${escapeHtml(title)}</div>
      </div>`;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  }

  function defineElement() {
    if (STATE.defined) {
      UI.toast('已定义过。customElements.define 同名二次调用会抛 NotSupportedError', 'err');
      return false;
    }
    class MyCard extends HTMLElement {
      static get observedAttributes() {
        return ['title', 'tone'];
      }
      constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        STATE.events.push('constructor');
        log.add('life', 'constructor()            · 实例被创建');
      }
      connectedCallback() {
        STATE.events.push('connected');
        log.add('life', 'connectedCallback()       · 插入文档，开始渲染');
        renderCard(this);
      }
      disconnectedCallback() {
        STATE.events.push('disconnected');
        log.add('life', 'disconnectedCallback()    · 移出文档');
      }
      attributeChangedCallback(name, oldValue, newValue) {
        STATE.events.push('attr:' + name);
        log.add('life', `attributeChangedCallback('${name}')  ${oldValue} → ${newValue}`);
        if (this.isConnected) renderCard(this);
      }
    }
    customElements.define('my-card', MyCard);
    STATE.defined = true;
    log.add('ok', "customElements.define('my-card', MyCard) 执行成功");
    return true;
  }

  function insertCard(title, tone) {
    if (!STATE.defined) {
      UI.toast('先把元素定义好', 'err');
      return;
    }
    STATE.count += 1;
    const el = document.createElement('my-card');
    el.setAttribute('title', title || '第 ' + STATE.count + ' 张卡片');
    el.setAttribute('tone', tone || 'default');
    el.dataset.n = String(STATE.count);
    store.appendChild(el);
    log.add('info', `document.createElement('my-card') + setAttribute → 插入 <my-card-body>`);
  }

  function changeAttr() {
    const el = store.querySelector('my-card');
    if (!el) {
      UI.toast('先插入一张卡片', 'err');
      return;
    }
    const next = el.getAttribute('tone') === 'warm' ? 'cool' : 'warm';
    el.setAttribute('tone', next); // 触发 attributeChangedCallback
  }

  function removeOne() {
    const el = store.lastElementChild;
    if (!el) {
      UI.toast('容器里没有卡片', 'err');
      return;
    }
    el.remove(); // 触发 disconnectedCallback
  }

  Lab.register({
    id: 'L1',
    order: 1,
    group: '原生基础',
    title: '自定义元素',
    subtitle: '浏览器如何认识 <micro-app> 这个标签',
    render(root) {
      log = UI.log(200);

      const titleInput = h('input', { type: 'text', value: '管理员角色', style: { width: '180px' } });
      const toneSelect = h(
        'select',
        null,
        h('option', { value: 'default' }, 'default'),
        h('option', { value: 'warm' }, 'warm'),
        h('option', { value: 'cool' }, 'cool'),
      );
      store = h('div', {
        style: { display: 'flex', flexDirection: 'column', gap: '10px', minHeight: '60px' },
      });

      const checks = UI.check(
        [
          {
            label: '已调用 customElements.define 注册 <my-card>',
            test: () => (customElements.get('my-card') ? true : '还没注册，点「① 定义元素」'),
            detail: 'customElements.get("my-card") 有值',
          },
          {
            label: '插入元素时触发了 connectedCallback',
            test: () => (STATE.events.includes('connected') ? true : '先插入一张卡片'),
            detail: '插入文档 → 回调执行 → 内容渲染出来',
          },
          {
            label: '修改属性时触发了 attributeChangedCallback',
            test: () =>
              STATE.events.some((e) => e.indexOf('attr:') === 0)
                ? true
                : '点「③ 改 tone 属性」，观察颜色变化',
            detail: 'observedAttributes 里声明的属性才会触发',
          },
          {
            label: '移除元素时触发了 disconnectedCallback',
            test: () => (STATE.events.includes('disconnected') ? true : '点「④ 移除最后一张」'),
            detail: '卸载时要靠它清理定时器 / 事件监听',
          },
        ],
        () => Lab.done('L1'),
      );

      root.appendChild(
        UI.head(
          'L1 · 原生基础',
          '自定义元素：<micro-app> 为什么能动起来',
          '浏览器对未知标签是宽容的：会正常解析、正常渲染，但没有任何行为。要让一个标签拥有 JavaScript 行为，只需要两步：标签名带短横线 + customElements.define() 注册一个继承 HTMLElement 的类。',
        ),
      );

      root.appendChild(
        UI.card(
          '浏览器规则',
          h(
            'ul',
            null,
            h('li', null, '标签名必须含短横线（kebab-case），否则会和未来原生标签冲突'),
            h('li', null, '注册后，页面上任何 <my-card>（HTML 写的或 createElement 建的）都自动拥有行为'),
            h('li', null, 'static observedAttributes 只声明想监听的属性，其他属性变化不触发回调'),
          ),
          UI.code(
            `class MiniApp extends HTMLElement {
  static get observedAttributes() { return ['name', 'url']; }

  constructor()            { super(); this.attachShadow({ mode: 'open' }); }
  connectedCallback()      { this.load(this.getAttribute('url')); }
  disconnectedCallback()   { this.destroy(); }
  attributeChangedCallback(attr, oldVal, newVal) { if (oldVal !== newVal) this.reload(); }
}

customElements.define('mini-app', MiniApp);`,
            '最小可用实现',
          ),
        ),
      );

      root.appendChild(
        UI.card(
          '动手：让一个标签活起来',
          h('p', null, '按 ①→②→③→④ 的顺序点，右侧日志会按浏览器真实顺序输出回调。'),
          h(
            'div',
            { class: 'row' },
            h('button', { class: 'btn', onclick: defineElement }, '① 定义 <my-card>'),
            h(
              'button',
              { class: 'btn primary', onclick: () => insertCard(titleInput.value, toneSelect.value) },
              '② 插入一张卡片',
            ),
            h('button', { class: 'btn', onclick: changeAttr }, '③ 改 tone 属性'),
            h('button', { class: 'btn warn', onclick: removeOne }, '④ 移除最后一张'),
          ),
          h('div', { class: 'row' }, titleInput, toneSelect, UI.badge('title / tone', '')),
          h('div', { class: 'demo' }, h('div', { class: 'demo-label' }, 'RENDER TARGET'), store),
          h('div', { class: 'demo-label', style: { marginTop: '12px' } }, 'LIFECYCLE LOG'),
          log.el,
          UI.note(
            '注意顺序：<b>setAttribute 在插入前调用时</b>，构造器里有 shadowRoot 才能渲染；所以演示里 connectedCallback 才 render。真实 micro-app 用 <code class="inline">defer()</code> + 连接计数防止 keep-alive 场景重复渲染。',
          ),
        ),
      );

      root.appendChild(UI.card('验收', h('p', null, '四个回调都亲眼看到过，再运行验收。'), checks.el));
    },
  });
})();
