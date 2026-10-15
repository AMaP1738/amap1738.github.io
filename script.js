(() => {
  'use strict';

  const introScreen   = document.getElementById('intro-screen');
  const menuScreen    = document.getElementById('menu-screen');
  const contentScreen = document.getElementById('content-screen');
  const introBtn      = document.getElementById('intro-continue');
  const backBtn       = document.getElementById('back-btn');
  const menuItemsEl   = document.getElementById('menu-items');
  const menuItems     = Array.from(menuItemsEl.querySelectorAll('.menu-item'));
  const contentTitle  = document.getElementById('content-title');
  const contentIndex  = document.getElementById('content-index');
  const wipe          = document.getElementById('wipe');

  let activeIndex = 0;
  let onMenu = true; // true = menu screen has keyboard focus, false = content screen

  /* ---------------- BOOT SCREEN ---------------- */
  (function bootSequence(){
    const boot = document.getElementById('boot-screen');
    if(sessionStorage.getItem('bootPlayed')) {
      boot.classList.add('is-hidden');
      return;
    }
    const linesEl = document.getElementById('boot-lines');
    const fill = document.getElementById('boot-progress-fill');
    const pct = document.getElementById('boot-pct');
    
    const lines = [
    'presence detected.',
    'aligning optics...',
    'calibrating laser : λ = 1550 nm',
    'preparing qubits : |0⟩ ⊗ |0⟩',
    'records processed : ████',
    'systems operational.',
    ];
    let i = 0;
  function nextLine(){
    if (i >= lines.length) return finish();
    const div = document.createElement('div');
    div.className = 'line' + (i === lines.length - 1 ? ' ok' : '');
    div.textContent = lines[i];
    linesEl.appendChild(div);
    i++;
    const p = Math.round((i / lines.length) * 100);
    fill.style.width = p + '%';
    pct.textContent = p + '%';
    setTimeout(nextLine, 450);
  }

  function finish(){
    setTimeout(() => {
      boot.classList.add('is-hidden');
      sessionStorage.setItem('bootPlayed', '1');
    }, 500);
  }

  nextLine();
})();


  /* ---------------- PROJECTS + EXPERIENCE (from JSON) ---------------- */
  const STATUS_LABELS = { complete: 'COMPLETE', active: 'IN PROGRESS' };

  function el(tag, className, text){
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function buildProjectCard(p){
    const card = el('article', 'quest-card');

    const top = el('div', 'quest-card-top');
    top.appendChild(el('h4', 'quest-title', p.title));
    if (p.status) {
      top.appendChild(el('span', 'quest-status ' + p.status, STATUS_LABELS[p.status] || p.status.toUpperCase()));
    }
    card.appendChild(top);

    if (p.dates) card.appendChild(el('p', 'quest-dates', p.dates));
    if (p.description) card.appendChild(el('p', 'quest-desc', p.description));

    if (p.tags && p.tags.length) {
      const tags = el('div', 'quest-tags');
      p.tags.forEach(t => tags.appendChild(el('span', 'tag', t)));
      card.appendChild(tags);
    }

    // only allow real web links, so a typo can't turn into a javascript: URL
    if (p.link && /^https?:\/\//i.test(p.link)) {
      const a = el('a', 'quest-link', '[view project]');
      a.href = p.link;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      card.appendChild(a);
    }
    return card;
  }

  function buildExperienceEntry(x){
    const entry = el('article', 'timeline-entry');
    const marker = el('div', 'timeline-marker');
    marker.setAttribute('aria-hidden', 'true');
    entry.appendChild(marker);

    const body = el('div', 'timeline-body');
    body.appendChild(el('h4', 'timeline-title', x.title));
    // a bare year just repeats the group heading, so only show fuller dates
    if (x.dates && !/^\s*\d{4}\s*$/.test(x.dates)) body.appendChild(el('p', 'timeline-dates', x.dates));
    if (x.description) body.appendChild(el('p', 'timeline-desc', x.description));
    entry.appendChild(body);
    return entry;
  }

  /* ---------------- GROUP BY YEAR ---------------- */
  // Year an item finished: an explicit "year" field wins, otherwise the last
  // 4-digit year in "dates" (the end date). Ongoing items ("status": "active")
  // get their own group at the top; anything without a year goes last.
  function yearGroup(item, activeLabel){
    if (item.status === 'active') return activeLabel;
    if (item.year) return String(item.year);
    const years = (item.dates || '').match(/\b(19|20)\d{2}\b/g);
    return years ? years[years.length - 1] : 'UNDATED';
  }

  // wrapClass: optional element each group's items sit inside (e.g. the timeline rail)
  function renderByYear(list, items, buildItem, { activeLabel, wrapClass } = {}){
    const groups = new Map();
    items.forEach(item => {
      const key = yearGroup(item, activeLabel);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    });

    const rank = k => k === activeLabel ? Infinity : k === 'UNDATED' ? -Infinity : Number(k);
    const keys = [...groups.keys()].sort((a, b) => rank(b) - rank(a));

    keys.forEach(key => {
      const group = groups.get(key);
      const section = el('section', 'year-group');
      const heading = el('h4', 'year-heading', '// ' + key);
      heading.appendChild(el('span', 'year-count', group.length + (group.length === 1 ? ' entry' : ' entries')));
      section.appendChild(heading);

      const holder = wrapClass ? section.appendChild(el('div', wrapClass)) : section;
      group.forEach(item => holder.appendChild(buildItem(item)));
      list.appendChild(section);
    });
  }

  async function loadJSONInto(url, listId, render, failText){
    const list = document.getElementById(listId);
    try {
      const res = await fetch(url, { cache: 'no-cache' });
      if (!res.ok) throw new Error(res.status);
      render(list, await res.json());
    } catch (err) {
      console.error('Could not load ' + url + ':', err);
      list.appendChild(el('p', 'panel-text', failText));
    }
  }

  loadJSONInto('projects.json', 'project-list',
    (list, items) => renderByYear(list, items, buildProjectCard, { activeLabel: 'IN PROGRESS' }),
    'Project log unavailable right now.');

  loadJSONInto('experience.json', 'experience-list',
    (list, items) => renderByYear(list, items, buildExperienceEntry, { activeLabel: 'CURRENT', wrapClass: 'timeline' }),
    'Experience log unavailable right now.');

  /* ---------------- SYSTEM CLOCK (menu readout) ---------------- */
  (function systemClock(){
    const clock = document.getElementById('sys-clock');
    if (!clock) return;
    const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    const pad = n => String(n).padStart(2, '0');
    function tick(){
      const d = new Date();
      clock.dateTime = d.toISOString();
      clock.textContent = `${pad(d.getUTCDate())} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()} · ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`;
    }
    tick();
    setInterval(tick, 30000);
  })();

  /* ---------------- INTRO -> MENU ---------------- */
  function enterMenu(){
    introScreen.classList.add('hidden');
    menuScreen.classList.remove('hidden');
    setActiveIndex(0);
    menuItems[0].focus();
  }
  introBtn.addEventListener('click', enterMenu);
  document.addEventListener('keydown', (e) => {
    if (!introScreen.classList.contains('hidden') && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      enterMenu();
    }
  });

  /* ---------------- MENU HIGHLIGHT ---------------- */
  function setActiveIndex(i){
    activeIndex = (i + menuItems.length) % menuItems.length;
    menuItems.forEach((item, idx) => {
      item.classList.toggle('is-active', idx === activeIndex);
    });
  }

  menuItems.forEach((item, idx) => {
    item.addEventListener('mouseenter', () => setActiveIndex(idx));
    item.addEventListener('click', () => selectItem(idx));
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectItem(idx);
      }
    });
  });

  /* ---------------- SELECT -> WIPE -> CONTENT ---------------- */
  function selectItem(idx){
    const item = menuItems[idx];
    const target = item.dataset.target;
    const label = item.querySelector('.item-label').textContent;
    const num = item.querySelector('.item-index').textContent;

    playWipe(() => {
      menuScreen.classList.add('hidden');
      contentScreen.classList.remove('hidden');
      contentTitle.textContent = label;
      contentIndex.textContent = num;
      showPanel(target);
      onMenu = false;
      backBtn.focus();
    });
  }

  function showPanel(target){
    document.querySelectorAll('.content-panel').forEach(panel => {
      panel.classList.remove('is-visible');
    });
    const panel = document.getElementById('section-' + target);
    if (panel) panel.classList.add('is-visible');
    document.getElementById('content-body').scrollTop = 0;
  }

  /* ---------------- BACK -> WIPE -> MENU ---------------- */
  function goBack(){
    playWipe(() => {
      contentScreen.classList.add('hidden');
      menuScreen.classList.remove('hidden');
      onMenu = true;
      menuItems[activeIndex].focus();
    });
  }
  backBtn.addEventListener('click', goBack);

  /* ---------------- WIPE TRANSITION ---------------- */
  function playWipe(midCallback){
    wipe.classList.add('is-active');
    setTimeout(() => {
      midCallback();
      wipe.classList.remove('is-active');
      wipe.classList.add('is-exiting');
      setTimeout(() => {
        wipe.classList.remove('is-exiting');
      }, 400);
    }, 500);
  }

  /* ---------------- GLOBAL KEYBOARD NAV ---------------- */
  document.addEventListener('keydown', (e) => {
    if (introScreen.classList.contains('hidden') === false) return; // handled above

    if (onMenu) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(activeIndex + 1); menuItems[activeIndex].focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(activeIndex - 1); menuItems[activeIndex].focus(); }
      else if (e.key === 'Escape') { /* no-op on top-level menu */ }
    } else {
      if (e.key === 'Escape') { e.preventDefault(); goBack(); }
    }
  });

})();