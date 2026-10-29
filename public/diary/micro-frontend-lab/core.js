/* ============================================================
   core.js —— 实验室基础设施
   1) h()：轻量 hyperscript，所有 Lab 用它构建 UI
   2) UI：代码块 / 日志 / 验收 / iframe / toast
   3) Lab：注册表 + 进度持久化
   无任何外部依赖，file:// 直接打开也能跑（个别 iframe 实验需本地服务器）
   ============================================================ */
(function (global) {
  'use strict';

  /* ---------------- 基础工具 ---------------- */

  const esc = (s) =>
    String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const isNode = (v) => v instanceof Node;

  function flatten(list, out) {
    for (const item of list) {
      if (item === null || item === undefined || item === false) continue;
      if (Array.isArray(item)) flatten(item, out);
      else out.push(item);
    }
    return out;
  }

  function applyStyle(el, style) {
    if (!style) return;
    if (typeof style === 'string') {
      el.setAttribute('style', style);
      return;
    }
    Object.keys(style).forEach((k) => {
      const v = style[k];
      if (v === null || v === undefined) return;
      if (k.startsWith('--')) el.style.setProperty(k, v);
      else el.style[k] = v;
    });
  }

  /**
   * h('div', { class: 'a', onclick: fn }, '文本', h('span', null, '子节点'))
   */
  function h(tag, props, ...children) {
    const el = document.createElement(tag);
    if (props) {
      Object.keys(props).forEach((key) => {
        const val = props[key];
        if (val === null || val === undefined || val === false) return;
        if (key === 'class' || key === 'className') {
          el.className = val;
        } else if (key === 'style') {
          applyStyle(el, val);
        } else if (key === 'dataset') {
          Object.assign(el.dataset, val);
        } else if (key.startsWith('on') && typeof val === 'function') {
          el.addEventListener(key.slice(2).toLowerCase(), val);
        } else if (key === 'html') {
          el.innerHTML = val;
        } else if (key === 'value') {
          el.value = val;
        } else if (key === 'checked' || key === 'disabled' || key === 'selected') {
          el[key] = !!val;
        } else {
          el.setAttribute(key, val);
        }
      });
    }
    flatten(children, []).forEach((child) => {
      el.appendChild(isNode(child) ? child : document.createTextNode(String(child)));
    });
    return el;
  }

  const frag = (...children) => {
    const f = document.createDocumentFragment();
    flatten(children, []).forEach((c) =>
      f.appendChild(isNode(c) ? c : document.createTextNode(String(c))),
    );
    return f;
  };

  /* ---------------- 简易语法高亮 ---------------- */

  const KEYWORDS =
    'const|let|var|function|return|if|else|for|while|new|class|extends|super|this|typeof|instanceof|try|catch|finally|throw|await|async|import|export|from|default|delete|in|of|do|switch|case|break|continue|void|yield|with|static|get|set';

  const TOKEN_RE = new RegExp(
    [
      '(\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/)', // 1 注释
      "('(?:[^'\\\\\\n]|\\\\.)*'|\"(?:[^\"\\\\\\n]|\\\\.)*\"|`(?:[^`\\\\]|\\\\.)*`)", // 2 字符串
      `\\b(${KEYWORDS})\\b`, // 3 关键字
      '\\b(\\d+(?:\\.\\d+)?)\\b', // 4 数字
      '(\\$?[A-Za-z_][\\w$]*)(?=\\s*\\()', // 5 函数调用
    ].join('|'),
    'g',
  );

  function highlight(code) {
    let out = '';
    let last = 0;
    let m;
    TOKEN_RE.lastIndex = 0;
    while ((m = TOKEN_RE.exec(code))) {
      out += esc(code.slice(last, m.index));
      const [raw, comment, str, kw, num, fn] = m;
      let cls = '';
      if (comment) cls = 'tok-com';
      else if (str) cls = 'tok-str';
      else if (kw) cls = 'tok-key';
      else if (num) cls = 'tok-num';
      else if (fn) cls = 'tok-fn';
      out += cls ? `<span class="${cls}">${esc(raw)}</span>` : esc(raw);
      last = m.index + raw.length;
    }
    out += esc(code.slice(last));
    return out;
  }

  /* ---------------- UI ---------------- */

  let toastTimer = null;

  const UI = {
    esc,
    highlight,

    /** 代码块：返回 DOM 元素 */
    code(source, label) {
      const pre = h('pre', { class: 'code', html: highlight(String(source).trim()) });
      const btn = h(
        'button',
        {
          class: 'copy',
          onclick: () => {
            navigator.clipboard
              ? navigator.clipboard.writeText(source).then(() => UI.toast('已复制', 'ok'))
              : UI.toast('当前环境不支持剪贴板', 'err');
          },
        },
        '复制',
      );
      return h(
        'div',
        { class: 'code-wrap' },
        h('div', { class: 'code-head' }, h('span', null, label || 'js'), btn),
        pre,
      );
    },

    /** 日志面板：返回 { el, add(type,msg), clear() } */
    log(height) {
      const box = h('div', { class: 'log' });
      if (height) box.style.height = height + 'px';
      let count = 0;
      const add = (type, msg) => {
        if (count === 0) box.innerHTML = '';
        count += 1;
        const t = new Date().toLocaleTimeString('zh-CN', { hour12: false });
        box.appendChild(
          h(
            'div',
            { class: `log-line ${type || 'info'}` },
            h('span', { class: 't' }, t),
            h('span', { class: 'm' }, String(msg)),
          ),
        );
        box.scrollTop = box.scrollHeight;
      };
      const clear = () => {
        box.innerHTML = '';
        count = 0;
      };
      // 首次渲染占位
      box.appendChild(h('div', { class: 'log-empty' }, '等待操作…'));
      return { el: box, add, clear };
    },

    /** 验收清单：defs = [{ label, test(): true|string, detail }] */
    check(defs, onAllPass) {
      const list = h('div', { class: 'check-list' });
      const items = defs.map((def) => {
        const icon = h('span', { class: 'icon' }, '○');
        const detail = h('div', { class: 'detail' }, def.detail || '');
        const item = h(
          'div',
          { class: 'check-item' },
          icon,
          h('div', null, h('div', null, def.label), detail),
        );
        list.appendChild(item);
        return { def, item, icon, detail };
      });

      const summary = h('div', { class: 'row', style: { margin: '4px 0 0' } });
      const btn = h('button', { class: 'btn primary' }, '运行验收');
      summary.appendChild(btn);

      btn.addEventListener('click', () => {
        let pass = 0;
        items.forEach(({ def, item, icon, detail }) => {
          let res;
          try {
            res = def.test();
          } catch (e) {
            res = '执行出错：' + e.message;
          }
          const ok = res === true;
          item.className = 'check-item ' + (ok ? 'pass' : 'fail');
          icon.textContent = ok ? '✓' : '✕';
          if (ok) {
            pass += 1;
            detail.textContent = def.detail || '';
          } else {
            detail.textContent = typeof res === 'string' ? res : '';
          }
        });
        const all = pass === items.length;
        UI.toast(all ? `全部通过 ${pass}/${items.length}` : `通过 ${pass}/${items.length}`, all ? 'ok' : 'err');
        if (all && typeof onAllPass === 'function') onAllPass();
      });

      const wrap = h('div', null, list, summary);
      return { el: wrap, run: () => btn.click() };
    },

    /** 同源 iframe：返回 iframe 元素，html 走 srcdoc */
    frame(html, height) {
      const f = h('iframe', {
        class: 'demo-frame',
        srcdoc: html,
        style: { height: (height || 220) + 'px' },
      });
      return f;
    },

    toast(msg, type) {
      const el = document.getElementById('toast');
      if (!el) return;
      el.textContent = msg;
      el.className = 'toast show ' + (type || '');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => {
        el.className = 'toast';
      }, 2200);
    },

    /** 卡片 */
    card(title, ...children) {
      return h(
        'div',
        { class: 'card' },
        h('div', { class: 'card-title' }, h('span', { class: 'dot' }), title),
        frag(children),
      );
    },

    /** 提示条 */
    note(text, kind) {
      return h('div', { class: 'note ' + (kind || ''), html: text });
    },

    badge(text, kind) {
      return h('span', { class: 'badge ' + (kind || '') }, text);
    },

    /** 章节头 */
    head(kicker, title, sub) {
      return h(
        'div',
        { class: 'lab-head' },
        h('div', { class: 'lab-kicker' }, kicker),
        h('h1', { class: 'lab-title' }, title),
        h('div', { class: 'lab-sub' }, sub),
      );
    },

    /** 一组按钮 */
    buttons(list) {
      return h(
        'div',
        { class: 'row' },
        list.map((b) =>
          h(
            'button',
            {
              class: 'btn ' + (b.kind || ''),
              onclick: b.onClick,
              disabled: !!b.disabled,
            },
            b.label,
          ),
        ),
      );
    },
  };

  /* ---------------- Lab 注册表 ---------------- */

  const STORAGE_KEY = 'kpay-mfl-progress-v1';

  const Progress = {
    read() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      } catch (e) {
        return [];
      }
    },
    has(id) {
      return this.read().indexOf(id) !== -1;
    },
    mark(id) {
      const list = this.read();
      if (list.indexOf(id) === -1) {
        list.push(id);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
        } catch (e) {
          /* 隐私模式下忽略 */
        }
      }
      if (global.Lab && typeof global.Lab.refreshProgress === 'function') {
        global.Lab.refreshProgress();
      }
    },
    count() {
      return this.read().length;
    },
  };

  const Lab = {
    registry: [],
    register(def) {
      this.registry.push(def);
      this.registry.sort((a, b) => a.order - b.order);
    },
    done(id) {
      Progress.mark(id);
      UI.toast('第 ' + id + ' 节已完成', 'ok');
    },
    isDone(id) {
      return Progress.has(id);
    },
    refreshProgress() {
      if (typeof this.onProgress === 'function') this.onProgress();
    },
    onProgress: null,
  };

  Object.assign(global, { Lab, UI, h, frag, Progress });
})(window);
