/* boot.js —— 挂载：侧边导航 + hash 路由 + 进度条 */
(function () {
  'use strict';
  const { h, Lab } = window;

  const sidebar = document.getElementById('sidebar');
  const progressBar = document.getElementById('progressBar');
  const progressText = document.getElementById('progressText');
  let content = document.getElementById('content');
  let navItems = [];

  function renderNav() {
    sidebar.innerHTML = '';
    navItems = [];
    let lastGroup = null;

    Lab.registry.forEach((lab) => {
      if (lab.group !== lastGroup) {
        sidebar.appendChild(h('div', { class: 'nav-group' }, lab.group));
        lastGroup = lab.group;
      }
      const item = h(
        'div',
        {
          class: 'nav-item',
          dataset: { id: lab.id },
          onclick: () => {
            location.hash = '#' + lab.id;
          },
        },
        h('span', { class: 'idx' }, String(lab.order).padStart(2, '0')),
        h('span', { class: 'nav-title' }, lab.title),
        h('span', { class: 'done' }, '✓'),
      );
      sidebar.appendChild(item);
      navItems.push(item);
    });
  }

  function refreshProgress() {
    const total = Lab.registry.length || 1;
    const done = Lab.registry.filter((l) => Lab.isDone(l.id)).length;
    progressBar.style.width = Math.round((done / total) * 100) + '%';
    progressText.textContent = done + ' / ' + total;
    navItems.forEach((item) => {
      item.classList.toggle('is-done', Lab.isDone(item.dataset.id));
    });
  }

  Lab.onProgress = refreshProgress;

  function currentId() {
    const raw = (location.hash || '').replace(/^#/, '');
    const hit = Lab.registry.find((l) => l.id === raw);
    return hit ? hit.id : (Lab.registry[0] && Lab.registry[0].id);
  }

  function render() {
    const id = currentId();
    const lab = Lab.registry.find((l) => l.id === id);

    // 每章重建容器，避免事件监听器跨章节累积
    const fresh = h('main', { class: 'content', id: 'content' });
    content.parentNode.replaceChild(fresh, content);
    content = fresh;

    navItems.forEach((item) => item.classList.toggle('active', item.dataset.id === id));

    if (!lab) {
      content.appendChild(h('div', { class: 'card' }, '没有找到章节：' + id));
      return;
    }

    try {
      lab.render(content);
    } catch (e) {
      content.appendChild(
        h(
          'div',
          { class: 'card' },
          h('div', { class: 'card-title' }, h('span', { class: 'dot' }), '本章渲染出错'),
          h('pre', { class: 'code' }, String(e && e.stack ? e.stack : e)),
        ),
      );
      console.error('[lab] render error', id, e);
    }

    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  window.addEventListener('hashchange', render);

  renderNav();
  render();
  refreshProgress();
})();
