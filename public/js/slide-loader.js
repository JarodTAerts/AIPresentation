/* =============================================================
   Slide loader — fetches each slide file in window.SLIDE_MANIFEST,
   concatenates them into the .slides container, and exposes a
   promise (window.SLIDES_READY) that main.js awaits before
   initializing Reveal.
   ============================================================= */

window.SLIDES_READY = (async function loadSlides() {
  const container = document.querySelector('.reveal .slides');
  const manifest = window.SLIDE_MANIFEST || [];

  if (!manifest.length) {
    console.error('[slide-loader] SLIDE_MANIFEST is empty.');
    return;
  }

  try {
    const fragments = await Promise.all(
      manifest.map(async (path) => {
        const res = await fetch(path, { cache: 'no-cache' });
        if (!res.ok) throw new Error(`${path} → HTTP ${res.status}`);
        return { path, html: await res.text() };
      })
    );

    container.innerHTML = fragments.map(f => f.html).join('\n');
    console.info(`[slide-loader] Loaded ${fragments.length} slides.`);
  } catch (err) {
    console.error('[slide-loader] Failed to load slides:', err);
    container.innerHTML = `
      <section>
        <h2 style="color:var(--rose);">Could not load slides</h2>
        <p class="small">${err.message}</p>
        <p class="small muted">If you're opening <code>presentation.html</code> directly, browsers block local fetches.<br>
        Run <code>python3 -m http.server</code> in the <code>public/</code> folder and open <code>http://localhost:8000/presentation</code>.</p>
      </section>`;
    throw err;
  }
})();
