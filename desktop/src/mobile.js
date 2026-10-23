/* Mobile layout, phone tabs and device detection for Tim-Tim. */
(function () {
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || (window.innerWidth <= 820);
  if (window.TT && window.TT.net) {
    window.TT.net.device = isMobile ? 'mobile' : 'desktop';
  }

  // Inject mobile styles dynamically if not in css
  const style = document.createElement('style');
  style.id = 'mobile-enhancements';
  style.textContent = `
    @media (max-width: 820px) {
      .links { display: none !important; }
      .core-foot { bottom: 10px; }
      .shell { padding-bottom: 64px !important; }
      
      /* Mobile panel switching: prevent bleed-through and overlap */
      body[data-mobile-panel="world"] .col.left { display: flex !important; width: 100% !important; z-index: 10; }
      body[data-mobile-panel="world"] .col.mid { display: none !important; }
      body[data-mobile-panel="world"] .col.right { display: none !important; }

      body[data-mobile-panel="core"] .col.left { display: none !important; }
      body[data-mobile-panel="core"] .col.mid { display: grid !important; width: 100% !important; z-index: 10; }
      body[data-mobile-panel="core"] .col.right { display: none !important; }

      body[data-mobile-panel="chat"] .col.left { display: none !important; }
      body[data-mobile-panel="chat"] .col.mid { display: none !important; }
      body[data-mobile-panel="chat"] .col.right { display: flex !important; width: 100% !important; z-index: 10; }

      /* Mobile bottom navigation bar */
      .mobile-nav {
        display: flex !important;
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        height: 60px;
        background: var(--bg2, #0d0f14);
        border-top: 1px solid var(--card-b, rgba(255,255,255,0.08));
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        z-index: 999;
        justify-content: space-around;
        align-items: center;
        padding: 0 10px;
      }

      .mnav-btn {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 3px;
        background: none;
        border: none;
        color: var(--muted, #888);
        font-size: 11px;
        font-weight: 500;
        padding: 6px 16px;
        border-radius: 12px;
        cursor: pointer;
        position: relative;
        transition: color 0.15s, background 0.15s;
      }
      .mnav-btn svg {
        width: 20px;
        height: 20px;
        stroke: currentColor;
      }
      .mnav-btn.on {
        color: var(--accent, #ef4444);
        background: color-mix(in srgb, var(--accent, #ef4444) 12%, transparent);
      }
      .mnav-btn .badge {
        position: absolute;
        top: 4px;
        right: 18px;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--accent, #ef4444);
      }
    }

    @media (min-width: 821px) {
      .mobile-nav { display: none !important; }
    }
  `;
  document.head.appendChild(style);

  // Setup mobile navigation once DOM is ready
  function initMobileNav() {
    if (document.getElementById('mobile-nav')) return;

    const nav = document.createElement('nav');
    nav.className = 'mobile-nav';
    nav.id = 'mobile-nav';
    nav.innerHTML = `
      <button class="mnav-btn" data-panel="world" type="button"><svg><use href="#i-radar"/></svg><span>World</span></button>
      <button class="mnav-btn on" data-panel="core" type="button"><svg><use href="#i-core"/></svg><span>Core</span></button>
      <button class="mnav-btn" data-panel="chat" type="button"><svg><use href="#i-send"/></svg><span>Chat</span><i class="badge" id="chat-badge" hidden></i></button>
    `;
    document.body.appendChild(nav);

    // Initial default panel
    if (!document.body.dataset.mobilePanel) {
      document.body.dataset.mobilePanel = 'core';
    }

    nav.querySelectorAll('.mnav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const p = btn.dataset.panel;
        document.body.dataset.mobilePanel = p;
        nav.querySelectorAll('.mnav-btn').forEach(b => b.classList.toggle('on', b === btn));
        if (p === 'chat') {
          const badge = document.getElementById('chat-badge');
          if (badge) badge.hidden = true;
          const log = document.getElementById('log');
          if (log) setTimeout(() => { log.scrollTop = log.scrollHeight; }, 60);
        }
      });
    });

    // PWA Service Worker
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileNav);
  } else {
    initMobileNav();
  }
})();
