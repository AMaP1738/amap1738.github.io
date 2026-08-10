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