# KPay CRM 微前端手册

> 适用仓库：`kpay-crm-web`（基座）
> 框架：micro-app `1.0.0-rc.30`（京东开源）
> 写作日期：2026-10-28
> 源码引用说明：`@micro-zoe/micro-app` 的引用均来自 `node_modules/.pnpm/@micro-zoe+micro-app@1.0.0-rc.30/node_modules/@micro-zoe/micro-app/lib/index.esm.js`（未压缩 ESM，可直接阅读）。行号随版本会漂移，函数名不会。

---

## 目录

0. [一页速览](#0-一页速览)
1. [原生基础①：Custom Elements 自定义元素](#1-原生基础custom-elements-自定义元素)
2. [原生基础②：Shadow DOM 与样式隔离](#2-原生基础shadow-dom-与样式隔离)
3. [原生基础③：with + Proxy 沙箱](#3-原生基础with--proxy-沙箱)
4. [原生基础④：fetch + DOMParser 加载子应用](#4-原生基础fetch--domparser-加载子应用)
5. [通信：事件中心而不是 postMessage](#5-通信事件中心而不是-postmessage)
6. [路由：native-scope 与 memory router](#6-路由native-scope-与-memory-router)
7. [封装层：@kpay/adapter 到底做了什么](#7-封装层kpayadapter-到底做了什么)
8. [本项目的落地约定](#8-本项目的落地约定)
9. [排错清单](#9-排错清单)
10. [自检题](#10-自检题)

> 🔬 **配套交互实验室**：[`micro-frontend-lab/index.html`](micro-frontend-lab/index.html) —— 7 个可动手实验，与第 1–7 章一一对应。沙箱的源码级实现原理见 [§3.10](#310-源码级实现原理从-customwindow-到-stop-的完整链路)。

---

## 0. 一页速览

### 全景

```
浏览器地址栏： http://crm-sg-test.kpay-test.com/system/roleList
                      │
                      ▼
        ┌─────────── 基座 kpay-crm-web（umi SPA）───────────┐
        │  umi 路由匹配到 /system/roleList                    │
        │  该路由的 component = <MicroAppMain name="iam-app"> │
        │                     url="http://iam.test.a.../"     │
        │                        │                            │
        │                        ▼                            │
        │        浏览器自定义元素：<micro-app name url>        │
        │                        │                            │
        │    micro-app 运行时（已 microApp.start()）           │
        │      ├─ fetch(url) 拿到子应用 index.html             │
        │      ├─ 拆成 <micro-app-head> + <micro-app-body>     │
        │      ├─ 建 with 沙箱（伪 window + Proxy）             │
        │      ├─ 把子应用的 <script> 包进 with(...) 执行       │
        │      └─ CSS 选择器加前缀 micro-app[name=iam-app]      │
        │                        │                            │
        └────────────────────────┼────────────────────────────┘
                                 ▼
                    子应用 React 代码跑在基座页面里
                    DOM 挂在 <micro-app-body> 下
                    侧边栏因 __MICRO_APP_ENVIRONMENT__ 而不渲染
```

### 名词对照

| 名词 | 在本项目里指什么 |
|---|---|
| 基座（主应用） | kpay-crm-web 本身，umi 3.5 + React 18 + antd 4 |
| 子应用（微应用） | 14 个独立部署的前端 SPA：iam、kcss、crm-merchant…… |
| entry URL | 子应用静态站点地址，如 `http://iam.test.a.kpay-test.com/`，返回 HTML 不是 JSON |
| `appName` | 子应用的唯一标识，如 `iam-app`、`crm-kcss`，作为 `<micro-app name>` |
| 沙箱 | 让子应用 JS 的全局变量不污染基座 window 的机制 |
| `window.microApp` | 注入给子应用的**通信 API 对象**，不是沙箱本身（详见 §3.7） |

---

## 1. 原生基础①：Custom Elements 自定义元素

### 1.1 浏览器的规则

浏览器对未知标签是宽容的：`<micro-app>` 会被当成 `HTMLUnknownElement` 正常解析、正常渲染成空盒子，但**没有任何行为**。

要让一个标签拥有 JavaScript 行为，需要两件事：

1. 标签名必须含短横线（`kebab-case`），否则会和未来的原生标签冲突
2. 用 `customElements.define()` 注册一个继承 `HTMLElement` 的类

```js
class MicroAppElement extends HTMLElement {
  static get observedAttributes() {
    return ['name', 'url'];            // 只监听这两个属性的变化
  }

  constructor() {
    super();                            // 必须第一行调用
    this.attachShadow({ mode: 'open' }); // 可选，见 §2
  }

  // 元素被插入文档时触发
  connectedCallback() {
    this.loadApp(this.getAttribute('url'));
  }

  // 元素从文档移除时触发
  disconnectedCallback() {
    this.destroyApp();
  }

  // observedAttributes 里的属性被读写时触发
  attributeChangedCallback(attr, oldVal, newVal) {
    if (oldVal !== newVal) this.reload();
  }
}

customElements.define('micro-app', MicroAppElement);
```

注册之后，页面上任何一个 `<micro-app url="...">`（无论是 HTML 里写的，还是 `document.createElement('micro-app')` 创建的）都会自动执行 `connectedCallback`。

### 1.2 与 React 的关系

React 18 对自定义元素的支持有前提：标签上的属性如果值是**字符串**，会直接作为 HTML attribute 写入。`@kpay/adapter` 里用了 `jsxCustomEvent`（micro-app 官方提供的 polyfill）：

```js
/** @jsxRuntime classic */
/** @jsx jsxCustomEvent */
```

它的作用是把 React 的 `onMounted={() => ...}` 这类**函数类型的 prop** 转成 `addEventListener('mounted', fn)`，因为 React 不认识自定义元素的事件绑定。

对应到 `MicroAppMain.js`：

```js
jsx_custom_event("micro-app", {
  name: name,
  url: url,
  onMounted: () => { mountedHandler(); onMounted(); },
  onError:   () => { errorHandler(); onError(); },
});
```

### 1.3 micro-app 的实际实现要点

`lib/index.esm.js` 里 `class MicroAppElement extends HTMLElement`：

| 实现细节 | 原因 |
|---|---|
| `static get observedAttributes() { return ['name', 'url'] }` | 只在这两个属性变化时重载；`style` 等属性变化不触发 |
| `connectedCallback` 里先 `defer()` 再真正渲染，并用 `connectStateMap` 记录连接序号 | 防止 Vue `<keep-alive>` 等场景下元素瞬间插入/删除两次导致重复渲染 |
| `constructor` 里检查 `Object.getPrototypeOf(this) !== MicroAppElement.prototype` 就重置原型 | Firefox 在元素插入文档后会把原型指回原生 `Node.prototype` |
| `handleAttributeUpdate` 里检查 appName 冲突 | 同名子应用同时活着会互相干扰，直接 `logError('app name conflict')` |
| `this.iframe = iframe ?? false` | rc.30 默认不开 iframe 沙箱，走 with 沙箱 |

**本项目用到的属性**（`MicroAppMain.tsx` + adapter 透传）：

```
name                    子应用名
url                     entry 地址
router-mode             native-scope（本项目固定）
keep-alive              false（默认；本项目未使用 keep-alive）
keep-router-state       false
disable-patch-request   true（不劫持子应用的 fetch/XHR）
```

---

## 2. 原生基础②：Shadow DOM 与样式隔离

### 2.1 两种隔离手段

| 手段 | 做法 | 隔离强度 | 代价 |
|---|---|---|---|
| Shadow DOM | `host.attachShadow()` + 往里挂节点 | 强，CSS 完全不出入 | antd 的弹层要 Portal 到 body，跨边界很麻烦；事件重定向、focus 行为都有坑 |
| CSS 选择器改写 | 编译期/运行期给每条选择器加前缀 | 中，靠选择器权重 | 子应用写的 `!important`、行内样式、动态插入的 `<style>` 要逐个处理 |

**micro-app 用的是第二种**。原因很实际：子应用的弹窗、下拉、水印都要挂到 `document.body` 上，Shadow DOM 会让这些位置错乱。

### 2.2 micro-app 的做法

前缀形如 `micro-app[name=iam-app]`，改写规则：

```css
/* 子应用写的 */
.layout-container { min-width: 1200px; }
body { margin: 0 }
html, :root { --brand: #ffd200 }

/* 实际注入基座的 */
micro-app[name=iam-app] .layout-container { min-width: 1200px; }
micro-app[name=iam-app] micro-app-body { margin: 0 }
micro-app[name=iam-app] { --brand: #ffd200 }
```

源码里的两条正则就是干这个的：

```js
const rootSelectorREG = /(^|\s+)(html|:root)(?=[\s>~[.#:]+|$)/;
const bodySelectorREG = /(^|\s+)((html[\s>~]+body)|body)(?=[\s>~[.#:]+|$)/;
```

`CSSParser` 还支持两个逃生口（写在 CSS 里当注释）：

```css
/* scopecss-disable */
.ant-modal-root { ... }   /* 这段不做前缀改写 */
/* scopecss-enable */
```

### 2.3 这也解释了截图里的一个细节

你在 Elements 里看到：

```html
<section class="layout-container" style="min-width: auto;">
```

子应用在沙箱里会把**布局容器的 min-width/min-height 改成 auto**，因为它的尺寸现在是基座内容区决定的，不再占满整个视口。这是子应用代码里 `isMicroAppContainer()` 分支做的，不是 micro-app 框架做的。

---

## 3. 原生基础③：with + Proxy 沙箱

### 3.1 要解决的问题

子应用代码里有大量 `window.foo = ...`、`var bar = ...`（顶层声明即全局）。直接执行会：

- 污染基座全局变量（两个子应用都定义 `window.config` 就冲突）
- 子应用卸载后变量残留
- 定时器、事件监听无法清理

沙箱要做的：**给子应用一个"看起来像 window"的对象，读写都落在它身上**。

### 3.2 with 语句原理

`with(obj) { ... }` 会让花括号里的变量查找**先在 obj 上找**：

```js
const sandbox = { name: 'child' };
const name = 'base';

with (sandbox) {
  console.log(name);   // 'child' —— 命中 sandbox
  age = 18;            // 落在 sandbox 上，不污染真 window
}
console.log(sandbox.age); // 18
```

找的是对象**原型链上的真实属性**，所以还有两件事要补：

- 子应用读 `Math.random`、`JSON.parse` 这类基座才有的东西 → 得能从真 window 取到
- 子应用写 `window.foo` → 得落在沙箱对象上

### 3.3 Proxy 补齐

```js
const rawWindow = window;

class FakeWindow {}                 // 空壳，只用来装子应用的全局变量
const microAppWindow = new FakeWindow();

const proxyWindow = new Proxy(microAppWindow, {
  get(target, key) {
    if (Reflect.has(target, key)) return Reflect.get(target, key);  // 沙箱里有 → 用沙箱的
    return Reflect.get(rawWindow, key);                            // 沙箱没有 → 借基座的
  },
  set(target, key, value) {
    Reflect.set(target, key, value);   // 写 → 一律落在沙箱
    return true;
  },
  has(target, key)       { return key in target; },
  deleteProperty(t, key) { return Reflect.deleteProperty(t, key); },
});

// window / self / globalThis 一律指回代理
microAppWindow.window = microAppWindow.self = microAppWindow.globalThis = proxyWindow;
```

**读穿透、写隔离**——这就是 with 沙箱最核心的一句话。

### 3.4 代码怎么被包起来

仅仅有 with 还不够，得让子应用的 `<script>` 在 `with` 里执行。micro-app 把每段脚本改写成：

```js
;(function (proxyWindow) {
  with (proxyWindow.__MICRO_APP_WINDOW__) {
    (function (window, self, globalThis, document, ...) {
      /* ===== 子应用原始代码原封不动放这里 ===== */
    }).call(proxyWindow, window, self, globalThis, document, ...);
  }
})(window.__MICRO_APP_PROXY_WINDOW__);
```

对应源码（`code2Function` 里的模板字符串）：

```js
`;(function(proxyWindow){with(proxyWindow.__MICRO_APP_WINDOW__){(function(${GLOBAL_CACHED_KEY}){;${code}
}}).call(proxyWindow,${GLOBAL_CACHED_KEY})}})(window.__MICRO_APP_PROXY_WINDOW__);`
```

`GLOBAL_CACHED_KEY` 是一串**提前缓存好的内置对象**（`Array`、`Object`、`Promise`、`Map`、`document`、`history`……），作为形参传入，避免子应用代码执行时还要走一遍作用域链查找。

### 3.5 三层对象的关系（容易绕晕的地方）

```
真 window (rawWindow)
   ▲ 读穿透（get 时找不到就回落到这里）
   │
proxyWindow  = new Proxy(microAppWindow)     ← 子应用代码里写的 window 就是它
   ▲
   │  __MICRO_APP_WINDOW__ 指向
microAppWindow = new CustomWindow()          ← with 的作用域对象，存放子应用全局变量
```

- `microAppWindow`：真的"搬家后的 window"，变量都在这
- `proxyWindow`：门面，处理读穿透与特殊映射（`location`、`Worker` 等）
- `window.__MICRO_APP_PROXY_WINDOW__`：注册在真 window 上，让包装好的代码能拿到 proxyWindow

### 3.6 需要额外打补丁的几类 API

| API | 怎么处理 | 为什么 |
|---|---|---|
| `window.addEventListener` | 记录到 Map，卸载时按 appName 清空 | 否则子应用卸载后监听器残留 |
| `setTimeout/setInterval` | 改写并记录 id，卸载时批量 clear | 同上 |
| `document.querySelector` | 限定在 `<micro-app name=xxx>` 范围内查 | 避免子应用查到自己以外的 DOM |
| `history.pushState` | 换成 memory history（见 §6） | 避免子应用改掉基座地址栏 |
| `Image`、`Worker`、`fetch` | 按 `disable-patch-request` 决定是否劫持 | 本项目开了 `disable-patch-request: true`，请求保持原样 |

### 3.7 `window.microApp` 是什么？——不是沙箱

源码里给子应用注入的这一行：

```js
microAppWindow.microApp = assign(new EventCenterForMicroApp(appName), {
  removeDomScope,
  pureCreateElement,
  location: microAppWindow.location,
  router,
});
```

结论：`window.microApp` **只是一个通信 API 对象**（外加几个工具函数），它和沙箱是并列关系，不是容器关系：

```
沙箱（microAppWindow / proxyWindow）  ← 负责「隔离」
window.microApp                       ← 负责「通信」
```

两个容易混的点：

- 沙箱里装的不是"一个 microApp 属性"，而是**整个伪 window**；`microApp` 只是被塞进去的一个属性
- 真正标记"我在沙箱里"的不是 `microApp` 存在与否，而是 `window.__MICRO_APP_ENVIRONMENT__ === true`

### 3.8 沙箱注入的几个全局变量

| 变量 | 值 | 谁在用 |
|---|---|---|
| `__MICRO_APP_ENVIRONMENT__` | `true` | 子应用判断"我在基座里"（IAM 隐藏侧边栏就靠它） |
| `__MICRO_APP_NAME__` | `'iam-app'` | 子应用知道自己是谁；基座侧事件分发的 key |
| `__MICRO_APP_URL__` | entry 地址 | 拼资源路径 |
| `__MICRO_APP_PUBLIC_PATH__` | entry 的目录部分 | webpack 运行时 publicPath |
| `__MICRO_APP_BASE_ROUTE__` | `baseroute` 或 `''` | vue-router/react-router 的 basename |
| `__MICRO_APP_PROXY_WINDOW__` | proxyWindow | script 包装后的入口 |
| `__MICRO_APP_SANDBOX__` | 沙箱实例 | 内部用 |
| `__MICRO_APP_SANDBOX_TYPE__` | `'with'` 或 `'iframe'` | 调试时一眼看出用的哪种沙箱 |
| `rawWindow` / `rawDocument` | 基座真 window/document | 需要"逃逸"时用 |
| `microApp` | 通信对象 | 见 §5 |

**排查技巧**：在基座 console 里执行

```js
window.__MICRO_APP_PROXY_WINDOW__            // with 沙箱下才有
document.querySelector('micro-app').__MICRO_APP_NAME__
```

或者在子应用代码里 `console.log(window.__MICRO_APP_SANDBOX_TYPE__)` 确认当前跑的是哪种沙箱。

### 3.9 iframe 沙箱（rc.30 支持，本项目未启用）

`micro-app` 1.0 还提供 iframe 沙箱：

```js
// 基座 global.tsx 里传 iframe: true 才会开启
microApp.start({ iframe: true });
```

做法：`pureCreateElement('iframe')` 建一个 `display:none` 的 iframe 挂到 body，把它的 `contentWindow` 当子应用的 window，并 patch 它的 `document`、`Node`、`Element` 原型，让子应用 `createElement` 出来的节点实际挂在基座 `<micro-app>` 里。

| | with 沙箱（本项目默认） | iframe 沙箱 |
|---|---|---|
| 隔离强度 | 中，js 与基座同文档 | 高，独立 window/document |
| 性能 | 好 | 建 iframe 有开销 |
| 兼容问题 | 全局变量拦截不全时会漏 | `instanceof`、原型链跨域问题多 |
| 判断标志 | `__MICRO_APP_SANDBOX_TYPE__ === 'with'` | `'iframe'` |

### 3.10 源码级实现原理：从 `CustomWindow` 到 `stop()` 的完整链路

前面 §3.2–§3.5 给的是**简化版**（能说明原理）。这一节贴 `lib/index.esm.js` 里的**真实实现**，看清 rc.30 到底做了哪几件事、为什么比简化版复杂。

#### 3.10.1 【佐证一】`CustomWindow` 类本身是空的

```js
// lib/index.esm.js:2996
class CustomWindow {
}
```

就这两行。这个类的**全部作用**是产出一个干净的裸对象当 Proxy target —— 它不提供任何 window 能力，所有能力都是后面靠 Proxy 的 trap 和 `patchWindow` / `patchDocument` 挂上去的。

这直接回答了最常见的误解：**沙箱不是一个装满了功能的类实例，而是一个"空对象 + 一层 Proxy + 一组打补丁的 API"三件套。**

#### 3.10.2 【佐证二】`WithSandBox` 的构造是一条六步流水线

```js
// lib/index.esm.js:5066
class WithSandBox extends BaseSandbox {
    constructor(appName, url) {
        super(appName, url);
        this.active = false;
        this.microAppWindow = new CustomWindow(); // Proxy target
        this.patchWith((resolve) => {
            this.getSpecialProperties(appName);                              // ① 取插件声明的特殊属性
            this.patchRouter(appName, url, this.microAppWindow);             // ② 造 location / history
            this.windowEffect = patchWindow(appName, this.microAppWindow, this);   // ③ 补 window 上的副作用 API
            this.documentEffect = patchDocument(appName, this.microAppWindow, this); // ④ 换掉 document
            this.setMappingPropertiesWithRawDescriptor(this.microAppWindow); // ⑤ 原生属性按 descriptor 映射
            this.initStaticGlobalKeys(appName, url, this.microAppWindow);    // ⑥ 注入 __MICRO_APP_* 与 microApp
            resolve();
        });
    }
}
```

关键点：`new CustomWindow()` 只是**第 0 步**。真正的"沙箱"是①–⑥ 造出来的：

| 步骤 | 干了什么 | 对应源码 |
|---|---|---|
| ② | 子应用的 `location` / `history` 换成 memory 版（见 §6） | `patchRouter` |
| ③ | `addEventListener` / `setTimeout` 等改成"记账版"，卸载时按 appName 回收 | `patchWindow` → `patchWindowEffect` |
| ④ | `document` 换成限定在容器内的代理对象 | `patchDocument`（:3166） |
| ⑤ | `Array`、`Object`、`Promise` 这类原生构造器按真 window 的 descriptor 映射过来 | `setMappingPropertiesWithRawDescriptor`（:5310） |
| ⑥ | 注入 `__MICRO_APP_ENVIRONMENT__` 等 12 个变量 + `microApp` | `initStaticGlobalKeys`（:5177） |

`this.patchWith(callback)` 是把这段初始化**推迟到插件加载完成之后**执行（插件可能带来额外的 `scopeProperties` / `escapeProperties`），所以是个回调而不是直接同步跑。

#### 3.10.3 【核心】Proxy 的八个 trap，逐个对上真实源码

简化版只写了 `get` / `set`。micro-app 实际拦截了八个：

```js
// lib/index.esm.js:3452
function createProxyWindow(appName, microAppWindow, sandbox) {
    const rawWindow = globalEnv.rawWindow;
    const descriptorTargetMap = new Map();
    const proxyWindow = new Proxy(microAppWindow, {
        get: (target, key) => { /* ... */ },
        set: (target, key, value) => { /* ... */ },
        has: (target, key) => { /* ... */ },
        getOwnPropertyDescriptor: (target, key) => { /* ... */ },
        defineProperty: (target, key, value) => { /* ... */ },
        ownKeys: (target) => { /* ... */ },
        deleteProperty: (target, key) => { /* ... */ },
    });
    sandbox.proxyWindow = proxyWindow;   // :3557
}
```

**① `get` —— 读穿透，但不是"无条件回落"**

```js
// :3456
get: (target, key) => {
    throttleDeferForSetAppName(appName);
    if (Reflect.has(target, key) ||
        (isString(key) && /^__MICRO_APP_/.test(key)) ||
        includes(sandbox.scopeProperties, key)) {
        if (includes(RAW_GLOBAL_TARGET, key)) removeDomScope();
        return Reflect.get(target, key);
    }
    return bindFunctionToRawTarget(Reflect.get(rawWindow, key), rawWindow);
},
```

四个判断，每个都有原因：

| 判断 | 目的 |
|---|---|
| `Reflect.has(target, key)` | 沙箱自己有的（子应用定义的变量）→ 直接给 |
| `/^__MICRO_APP_/` | 框架注入的标志位 → 无条件放行，不走穿透 |
| `includes(scopeProperties, key)` | `webpackJsonp` / `Vue` / `onpopstate` 等**必须限定在子应用内**的键（见 3.10.4） |
| `RawGlobalTarget` 里的 `rawWindow` / `rawDocument` | 子应用要访问真 window 做逃逸时，先清掉 DOM 作用域限制 |

**为什么要 `bindFunctionToRawTarget`（:2912）？**

```js
// 简化
if (isFunction(value) && !isConstructorFunction(value) && !isBoundedFunction(value) && value.bind) {
    const bindRawObjectValue = value.bind(rawTarget);   // 关键：绑定 this
    ...
}
```

因为子应用写 `var st = window.setTimeout; st(fn, 100)` 时，`this` 会丢。浏览器原生方法大多要求 `this` 是正确的 `window`，不 bind 就直接 `TypeError: Illegal invocation`。所以从真 window 借出去的函数**一律先 bind 到真 window**（并缓存到 `__MICRO_APP_BOUND_WINDOW_FUNCTION__`，避免重复 bind 产生新引用，导致 `removeEventListener` 删不掉）。

**② `set` —— 写隔离，但有两条例外分支**

```js
// :3467
set: (target, key, value) => {
    if (includes(sandbox.rawWindowScopeKeyList, key)) {
        Reflect.set(rawWindow, key, value);          // A. 白名单：只能写真 window
    }
    else if (!rawHasOwnProperty.call(target, key) &&
             rawHasOwnProperty.call(rawWindow, key) &&
             !includes(sandbox.scopeProperties, key)) {
        // B. 键在真 window 上已存在（如 Math、JSON）→ 按原 descriptor 复制到沙箱
        const descriptor = Object.getOwnPropertyDescriptor(rawWindow, key);
        rawDefineProperty(target, key, { value, configurable: descriptor.configurable,
                                         enumerable: descriptor.enumerable,
                                         writable: descriptor.writable ?? !!descriptor.set });
        sandbox.injectedKeys.add(key);               // 记账，卸载时删
    }
    else {
        if (!Reflect.has(target, key) || includes(sandbox.scopeProperties, key))
            sandbox.injectedKeys.add(key);
        Reflect.set(target, key, value);             // C. 常规：写沙箱
    }
    if ((includes(sandbox.escapeProperties, key) ||
        (includes(sandbox.staticEscapeProperties, key) && !Reflect.has(rawWindow, key))) &&
        !includes(sandbox.scopeProperties, key)) {
        !Reflect.has(rawWindow, key) && sandbox.escapeKeys.add(key);
        Reflect.set(rawWindow, key, value);          // D. 逃逸：同步写回真 window
    }
    return true;
},
```

四条分支的实际含义：

- **A. `rawWindowScopeKeyList = ['location']`** —— 子应用写 `window.location = ...` 必须作用在真 window 上（地址栏是基座的）。这就是为什么路由不能靠"不处理 location"来隔离，而要单独做 memory router。
- **B. 存量原生属性的重定义** —— `window.Math = ...` 这种，需要复制原 descriptor 保持 `configurable` / `writable` 语义，否则后续 `delete` 会失败。
- **C. 常规写入** —— 子应用的业务变量全走这里，**真 window 完全不受影响**。
- **D. 逃逸通道** —— `escapeProperties`（插件声明的）和 `staticEscapeProperties`（`System`、`__cjsWrapper`）会被**主动写回真 window**。这是为 UMD 包、`SystemJS` 这类"必须活在最外层"的库留的口子。注意 D 与 C 不互斥：值既写沙箱也写真 window。

**③ `has` —— 为什么要特殊处理 `scopeProperties`**

```js
// :3505
has: (target, key) => {
    if (includes(sandbox.scopeProperties, key)) {
        if (sandbox.injectedKeys.has(key)) return Reflect.has(target, key);  // 写过 → true
        return !!target[key];                                                // 没写过 → false
    }
    return Reflect.has(target, key) || Reflect.has(rawWindow, key);
},
```

源码注释写得很直白（对应 issue #686）：Vue 这类库会用 `'Vue' in window` 判断"是否已有其他 Vue 实例"。如果 `has` 直接穿透到真 window，基座装了 Vue 就会让子应用误以为已存在。所以对 `scopeProperties` 里的键，**未注入时 `in` 必须返回 false**，哪怕真 window 上有。

**④ `getOwnPropertyDescriptor` / `defineProperty` —— 靠 `descriptorTargetMap` 记住归属**

```js
// :3521
getOwnPropertyDescriptor: (target, key) => {
    if (rawHasOwnProperty.call(target, key)) {
        descriptorTargetMap.set(key, 'target');           // 这个 descriptor 来自沙箱
        return Object.getOwnPropertyDescriptor(target, key);
    }
    if (rawHasOwnProperty.call(rawWindow, key)) {
        descriptorTargetMap.set(key, 'rawWindow');        // 来自真 window
        const descriptor = Object.getOwnPropertyDescriptor(rawWindow, key);
        if (descriptor && !descriptor.configurable) descriptor.configurable = true;
        return descriptor;
    }
    return undefined;
},
// :3537
defineProperty: (target, key, value) => {
    const from = descriptorTargetMap.get(key);
    if (from === 'rawWindow') return Reflect.defineProperty(rawWindow, key, value);
    return Reflect.defineProperty(target, key, value);
},
```

`Object.defineProperty(window, 'x', ...)` 是两步操作（先 `getOwnPropertyDescriptor`，再 `defineProperty`）。如果第二步无脑写到沙箱，那些本该改真 window 的原生属性就被"写歪"了。`descriptorTargetMap` 就是用来**记录上一次 descriptor 是从哪取的**，保证 defineProperty 落在同一个目标上。

注意这里还把真 window 上 `configurable: false` 的 descriptor 强行改成 `true` —— 否则 Proxy 的 invariant 校验会直接抛错（Proxy 不允许返回不可配置但与 target 不一致的 descriptor）。

**⑤ `ownKeys` / `deleteProperty`**

```js
// :3545
ownKeys: (target) => unique(Reflect.ownKeys(rawWindow).concat(Reflect.ownKeys(target))),
// :3548
deleteProperty: (target, key) => {
    if (rawHasOwnProperty.call(target, key)) {
        sandbox.injectedKeys.has(key) && sandbox.injectedKeys.delete(key);
        sandbox.escapeKeys.has(key) && Reflect.deleteProperty(rawWindow, key);  // 逃逸过的要连真 window 一起删
        return Reflect.deleteProperty(target, key);
    }
    return true;
},
```

`ownKeys` 让 `for (const k in window)` / `Object.keys(window)` 同时看到真 window 和沙箱的键，子应用代码里遍历全局变量不会"少看见东西"。`deleteProperty` 则保证删一个逃逸键时**沙箱和真 window 同步删**，不留残渣。

#### 3.10.4 四个键集合：沙箱的"治理清单"

`BaseSandbox` 构造函数（:2942）里定义了整套记账结构：

```js
this.rawWindowScopeKeyList = ['location'];                  // 只能写真 window
this.staticEscapeProperties = ['System', '__cjsWrapper'];   // 允许逃逸到真 window
this.staticScopeProperties  = ['webpackJsonp', 'webpackHotUpdate', 'Vue',
                               'onpopstate', 'onhashchange', 'event'];  // 必须锁在子应用内
this.scopeProperties = Array.from(this.staticScopeProperties); // 上者 + 插件追加
this.escapeProperties = [];                                 // 插件追加的逃逸键
this.injectedKeys = new Set();                              // 新增到沙箱的键（卸载时删）
this.escapeKeys = new Set();                                // 逃逸到真 window 的键（卸载时删）
```

| 集合 | 语义 | 谁往里写 |
|---|---|---|
| `scopeProperties` | 这几个键**只能在子应用里读写**，`in` 也返回 false | 框架内置 + 插件 |
| `escapeProperties` | 这几个键要**同步写回真 window** | 插件 |
| `rawWindowScopeKeyList` | 这几个键**只能写真 window** | 框架固定（目前只有 `location`） |
| `injectedKeys` | 运行时记账：往沙箱加了哪些键 | `set` trap 自动记 |
| `escapeKeys` | 运行时记账：往真 window 加了哪些键 | `set` trap 自动记 |

后两个集合是**卸载清理的唯一依据**，见下一节。

#### 3.10.5 `stop()`：沙箱怎么被拆干净

```js
// lib/index.esm.js:5133
stop({ umdMode, keepRouteState, destroy, clearData }) {
    if (!this.active) return;
    this.recordAndReleaseEffect({ umdMode, clearData, destroy }, !umdMode || destroy);
    this.clearRouteState(keepRouteState);                   // 复位地址栏
    this.removeHistoryListener?.();                         // 摘掉 popstate 监听
    if (!umdMode || destroy) {
        clearMicroEventSource(this.microAppWindow.__MICRO_APP_NAME__);  // 清事件中心频道
        this.injectedKeys.forEach((key) => {
            Reflect.deleteProperty(this.microAppWindow, key);          // 删沙箱里的键
        });
        this.injectedKeys.clear();
        this.escapeKeys.forEach((key) => {
            Reflect.deleteProperty(globalEnv.rawWindow, key);          // 删真 window 上的逃逸键
        });
        this.escapeKeys.clear();
        this.clearHijackUmdHooks();
    }
    ...
    this.active = false;
},
```

这就解释了"为什么子应用卸载后基座是干净的"：**不是靠猜，是靠运行时记账逐条删**。也解释了 `keep-alive` 场景为什么要传 `umdMode` —— umd 模式下这些全局变量要留着复用，不能删。

#### 3.10.6 `document` 也被换掉了

沙箱不只是 window。`patchDocument`（:3166）做了三件事：

```js
function patchDocument(appName, microAppWindow, sandbox) {
    const { proxyDocument, documentEffect } = createProxyDocument(appName, sandbox);
    const MicroDocument = createMicroDocument(appName, proxyDocument);
    rawDefineProperties(microAppWindow, {
        document: { configurable: false, enumerable: true, get() { return proxyDocument; } },
        Document: { configurable: false, enumerable: false, get() { return MicroDocument; } },
    });
    return documentEffect;
}
```

`createProxyDocument`（:3192）里：

- `createElement` 被改写 —— 造出的节点立即打上 `__MICRO_APP_NAME__` 标记（`updateElementInfo`），后续 `document.querySelector` 才知道"这个节点属于哪个子应用"
- `addEventListener` / `removeEventListener` 被改写 —— 监听器登记进 `eventListenerMap`，卸载时批量摘除
- `querySelector` / `querySelectorAll` / `getElementById` 限定在 `<micro-app name=xxx>` 容器内查

所以子应用里那句 `document.getElementById('app-root')` 在 A、B 两个子应用里各自命中自己的节点，靠的就是这层 `proxyDocument`。

#### 3.10.7 一次完整时序

```
微前端加载 iam-app
  │
  ├─ appInstanceMap 新建 MicroApp 实例
  ├─ new WithSandBox('iam-app', url)            :5066
  │    ├─ microAppWindow = new CustomWindow()   :5070  ← 空类，只是 target
  │    ├─ patchWith(cb)                         → 等插件就绪后执行 cb
  │    │    ├─ patchRouter        造 memory location/history
  │    │    ├─ patchWindow        记账 addEventListener / setTimeout
  │    │    ├─ patchDocument      换 proxyDocument
  │    │    ├─ setMappingPropertiesWithRawDescriptor
  │    │    └─ initStaticGlobalKeys  :5177
  │    │         ├─ __MICRO_APP_ENVIRONMENT__ = true
  │    │         ├─ __MICRO_APP_WINDOW__    = microAppWindow
  │    │         ├─ __MICRO_APP_PROXY_WINDOW__ = this.proxyWindow
  │    │         └─ microApp = assign(new EventCenterForMicroApp(appName), {...})  :5191
  │    └─ createProxyWindow(...)                :3452  → sandbox.proxyWindow
  │
  ├─ sandbox.start({ umdMode, baseroute, ... })  :5094
  │    ├─ initRouteState / addHistoryListener
  │    └─ initGlobalKeysWhenStart
  │
  ├─ 代码被包装后执行（§3.4）
  │
  └─ 卸载 → sandbox.stop()                       :5133
       ├─ 复位地址栏、摘 popstate
       ├─ injectedKeys 逐条从沙箱删
       └─ escapeKeys   逐条从真 window 删
```

#### 3.10.8 再看一眼：为什么 `microApp` 不是沙箱

同一段 `initStaticGlobalKeys` 里，注意这三行的差别：

```js
microAppWindow.__MICRO_APP_WINDOW__ = microAppWindow;            // :5183 伪 window 指向自己
microAppWindow.__MICRO_APP_PROXY_WINDOW__ = this.proxyWindow;    // :5186 门面
microAppWindow.microApp = assign(new EventCenterForMicroApp(appName), {
    removeDomScope, pureCreateElement,
    location: microAppWindow.location, router,
});                                                              // :5191 通信 API
```

三行都是"往伪 window 上挂属性"，但性质完全不同：

- 前两个是**沙箱的自我引用**（with 的作用域对象、代码包装的入口）
- `microApp` 是 `EventCenterForMicroApp` 实例 + 4 个工具——**只有 `setData` / `dispatch` / `getData` / `addDataListener` 这些通信方法**，一个隔离相关的 trap 都没有

判断"我在不在沙箱里"永远看 `__MICRO_APP_ENVIRONMENT__`（:5178），不看 `microApp` 存不存在。

---

## 4. 原生基础④：fetch + DOMParser 加载子应用

### 4.1 为什么不是 `<iframe src>`

iframe 能加载任意站点，但代价是：子应用的弹窗出不了 iframe、基座拿不到子应用的 DOM、路由和滚动都要跨窗口通信。微前端要的是"看起来像同一个页面"，所以必须**把子应用的 DOM 搬进基座文档**。

### 4.2 加载流程

```
1. fetch(entry)                        → 拿到子应用 index.html 字符串
2. 正则把 <head>/<body> 改名           → <micro-app-head>/<micro-app-body>
3. DOMParser 解析成 DOM
4. 遍历：<link rel=stylesheet> / <style> / <script>
     - CSS  → 选择器加前缀后 <style> 插入 micro-app-head
     - JS   → 取 src 再 fetch（或用内联 code）→ 包进 with → 创建新 <script> 执行
5. 剩下的 body 内容（#root 之类）→ 插入 <micro-app-body>
6. 触发 mounted 事件
```

源码对应：

```js
htmlStr = this.formatHTML(htmlUrl, htmlStr, appName);   // 改名
successCb(htmlStr, app);
```

```js
.replace(/<head/i, '<micro-app-head').replace(/<\/head>/i, '</micro-app-head>')
.replace(/<body/i, '<micro-app-body').replace(/<\/body>/i, '</micro-app-body>')
```

所以最终结构是：

```html
<micro-app name="iam-app" url="http://iam.test.a.kpay-test.com/">
  <micro-app-head>
    <style>/* 加了前缀的 CSS */</style>
    <script>/* 包了 with 的子应用 JS */</script>
  </micro-app-head>
  <micro-app-body>
    <div id="user-management-root"> ...子应用渲染的 DOM... </div>
  </micro-app-body>
</micro-app>
```

**注意**：子应用的 `<script src="/static/js/index.xxx.js">` 里的 `/static/...` 是相对**子应用域名**的，直接丢给浏览器会请求到基座域名下而 404。所以要先补全成绝对地址：

```js
function completionPath(path, base) {
  return new URL(path, base).href;   // 原生 API，天然处理 ../ ./ 和绝对路径
}
```

micro-app 内部对 `script.src`、`link.href`、`img.src` 都做了这层改写（`CompletionPath`）。

### 4.3 基座侧的对应代码

```js
// src/MicroApp/MicroAppMain.tsx:179-186
useEffect(() => {
  if (!isValidURL(props.url)) {
    microAppRef.current?.setError(true);   // 地址非法 → 直接错误页，不发起 fetch
    microAppRef.current?.setLoading(false);
  } else {
    microAppRef.current?.setError(false);
  }
}, [props.url]);
```

`isValidURL`（`src/MicroApp/SubApp/utils.ts:60-70`）就是 `new URL(string)`，抛错即非法。**这也是「占位符没被替换 → 直接报 iam-app 服務加載失敗」的根因**。

---

## 5. 通信：事件中心而不是 postMessage

### 5.1 为什么不用 postMessage

`postMessage` 是**跨域**场景的通信手段（iframe 之间、不同 origin 的窗口之间）。本项目子应用与基座同源部署、共享同一个 JS 运行时（with 沙箱），直接传对象引用即可，没有任何序列化成本。

micro-app 也没用 DOM 的 `CustomEvent` + `dispatchEvent`，而是自己实现了一个轻量的 `EventCenter`：

```js
// 简化示意
class EventCenter {
  eventList = new Map();                     // name -> { data, callbacks: Set }

  on(name, cb, autoTrigger) {
    const info = this.eventList.get(name) || { data: null, callbacks: new Set() };
    info.callbacks.add(cb);
    if (autoTrigger && info.data) cb(info.data);   // 绑定时就先推一次历史数据
    this.eventList.set(name, info);
  }

  off(name, cb) { this.eventList.get(name)?.callbacks.delete(cb); }

  dispatch(name, data) {
    const info = this.eventList.get(name);
    if (!info) return;
    info.data = data;
    info.callbacks.forEach((cb) => cb(data));
  }

  getData(name) { return this.eventList.get(name)?.data ?? null; }
}
```

事件名由 appName 拼成，保证不同子应用互不干扰：

```js
fromBaseApp ? `__${appName}_from_base_app__` : `__${appName}_from_micro_app__`
```

### 5.2 四组 API

| 方向 | 发送方 | 接收方 |
|---|---|---|
| 基座 → 指定子应用 | `microApp.setData(appName, data)` | 子应用 `window.microApp.addDataListener(cb)` |
| 子应用 → 基座 | `window.microApp.dispatch(data)` | 基座 `microApp.addDataListener(appName, cb)` |
| 基座 → 所有子应用 | `microApp.setGlobalData(data)` | 子应用 `addGlobalDataListener(cb)` / `getGlobalData()` |
| 子应用 → 基座（要返回值） | `window.microApp.forceDispatch(data, cb)` | 基座 listener 直接 `return` 结果 |

`forceDispatch` 是"请求-响应"模式：基座的 listener 返回值会被回传给子应用的回调。本项目用它做 **token 刷新**：

```js
// 子应用侧
window.microApp.forceDispatch({ type: 'AUTH_INFO_REFERESH_ASYNC' }, (results) => {
  const { refleshAccessToken } = results[0];
});

// 基座侧 src/MicroApp/MicroAppMain.tsx:141-156
case MICRO_APP_TYPE.AUTH_INFO_REFERESH_ASYNC:
  try {
    const refleshAccessToken = await _refreshToken();
    return { type: ..., refleshRefreshTokenSuccess: true, refleshAccessToken };
  } catch (e) {
    return { type: ..., refleshRefreshTokenSuccess: false, refleshRefreshTokenError: e };
  }
```

### 5.3 本项目的 8 种消息（`src/MicroApp/contants.ts`）

| 常量 | 字符串值 | 方向 | 触发点 | 用途 |
|---|---|---|---|---|
| `MASTER_ACCESS_DATA` | `MASTER_ACCESS_DATA` | 基座→子 | `MicroAppMain.tsx:83` | 挂载前下发权限 + 语言 |
| `MASTER_ROUTES_CHANGE` | `MASTER_ROUTES_CHANGE` | 基座→子 | `app.tsx:249` | 路由变化通知 |
| `MASTER_ONCE_USE_DATA` | `MASTER_ONCE_USE_DATA` | 基座→子 | `MicroApp/utils.ts:61` | 签名 SID/SECRET/TERMINAL/版本 |
| `AUTH_INFO_ASYNC` | `controller_update_token` | 基座→子 | `MicroApp/utils.ts:41` | 广播最新 token |
| `CONTROLLER_LANG_CHANGE` | `CONTROLLER_LANG_CHANGE` | 基座→子 | `MicroApp/utils.ts:50` | 语言切换 |
| `ROUTER_PATH_ASYNC` | `CONTROLLER_ROUTE_CHANGE` | 子→基 | `MicroAppMain.tsx:157` | 子应用请求跳转 |
| `AUTH_INFO_ASYNC_ACTIVE` | `AUTH_INFO_ASYNC_ACTIVE` | 子→基 | `MicroAppMain.tsx:138` | 子应用 token 更新回写 |
| `AUTH_INFO_REFERESH_ASYNC` | `AUTH_INFO_REFERESH_ASYNC` | 子→基 | `MicroAppMain.tsx:141` | 请求基座刷新 token |

### 5.4 一次挂载的完整时序

```
基座点击菜单 → umi 渲染 <MicroAppMain name="iam-app">
   │
   ├─ ① onBeforemount: syncPageData()
   │      microApp.setData('iam-app', { accessData, language, type: MASTER_ACCESS_DATA })
   │      （子应用此时可能还没绑定监听 → EventCenter 会缓存 data）
   │
   ├─ ② micro-app 开始 fetch entry html、执行脚本
   │      子应用启动时 window.microApp.addDataListener(cb)
   │      （autoTrigger 会在绑定时补推 ① 缓存的数据）
   │
   ├─ ③ 子应用请求 getGlobalData() 拿 token → 发请求渲染页面
   │
   ├─ ④ 子应用挂载完成 → 触发 mounted 事件 → adapter setLoading(false)
   │
   └─ ⑤ 用户点菜单跳转 → 子应用 dispatch(ROUTER_PATH_ASYNC)
          → 基座 history.push → ⑥ umi 路由变化 → onRouteChange 再 setData(MASTER_ROUTES_CHANGE)
```

**要点**：`setData` 有缓存（`eventList.get(name).data`），所以基座"先发后订阅"不会丢消息；`addDataListener(appName, cb, autoTrigger)` 的第三个参数决定绑定时是否立即回放。

---

## 6. 路由：native-scope 与 memory router

### 6.1 问题

子应用自带 react-router，它要读 `window.location.pathname`。但在基座里：

- `location` 是基座的（`/system/roleList`）
- 子应用希望看到的是"自己的"路径（比如 `/userList`）
- 子应用 push 时不能把基座地址栏改乱

### 6.2 五种模式（源码 `ROUTER_MODE_*`）

| 模式 | 行为 | 适用 |
|---|---|---|
| `search`（默认） | 子应用路由同步到基座 URL 的 query | 兼容老项目 |
| `state` | 同步到 `history.state` | 同上 |
| `native` | 直接用基座地址栏，子应用 `location` 指向基座 | 路由天然对齐 |
| **`native-scope`** | 用基座地址栏，但子应用 `location.origin/href` 指回**子应用自己的域名** | **本项目** |
| `pure` | 不同步地址栏 | 弹窗式子应用 |

`native-scope` 的意义：子应用里 `window.location.href` 拿到的是 `http://iam.test.a.../system/roleList`，所以它拼资源路径、跳登录页时不会跑到基座域名下。

### 6.3 memory router 怎么实现

```js
// 简化示意
const microHistory = {
  pushState(state, title, url) {
    updateMicroLocation(url, 'push');       // 只改"子应用视角的地址"
    // 同时通知浏览器地址栏（native-scope 下走基座 history）
  },
  replaceState(...) { /* 同上 */ },
};
Object.assign(microAppWindow.history, microHistory);

// 子应用读的 location 是代理对象
const proxyLocation = new Proxy({}, {
  get(_, key) {
    if (key === 'href') return childOrigin + microPath;
    if (key === 'origin') return childOrigin;
    return microPathInfo[key];
  },
});
```

配套的 `popstate` 监听也是每个子应用一份（`addHistoryListener(appName)`），保证浏览器后退时子应用能收到。

### 6.4 与基座路由的同步

```js
// src/app.tsx:241-255
export function onRouteChange({ location, matchedRoutes }) {
  const last = matchedRoutes[matchedRoutes.length - 1]?.route;
  if (last?.system) {                       // 只有子应用路由才有 system 字段
    microApp.setData(last.system, {
      location,
      masterOrigin: window.location.origin,
      type: MICRO_APP_TYPE.MASTER_ROUTES_CHANGE,
    });
  }
}
```

子应用收到后调自己的 router 做同步渲染。**基座永远不改子应用的内部路由，只告诉它"地址变了"。**

---

## 7. 封装层：@kpay/adapter 到底做了什么

### 7.1 依赖树（pnpm 实际结构）

```
@kpay/adapter
 ├─ @kpay/adapter-event      （事件总线）
 ├─ @kpay/adapter-axios      （请求封装）
 ├─ @kpay/adapter-query      （查询参数）
 ├─ @kpay/adapter-valtio     （状态管理桥）
 └─ @kpay/adapter-micro-app  ★ 微前端适配
      └─ @micro-zoe/micro-app@1.0.0-rc.30
```

### 7.2 `@kpay/adapter-micro-app` 做的事（`dist/es/index.js` 全文 8 行）

```js
import micro_app from "@micro-zoe/micro-app";
import jsx_custom_event from "@micro-zoe/micro-app/polyfill/jsx-custom-event";
import MicroAppMain from "./MicroAppMain.js";
import MicroAppError from "./MicroAppError.js";

export * from "./utils.js";          // isMicroAppContainer / getMicroAppName / isMasterMicroApp
export * from "@micro-zoe/micro-app"; // 原样透传全部导出
export * from "@micro-zoe/micro-app/polyfill/jsx-custom-event";
export { MicroAppMain, MicroAppError, jsx_custom_event as jsxCustomEvent, micro_app as microApp };
```

所以「再导出 micro-app 的 `microApp` 实例」= 把第三方包的 default export 换个名字给业务用，**没有包任何逻辑**。

`microApp` 本身是什么？micro-app 源码最后一行：

```js
const microApp = new MicroApp();     // MicroApp extends EventCenterForBaseApp
export default microApp;
```

`MicroApp` 类上挂着 `start`、`preFetch`、`setData`、`setGlobalData`、`getActiveApps`、`reload`、`renderApp`、`unmountApp`、`router` 等。基座侧所有微前端操作都通过这个**单例**完成。

### 7.3 `MicroAppMain` 组件额外做了什么

与直接用 `<micro-app>` 相比，它补了这些：

| 能力 | 实现位置 | 作用 |
|---|---|---|
| loading 状态 | `useState` + `setLoadingStatus` | 外层转圈，加载完成才显示 |
| 错误页 | `hasError` + `errorNode` | 加载失败渲染自定义错误 UI，而不是白屏 |
| 命令式控制 | `useImperativeHandle` 暴露 `setLoading/setError` | 基座可以在 `isValidURL` 失败时主动置错 |
| url 变化自动重置 | `keyRef` 比较 `${name}|${url}` | 切换子应用时重新 loading |
| 生命周期回调透传 | `onCreated/onBeforemount/onMounted/onError` | 业务可挂钩子 |
| JSX 事件绑定 | `jsxCustomEvent` pragma | React 能绑自定义元素事件 |

### 7.4 为什么要这一层

1. **换框架只改一层**：从 qiankun 迁到 micro-app 时，业务代码里的 `import { microApp } from '@kpay/adapter'` 没变
2. **统一错误兜底**：14 个子应用的加载失败 UI 一致
3. **统一透传约定**：`name`/`url` 的取值、`keep-alive` 开关、`router-mode` 默认值收敛在一处

### 7.5 项目里怎么用

```js
// src/global.tsx:96  全局启动，只调一次
microApp.start({ plugins: { global: [...], modules: { 'crm-salsops': [...] } } });

// src/MicroApp/MicroAppMain.tsx:191  业务组件按需渲染
<KpayMicroAppMain
  {...props}
  keep-alive={isKeepAlive}
  microAppRef={microAppRef}
  setLoadingStatus={setLoading}
  data={microAppData}
  errorNode={<MicroAppError name={props.name} url={props.url} />}
/>

// src/MicroApp/utils.ts  广播数据
microApp.setGlobalData({ ...data, type: MICRO_APP_TYPE.AUTH_INFO_ASYNC });
```

---

## 8. 本项目的落地约定

### 8.1 子应用清单

| appName | 地址变量（window.env） | 业务 |
|---|---|---|
| `iam-app` | `SUB_IAM_APP_URL_VALUE` | 用户/角色/组织架构 |
| `crm-kcss` | `SUB_KCSS_APP_URL_VALUE` | 账户、结账、对账（KCSS） |
| `bi-report` | `SUB_BI_APP_URL_VALUE` | 报表 |
| `ai-agent` | `SUB_CHAT_BI_APP_URL_VALUE` | AI 助手 |
| `risk-ctrl-center` | `SUB_GLOBAL_RISK_APP_URL_VALUE` | 统一风控 |
| `after-sales` | `SUB_AFTER_SALES_URL_VALUE` | 售后中心 |
| `card-issuing-app` | `SUB_CARD_ISSUING_URL_VALUE` | 发卡（开关控制） |
| `merchant-profile-app` | `SUB_MERCHANT_PROFILE_URL_VALUE` | 商户档案 |
| `sub-crm-merchant` | `SUB_CRM_MERCHANT_URL_VALUE` | 商户 |
| `ku-system-app` | `SUB_KU_SYSTEM_URL_VALUE` | 协议中心 |
| `crm-inventory` | `SUB_INVENTORY_URL_VALUE` | 库存 |
| `kba` | `SUB_KBA_URL_VALUE` | 电子银行（开关控制） |
| `saas-business-app` | `SUB_SAAS_BUSINESS_URL_VALUE` | SaaS 业务 |
| `crm-salsops` | `SUB_SALSOPS_URL_VALUE` | 销售运营 |

### 8.2 新增一个子应用页面的五步

1. **建文件** `src/MicroApp/SubApp/XxxApp.tsx`，抄 `IAMApp.tsx` 的结构
2. **声明路由**：每条路由必须带 `system: appName` 和 `component`
3. **指定锚点** `anchor: { name: 'system', position: 'child' | 'before' | 'after' }`
4. **在 `src/app.tsx` 的 `patchRoutes` 里注册**：`SubApp.XxxApp(routes[0].routes, WrappedMicroAppMain, '锚点名')`
5. **在 `src/MicroApp/SubApp/index.ts` 导出**

`anchor` 找不到时的兜底：`commitFilterRouter` 末尾会把剩余节点 `push` 到菜单末尾（`SubApp/utils.ts:52-55`）。

### 8.3 地址注入与部署替换

```
构建期：document.ejs 里写占位符
        SUB_IAM_APP_URL_VALUE: 'UMI_APP_SUB_IAM_APP_URL'

运行期：容器启动执行 env_read.sh，把 index.html 里的占位符
        替换成同名环境变量 UMI_APP_SUB_IAM_APP_URL 的值

浏览器：window.env.SUB_IAM_APP_URL_VALUE = 'http://iam.test.a.kpay-test.com/'
```

**替换失败的表现**：值仍是 `UMI_APP_SUB_IAM_APP_URL` → `new URL()` 抛错 → 错误页。
**自查命令**：

```bash
curl -s http://<环境域名>/ | grep -c "UMI_APP_"
# 输出 > 0 说明有占位符没被替换
```

### 8.4 权限与多语言

| 关注点 | 基座做法 | 子应用做法 |
|---|---|---|
| 权限 | 每条路由声明 `access: 'system\|identify-manage'`，umi access 插件过滤菜单与路由；`useAccess()` 数据随 `MASTER_ACCESS_DATA` 下发 | 读 `getGlobalData()/addGlobalDataListener` 的 `accessData` 控制按钮 |
| 语言 | `getLocale()` 随挂载同步；切换时 `langChangeNotify` 广播 | 监听 `CONTROLLER_LANG_CHANGE` 切自己的 i18n |
| 登录态 | localStorage + `authSaveNotify` 广播；子应用需要刷新时 `forceDispatch` | 收到 `controller_update_token` 更新本地 token |

### 8.5 子应用侧的三个约定

1. **检测 `__MICRO_APP_ENVIRONMENT__`，在基座里不渲染自己的 Layout**（侧边栏/顶栏）
2. **路由跳转走 `dispatch(CONTROLLER_ROUTE_CHANGE)`**，不要直接 `history.push`
3. **不要在子应用里改 `document.title`、`document.body` 样式**，会与基座冲突

---

## 9. 排错清单

| 症状 | 最可能原因 | 定位手段 |
|---|---|---|
| 白屏 + `xxx 服務加載失敗` | entry URL 是占位符（未替换）或为空 | `curl <基座域名>/ \| grep UMI_APP_`；Console 里 `window.env` |
| 同上，且错误页有 `request url:` | 地址合法但 fetch 失败（404/跨域/证书） | Network 面板看 entry 请求状态 |
| 子应用加载成功但样式全乱 | CSS 前缀未生效 / `!important` / 行内样式 | Elements 里看 `<style>` 是否有 `micro-app[name=...]` 前缀 |
| 两个子应用全局变量互相影响 | with 沙箱拦截遗漏（如 `window.xxx = ` 之外的写法） | 子应用 Console 打 `window.__MICRO_APP_SANDBOX_TYPE__`，考虑改 iframe 沙箱 |
| 基座地址栏被子应用改掉 | 子应用直接操作 `window.history` 且路由模式不对 | 确认 `router-mode="native-scope"` |
| 权限变化后子应用按钮没更新 | 基座只在下发时机推送，子应用没监听 | 检查子应用是否 `addGlobalDataListener` |
| 子应用切走后定时器还在跑 | 沙箱记录/清理机制未覆盖（如 Web Worker 内部） | 子应用里自查 `setInterval` 泄漏 |
| 菜单项没出现 | `anchor` 锚点名写错，被兜底 push 到末尾 | 翻菜单最后几项；核对 `commitFilterRouter` |

### 调试常用命令（基座 Console）

```js
microApp.getAllApps()          // 当前注册的子应用
microApp.getActiveApps()       // 正在运行（未卸载）的
microApp.getData('iam-app')    // 基座侧缓存的数据
document.querySelector('micro-app[name=iam-app]').querySelector('micro-app-body')
```

---

## 10. 自检题

1. `<micro-app>` 这个标签为什么必须带短横线？谁让它有了行为？
2. 子应用的 `document.querySelector('.title')` 为什么查不到基座元素？靠什么实现的？
3. with 沙箱里"读穿透、写隔离"分别由哪一行代码保证？
4. `setData` 在子应用还没绑监听时发出，消息会不会丢？为什么？
5. `forceDispatch` 和 `dispatch` 的本质区别是什么？
6. 子应用里 `window.location.href` 在 `native-scope` 模式下返回什么？
7. 为什么 micro-app 不用 Shadow DOM 做样式隔离？
8. 基座怎么知道当前 URL 该渲染子应用？判断依据是 URL 字符串还是路由表？
9. `window.microApp` 和沙箱是什么关系？
10. entry URL 未替换时，错误是在哪一步产生的？

> 参考答案可在本文对应章节找到：1→§1，2→§3.6，3→§3.3，4→§5.4，5→§5.2，6→§6.2，7→§2.1，8→§8.2 与 `src/app.tsx:202`，9→§3.7，10→§4.3。
