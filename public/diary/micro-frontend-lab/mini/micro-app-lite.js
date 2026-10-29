/* ============================================================
   micro-app-lite.js —— 一个约 260 行的微前端内核
   与 micro-app 1.0 同原理的最小实现：
     · 自定义元素 <mini-app>
     · with + Proxy 沙箱（读穿透 / 写隔离）
     · CSS 选择器前缀隔离
     · 事件中心通信（setData / dispatch / forceDispatch）
     · 生命周期事件（created / beforemount / mounted / unmount / error）
   供 Lab 5 / Lab 7 使用，也可单独阅读源码学习。
   ============================================================ */
(function (global) {
  'use strict';

  /* ---------- 1. 事件中心 ---------- */
  class EventCenter {
    constructor() {
      this.channels = new Map();
    }
    channel(name) {
      if (!this.channels.has(name)) this.channels.set(name, { data: null, listeners: new Set() });
      return this.channels.get(name);
    }
    on(name, cb, autoTrigger) {
      const ch = this.channel(name);
      ch.listeners.add(cb);
      if (autoTrigger && ch.data !== null) cb(ch.data);
    }
    off(name, cb) {
      const ch = this.channels.get(name);
      if (ch) ch.listeners.delete(cb);
    }
    offAll(name) {
      const ch = this.channels.get(name);
      if (ch) ch.listeners.clear();
    }
    dispatch(name, data) {
      const ch = this.channel(name);
      ch.data = data;
      return [...ch.listeners].map((cb) => cb(data));
    }
    async dispatchAsync(name, data) {
      const ch = this.channel(name);
      ch.data = data;
      return Promise.all([...ch.listeners].map((cb) => cb(data)));
    }
    getData(name) {
      const ch = this.channels.get(name);
      return ch ? ch.data : null;
    }
  }

  /* ---------- 2. CSS 作用域改写 ---------- */
  /**
   * @param {string} css      原始 CSS
   * @param {string} appName  子应用名
   * @param {boolean} enabled 是否开启
   * @param {string} tag      宿主标签名，默认 mini-app
   */
  function scopeCSS(css, appName, enabled, tag) {
    if (enabled === false) return css;
    const host = tag || 'mini-app';
    const prefix = `${host}[name=${appName}]`;
    const noComment = css.replace(/\/\*[\s\S]*?\*\//g, '');
    return noComment.replace(/(^|[}])\s*([^{}@]+)\{([^{}]*)\}/g, (m, lead, selector, body) => {
      const scoped = selector
        .split(',')
        .map((raw) => {
          const sel = raw.trim();
          if (!sel) return '';
          if (/^(html|:root)$/.test(sel)) return prefix;
          if (sel === 'body' || /^html\s*>\s*body$/.test(sel)) return prefix + ' ' + host + '-body';
          return prefix + ' ' + sel;
        })
        .filter(Boolean)
        .join(',\n');
      return (lead === '}' ? '}\n' : '') + scoped + ' {\n' + body.trim() + '\n}';
    });
  }

  /* ---------- 3. 作用域化的 document ---------- */
  function createScopedDocument(container) {
    const rawDocument = global.document;
    return new Proxy(rawDocument, {
      get(target, key) {
        if (key === 'querySelector') return (sel) => container.querySelector(sel);
        if (key === 'querySelectorAll') return (sel) => container.querySelectorAll(sel);
        if (key === 'getElementById') {
          return (id) => container.querySelector('#' + global.CSS.escape(id));
        }
        if (key === 'body' || key === 'documentElement') return container;
        const value = Reflect.get(target, key);
        if (typeof value === 'function') return value.bind(target);
        return value;
      },
    });
  }

  /* ---------- 4. with + Proxy 沙箱 ---------- */
  class WithSandbox {
    constructor(appName, host, tag) {
      this.appName = appName;
      this.tag = tag;
      this.host = host;

      const rawWindow = global.window;
      class FakeWindow {}
      const fake = new FakeWindow();
      const proxy = new Proxy(fake, {
        get: (t, k) => (Reflect.has(t, k) ? Reflect.get(t, k) : Reflect.get(rawWindow, k)),
        set: (t, k, v) => {
          Reflect.set(t, k, v);
          return true;
        },
        has: (t, k) => k in t,
        deleteProperty: (t, k) => Reflect.deleteProperty(t, k),
        ownKeys: (t) => Reflect.ownKeys(t),
      });

      fake.window = fake.self = fake.globalThis = proxy;
      fake.__MICRO_APP_ENVIRONMENT__ = true;
      fake.__MICRO_APP_NAME__ = appName;
      fake.document = createScopedDocument(host);
      fake.console = global.console;

      this.fake = fake;
      this.proxy = proxy;
      this._listeners = new Set();
      this._lastData = null;

      // 子应用侧通信对象（对应 window.microApp）
      fake.microApp = {
        dispatch: (data) => {
          host.dispatchEvent(
            new CustomEvent('app-message', { detail: { app: appName, data }, bubbles: true }),
          );
          return data;
        },
        addDataListener: (cb, autoTrigger) => {
          this._listeners.add(cb);
          if (autoTrigger && this._lastData) cb(this._lastData);
        },
        removeDataListener: (cb) => this._listeners.delete(cb),
        getData: () => this._lastData,
        getGlobalData: () => (global.__miniMicroAppGlobal || {}).data || null,
      };
    }

    setData(data) {
      this._lastData = data;
      [...this._listeners].forEach((cb) => cb(data));
    }

    run(code) {
      // with(proxy) 让顶层变量查找先落到伪 window 上
      const fn = new Function(
        'window',
        'self',
        'globalThis',
        'document',
        'console',
        'with (window) {\n' + code + '\n}',
      );
      fn(this.proxy, this.proxy, this.proxy, this.fake.document, this.fake.console);
    }

    snapshot() {
      const out = [];
      Object.keys(this.fake).forEach((k) => {
        const v = this.fake[k];
        if (typeof v === 'function' || k === 'window' || k === 'self' || k === 'globalThis') return;
        if (k === 'document' || k === 'console' || k === 'microApp') return;
        out.push([k, typeof v === 'object' ? '[object]' : String(v)]);
      });
      return out;
    }
  }

  /* ---------- 5. 子应用注册表 ---------- */
  const appRegistry = new Map(); // name -> { html, css, js, disableScopecss }

  function registerApp(name, def) {
    appRegistry.set(name, def);
  }

  function getApp(name) {
    return appRegistry.get(name);
  }

  /* ---------- 6. 自定义元素 ---------- */
  function defineTag(tagName) {
    const tag = tagName || 'mini-app';
    if (global.customElements.get(tag)) return;

    class MiniAppElement extends HTMLElement {
      static get observedAttributes() {
        return ['name', 'url'];
      }

      constructor() {
        super();
        this.phase = 'created';
        this.__sandbox = null;
        this.__body = null;
        this.__styleEl = null;
        this.__eventCenter = new EventCenter();
        this.__pendingData = null;
      }

      get appName() {
        return this.getAttribute('name') || '';
      }

      connectedCallback() {
        const name = this.appName;
        this._emit('created', { name });
        if (!name) {
          this._emit('error', { name, message: '缺少 name 属性' });
          return;
        }
        const def = getApp(name);
        if (!def) {
          this._emit('error', { name, message: '未注册的子应用：' + name });
          return;
        }
        this._emit('beforemount', { name });
        try {
          this._mount(name, def);
          this._emit('mounted', { name });
        } catch (e) {
          this._emit('error', { name, message: e.message });
        }
      }

      disconnectedCallback() {
        this._unmount();
      }

      attributeChangedCallback(attr, oldValue, newValue) {
        if (oldValue === newValue || !this.isConnected) return;
        this._emit('beforemount', { name: this.appName, reason: 'attribute ' + attr + ' changed' });
      }

      _mount(name, def) {
        // ① body 容器先就位，子应用脚本才能找到挂载点
        const bodyEl = global.document.createElement(tag + '-body');
        this.appendChild(bodyEl);
        this.__body = bodyEl;

        // ② 样式：加宿主前缀后插进 <mini-app-head>
        const headEl = global.document.createElement(tag + '-head');
        this.insertBefore(headEl, bodyEl);
        if (def.css) {
          const style = global.document.createElement('style');
          style.textContent = scopeCSS(def.css, name, def.disableScopecss !== true, tag);
          headEl.appendChild(style);
          this.__styleEl = style;
        }

        // ③ 子应用自己的 HTML 骨架
        if (def.html) bodyEl.innerHTML = def.html;

        // ④ 沙箱 + 执行脚本
        const sandbox = new WithSandbox(name, bodyEl, tag);
        this.__sandbox = sandbox;
        if (this.__pendingData) {
          sandbox.setData(this.__pendingData);
          this.__pendingData = null;
        }
        if (def.js) sandbox.run(def.js);
      }

      _unmount() {
        const name = this.appName;
        if (this.__body) this.__body.innerHTML = '';
        this.__sandbox = null;
        this._emit('unmount', { name });
      }

      /** 基座 → 子应用 */
      setData(data) {
        if (this.__sandbox) this.__sandbox.setData(data);
        else this.__pendingData = data;
      }

      getSandboxSnapshot() {
        return this.__sandbox ? this.__sandbox.snapshot() : [];
      }

      _emit(phase, detail) {
        this.dispatchEvent(
          new CustomEvent('app-lifecycle', { detail: { phase, ...detail }, bubbles: true }),
        );
      }
    }

    global.customElements.define(tag, MiniAppElement);
  }

  global.MiniMicroApp = {
    EventCenter,
    scopeCSS,
    WithSandbox,
    registerApp,
    getApp,
    defineTag,
    appRegistry,
    version: 'lite-1.0',
  };
})(window);
