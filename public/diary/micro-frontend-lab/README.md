# KPay 微前端实验室

配套《[micro-frontend-handbook.md](../micro-frontend-handbook.md)》的交互实操项目。7 个 Lab 与手册第 1–7 章一一对应，全部示例在本页真实执行（无构建、无依赖、无网络请求）。

## 运行方式

**方式一：直接打开（推荐）**

双击 `index.html`，或浏览器地址栏输入：

```
file:///C:/Users/suzhiquan/projects/kpay/OBS/kpay-crm-web/.claude/output/ArchitectureLearning/micro-frontend-lab/index.html
```

**方式二：本地静态服务器**（个别浏览器对 file:// 下 iframe srcdoc 有限制时使用）

```bash
cd .claude/output/ArchitectureLearning/micro-frontend-lab
npx serve .
# 打开 http://localhost:3000
```

支持 Chrome / Edge / Firefox 现代浏览器。

## 目录

| Lab | 主题 | 对应手册章节 | 你会亲手做什么 |
|---|---|---|---|
| L1 | Custom Elements 自定义元素 | §1 | 注册 `<my-card>`，观察 4 个生命周期回调的触发时机 |
| L2 | 样式隔离 | §2 | 对比"CSS 原样注入污染基座" vs "加宿主前缀后互不影响"，实时改写选择器 |
| L3 | with + Proxy 沙箱 | §3 / §3.10 | 同一段代码用 raw / 沙箱两种方式执行；再操作一个真实 Proxy 逐个触发 trap，看读穿透、写隔离发生在哪一步 |
| L4 | 资源加载与路径补全 | §4 | 用 DOMParser 解析真实 IAM entry HTML，看 `<micro-app-head>` / `<micro-app-body>` 怎么生成、相对路径怎么补全 |
| L5 | 事件中心通信 | §5 | 跑通 setData / dispatch / setGlobalData / forceDispatch 四条通道；做"解绑 → 发消息 → 重绑看缓存回放"实验 |
| L6 | 路由模式 | §6 | 切换 native / native-scope / pure，观察地址栏、子应用 location、router 匹配路径的差异 |
| L7 | 迷你微前端 | 全书组装 | 用 ~260 行内核（`mini/micro-app-lite.js`）同时挂载两个真实子应用，验证 DOM 搬移、样式隔离、沙箱隔离、通信全链路 |

## 文件结构

```
micro-frontend-lab/
├── index.html              入口
├── styles.css              深色主题样式
├── core.js                 基础设施：h() / UI 组件 / Lab 注册表 / 进度持久化
├── boot.js                 侧边导航 + hash 路由 + 进度条
├── mini/
│   └── micro-app-lite.js   约 260 行的迷你内核（EventCenter / scopeCSS /
│                           WithSandbox / MiniAppElement 自定义元素）
└── labs/
    ├── lab1-custom-elements.js
    ├── lab2-style-isolation.js
    ├── lab3-sandbox.js
    ├── lab4-loader.js
    ├── lab5-communication.js
    ├── lab6-router.js
    └── lab7-mini-micro-app.js
```

## 说明

- **验收清单**：每个 Lab 底部有一组验收断言，全部通过后自动记入进度（存 localStorage，键 `kpay-mfl-progress-v1`），顶部进度条实时更新。想重置进度：控制台执行 `localStorage.removeItem('kpay-mfl-progress-v1')` 后刷新。
- **安全边界**：L2 / L3 中会"污染全局"的演示跑在同源 iframe（srcdoc）里，通过 postMessage 回报结果，不影响实验室页面本身；L7 的子应用代码完全受控，在主窗口真实运行。
- **源码对照**：L3 / L7 内嵌了与 `@micro-zoe/micro-app` 源码的对照表，函数名与 `lib/index.esm.js` 一致，可直接回读 node_modules 里的未压缩源码。
