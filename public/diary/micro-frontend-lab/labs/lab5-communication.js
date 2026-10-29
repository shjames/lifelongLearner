/* Lab 5 · 通信
   目标：跑通基座 ↔ 子应用的四条通道，理解"事件中心 + 缓存 + autoTrigger" */
(function () {
  'use strict';
  const { h, UI, Lab } = window;

  const APP = 'iam-app';

  const STATE = {
    childListening: true,
    globalListening: true,
    lastData: null,
    lastGlobal: null,
    forceResult: null,
    timeline: [],
  };

  function createCenter() {
    const center = new (window.MiniMicroApp.EventCenter)();
    const timeline = [];
    const record = (row) => {
      timeline.push(row);
      STATE.timeline = timeline;
      if (STATE.onRecord) STATE.onRecord();
    };
    return { center, record, timeline };
  }

  Lab.register({
    id: 'L5',
    order: 5,
    group: '协作机制',
    title: '通信：事件中心',
    subtitle: 'setData / setGlobalData / dispatch / forceDispatch',
    render(root) {
      const { center, record } = createCenter();

      const childLog = UI.log(160);
      const baseLog = UI.log(160);
      const timelineBox = h('div', { class: 'demo', style: { maxHeight: '220px', overflowY: 'auto' } });
      const cacheCell = h('td', { class: 'mono' }, '（空）');
      const globalCell = h('td', { class: 'mono' }, '（空）');

      const payloadInput = h('input', { type: 'text', value: '{"accessData":{"role":"admin"}}', style: { flex: '1 1 320px' } });
      const globalInput = h('input', { type: 'text', value: '{"language":"zh-HK"}', style: { flex: '1 1 320px' } });

      function parseJSON(str, fallback) {
        try {
          return JSON.parse(str);
        } catch (e) {
          UI.toast('JSON 格式不对：' + e.message, 'err');
          return fallback;
        }
      }

      function drawTimeline() {
        timelineBox.innerHTML = '';
        if (!STATE.timeline.length) {
          timelineBox.appendChild(h('div', { class: 'log-empty' }, '还没有消息…'));
          return;
        }
        STATE.timeline.forEach((row) => {
          timelineBox.appendChild(
            h(
              'div',
              { class: 'log-line ' + row.type },
              h('span', { class: 't' }, row.dir),
              h('span', { class: 'm' }, row.text),
            ),
          );
        });
        timelineBox.scrollTop = timelineBox.scrollHeight;
      }

      // 每次记录新消息后重绘时间线
      STATE.onRecord = drawTimeline;

      /* ---------- 基座侧 ---------- */

      const baseApi = {
        setData(appName, data) {
          const key = `__${appName}_from_base_app__`;
          const results = center.dispatch(key, data);
          record({ dir: '基座 → 子应用', type: 'msg', text: `setData('${appName}', ${JSON.stringify(data)})  · 命中监听 ${results.length} 个` });
          baseLog.add('msg', `setData → ${appName}：${JSON.stringify(data)}`);
          cacheCell.textContent = JSON.stringify(center.getData(key));
          return results;
        },
        setGlobalData(data) {
          const results = center.dispatch('global', data);
          record({ dir: '基座 → 全体', type: 'msg', text: `setGlobalData(${JSON.stringify(data)})  · 命中监听 ${results.length} 个` });
          baseLog.add('msg', `setGlobalData（广播）：${JSON.stringify(data)}`);
          globalCell.textContent = JSON.stringify(center.getData('global'));
          return results;
        },
        onChildMessage(cb) {
          center.on(`__${APP}_from_micro_app__`, cb, true);
        },
      };

      /* ---------- 子应用侧 ---------- */

      const childApi = {
        addListener() {
          if (STATE.childListening) center.off(`__${APP}_from_base_app__`, childApi._onData);
          center.on(`__${APP}_from_base_app__`, childApi._onData, true);
          STATE.childListening = true;
          childLog.add('ok', 'addDataListener(cb, autoTrigger=true) 已绑定');
        },
        removeListener() {
          center.off(`__${APP}_from_base_app__`, childApi._onData);
          STATE.childListening = false;
          childLog.add('warn', 'removeDataListener(cb)  · 已解绑，此时基座发来的数据只会进缓存');
        },
        _onData(data) {
          STATE.lastData = data;
          childLog.add('info', 'addDataListener 收到：' + JSON.stringify(data));
        },
        getData() {
          const d = center.getData(`__${APP}_from_base_app__`);
          childLog.add('info', 'getData() → ' + JSON.stringify(d));
          return d;
        },
        dispatch(data) {
          record({ dir: '子应用 → 基座', type: 'msg', text: `dispatch(${JSON.stringify(data)})` });
          childLog.add('msg', 'dispatch：' + JSON.stringify(data));
          return center.dispatch(`__${APP}_from_micro_app__`, data);
        },
        async forceDispatch(data) {
          record({ dir: '子应用 → 基座', type: 'msg', text: `forceDispatch(${JSON.stringify(data)})  · 等待返回值` });
          childLog.add('msg', 'forceDispatch 发出，等待基座返回…');
          const results = await center.dispatchAsync(`__${APP}_from_micro_app__`, data);
          STATE.forceResult = results;
          childLog.add('ok', 'forceDispatch 收到返回：' + JSON.stringify(results));
          return results;
        },
        getGlobalData() {
          const d = center.getData('global');
          STATE.lastGlobal = d;
          childLog.add('info', 'getGlobalData() → ' + JSON.stringify(d));
          return d;
        },
      };

      // 基座监听子应用消息；token 刷新走"请求-响应"
      baseApi.onChildMessage(async (data) => {
        baseLog.add('info', '收到子应用消息：' + JSON.stringify(data));
        if (data && data.type === 'AUTH_INFO_REFERESH_ASYNC') {
          // 模拟异步刷新 token
          await new Promise((r) => setTimeout(r, 160));
          return { type: data.type, refreshSuccess: true, accessToken: 'mock-token-' + Date.now() };
        }
        return { received: true };
      });

      /* ---------- UI 事件 ---------- */

      const checks = UI.check(
        [
          {
            label: 'setData 后，子应用重新绑定时能补收到历史数据（autoTrigger）',
            test: () => {
              const cached = center.getData(`__${APP}_from_base_app__`);
              return cached ? true : '先点「setData 下发」，再把子应用监听解绑/重绑';
            },
            detail: '事件中心保留了最后一次数据，addDataListener 的 autoTrigger 会立即回放',
          },
          {
            label: '子应用 dispatch 的消息被基座收到',
            test: () => (STATE.timeline.some((r) => r.dir === '子应用 → 基座') ? true : '点「dispatch 通知」'),
            detail: '子应用 → 基座的通道靠 addDataListener(appName, cb)',
          },
          {
            label: 'forceDispatch 拿回了基座的返回值',
            test: () => (STATE.forceResult ? true : '点「forceDispatch 请求 token」'),
            detail: '基座 listener 的 return 值会回传给子应用的回调',
          },
          {
            label: 'setGlobalData 的数据能被 getGlobalData 读到',
            test: () => {
              const g = center.getData('global');
              return g ? true : '点「setGlobalData 广播」';
            },
            detail: '广播通道对所有子应用可见',
          },
        ],
        () => Lab.done('L5'),
      );

      root.appendChild(
        UI.head(
          'L5 · 协作机制',
          '通信：为什么不用 postMessage',
          '基座和子应用跑在同一个 JS 运行时里（with 沙箱共享文档），传对象引用即可，没有任何序列化成本。micro-app 用自己实现的事件中心，按 appName 分频道。',
        ),
      );

      root.appendChild(
        UI.card(
          '四条通道',
          h(
            'table',
            { class: 'tbl' },
            h(
              'thead',
              null,
              h('tr', null, h('th', null, '方向'), h('th', null, '发送'), h('th', null, '接收')),
            ),
            h(
              'tbody',
              null,
              h('tr', null, h('td', null, '基座 → 指定子应用'), h('td', null, h('code', null, 'microApp.setData(appName, data)')), h('td', null, h('code', null, 'child.addDataListener(cb)'))),
              h('tr', null, h('td', null, '子应用 → 基座'), h('td', null, h('code', null, 'child.dispatch(data)')), h('td', null, h('code', null, 'microApp.addDataListener(appName, cb)'))),
              h('tr', null, h('td', null, '基座 → 全体'), h('td', null, h('code', null, 'microApp.setGlobalData(data)')), h('td', null, h('code', null, 'child.getGlobalData()'))),
              h('tr', null, h('td', null, '子应用 → 基座（要返回值）'), h('td', null, h('code', null, 'child.forceDispatch(data, cb)')), h('td', null, '基座 listener 的 return')),
            ),
          ),
        ),
      );

      root.appendChild(
        UI.card(
          '动手：跑一遍四条通道',
          h(
            'div',
            { class: 'split' },
            /* 基座面板 */
            h(
              'div',
              { class: 'demo' },
              h('div', { class: 'demo-label' }, '基座（master）'),
              h('div', { class: 'row' }, payloadInput),
              h(
                'div',
                { class: 'row' },
                h('button', { class: 'btn primary', onclick: () => baseApi.setData(APP, parseJSON(payloadInput.value, {})) }, 'setData 下发'),
                h('button', { class: 'btn', onclick: () => { childApi.removeListener(); } }, '子应用解绑监听'),
                h('button', { class: 'btn', onclick: () => { childApi.addListener(); } }, '子应用重新绑定'),
              ),
              h('div', { class: 'row' }, globalInput),
              h('div', { class: 'row' }, h('button', { class: 'btn', onclick: () => baseApi.setGlobalData(parseJSON(globalInput.value, {})) }, 'setGlobalData 广播')),
              baseLog.el,
            ),
            /* 子应用面板 */
            h(
              'div',
              { class: 'demo' },
              h('div', { class: 'demo-label' }, '子应用 iam-app（micro）'),
              h(
                'div',
                { class: 'row' },
                h('button', { class: 'btn', onclick: () => childApi.getData() }, 'getData()'),
                h('button', { class: 'btn', onclick: () => childApi.getGlobalData() }, 'getGlobalData()'),
              ),
              h(
                'div',
                { class: 'row' },
                h(
                  'button',
                  {
                    class: 'btn',
                    onclick: () => childApi.dispatch({ type: 'CONTROLLER_ROUTE_CHANGE', toRoute: { location: '/system/userList' } }),
                  },
                  'dispatch 通知',
                ),
                h(
                  'button',
                  {
                    class: 'btn primary',
                    onclick: () => childApi.forceDispatch({ type: 'AUTH_INFO_REFERESH_ASYNC' }),
                  },
                  'forceDispatch 请求 token',
                ),
              ),
              childLog.el,
            ),
          ),
          h(
            'table',
            { class: 'tbl', style: { marginTop: '14px' } },
            h('thead', null, h('tr', null, h('th', null, '事件中心缓存'), h('th', null, '当前值'))),
            h('tbody', null, h('tr', null, h('td', null, `__${APP}_from_base_app__`), cacheCell), h('tr', null, h('td', null, 'global'), globalCell)),
          ),
          h('div', { class: 'demo-label', style: { marginTop: '12px' } }, 'MESSAGE TIMELINE'),
          timelineBox,
          UI.note(
            '关键实验：先点 <b>「子应用解绑监听」</b> → 再点 <b>「setData 下发」</b>（此时没有监听者，数据只进缓存）→ ' +
              '再点 <b>「子应用重新绑定」</b>，会立刻收到刚才那条数据。这就是 <code class="inline">autoTrigger</code>，' +
              '也是基座"挂载前先下发权限"不会丢消息的原因。',
            'ok',
          ),
        ),
      );

      root.appendChild(
        UI.card(
          '事件中心的实现（约 20 行）',
          UI.code(
            `class EventCenter {
  constructor() { this.channels = new Map(); }

  channel(name) {
    if (!this.channels.has(name)) this.channels.set(name, { data: null, listeners: new Set() });
    return this.channels.get(name);
  }

  on(name, cb, autoTrigger) {
    const ch = this.channel(name);
    ch.listeners.add(cb);
    // 绑定时如果已有历史数据，立即回放一次
    if (autoTrigger && ch.data !== null) cb(ch.data);
  }

  off(name, cb) { this.channels.get(name)?.listeners.delete(cb); }

  dispatch(name, data) {
    const ch = this.channel(name);
    ch.data = data;                       // 永远先存缓存
    return [...ch.listeners].map((cb) => cb(data));
  }

  getData(name) { return this.channels.get(name)?.data ?? null; }
}`,
            '与 micro-app 同构的最小实现',
          ),
          UI.note(
            'micro-app 的事件名是 <code class="inline">__${appName}_from_base_app__</code> / ' +
              '<code class="inline">__${appName}_from_micro_app__</code>，靠通道名天然做到"点对点"。',
          ),
        ),
      );

      root.appendChild(UI.card('验收', checks.el));

      childApi.addListener();
      drawTimeline();
    },
  });
})();
