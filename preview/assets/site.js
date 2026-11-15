/* Shepley Magazine – site script. Content lives in data/site.json and data/issues.json. */
(function () {
  const BASE = window.SITE_BASE || '';
  const PREVIEW = !!window.SITE_PREVIEW;
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const url = p => BASE + p;

  let SITE, ISSUES, LATEST, ALL_ARTICLES = [];
  const secBy = slug => SITE.sections.find(x => x.slug === slug) || { slug, name: slug, ico: '', desc: '' };
  const issueBy = id => ISSUES.find(i => i.id === id);
  const pdfPage = (issue, page) => url(issue.pdf) + (page ? '#page=' + page : '');

  async function getJSON(p) { const r = await fetch(url(p), { cache: 'no-cache' }); if (!r.ok) throw new Error(p); return r.json(); }

  async function load() {
    SITE = await getJSON('data/site.json');
    let data;
    if (PREVIEW) { try { data = await getJSON('data/issues-preview.json'); } catch (e) { data = null; } }
    if (!data) data = await getJSON('data/issues.json');
    ISSUES = data.issues.slice().sort((a, b) => b.id.localeCompare(a.id));
    LATEST = ISSUES[0];
    ALL_ARTICLES = ISSUES.flatMap(iss => iss.articles.map(a => ({ ...a, issue: iss })));
    buildChrome();
    render();
    addEventListener('hashchange', render);
  }

  /* ---------- shared bits ---------- */
  const card = a => `<a class="card" href="#article-${a.issue.id}-${a.id}"><span class="cat">${esc(secBy(a.section).name)}</span><h3>${esc(a.title)}</h3><p>${esc(a.summary)}</p><span class="foot">${esc(a.issue.title)} · page ${a.page}</span></a>`;
  const diaryTable = (rows, keys) => `<table class="diary"><thead><tr><th>When</th><th>Event</th><th>Where</th><th>Time</th></tr></thead><tbody>${rows.map(r => `<tr>${keys.map(k => `<td>${esc(r[k])}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  const coverImg = (iss, cls) => `<img src="${url(iss.cover)}" alt="${esc(iss.title)} cover" ${cls ? `class="${cls}"` : ''} onerror="this.outerHTML='<div class=&quot;cov-missing&quot;>${esc(iss.title)}<br>Issue ${iss.number}</div>'">`;

  function buildChrome() {
    $('#ddPanel').innerHTML = SITE.sections.map(s => `<a href="#section-${s.slug}"><b>${s.ico} ${esc(s.name)}</b><span>${esc(s.desc)}</span></a>`).join('');
    const dd = $('#dd');
    $('#ddBtn').addEventListener('click', e => { e.stopPropagation(); dd.classList.toggle('open'); $('#ddBtn').setAttribute('aria-expanded', dd.classList.contains('open')); });
    document.addEventListener('click', e => { if (!dd.contains(e.target)) dd.classList.remove('open'); });
    $('#burger').addEventListener('click', () => $('#nav').classList.toggle('open'));
    $('#footer').innerHTML = `<div class="wrap"><div class="cols">
      <div><div style="font-family:var(--serif);font-size:30px;color:#fff;line-height:1">${esc(SITE.name)}</div><p>${esc(SITE.about)}</p></div>
      <div><h4>Get in touch</h4>Contributions (by the ${esc(SITE.deadlineDay)}):<br><a href="mailto:${esc(SITE.contributionsEmail)}">${esc(SITE.contributionsEmail)}</a><br>Advertising &amp; enquiries:<br><a href="mailto:${esc(SITE.enquiriesEmail)}">${esc(SITE.enquiriesEmail)}</a></div>
      <div><h4>Explore</h4><a href="#latest-issue">Latest issue</a><br><a href="#archive">Back issues</a><br><a href="#whats-on">What's On</a><br><a href="#contribute">Contribute or advertise</a></div>
    </div><div class="small">© Copyright Shepley's Magazine</div></div>`;
    if (PREVIEW) {
      const b = document.createElement('div');
      b.style.cssText = 'background:#a8793f;color:#fff;font:600 13px Inter,sans-serif;text-align:center;padding:8px';
      b.textContent = 'PREVIEW – changes here are not on the live site yet';
      document.body.prepend(b);
    }
    setupSearch();
  }

  /* ---------- views ---------- */
  const views = {
    home() {
      const iss = LATEST;
      const feat = (iss.featured || []).map(id => iss.articles.find(a => a.id === id)).filter(Boolean).map(a => ({ ...a, issue: iss }));
      const latest = feat.length ? feat : iss.articles.slice(0, 6).map(a => ({ ...a, issue: iss }));
      return `<div class="wrap"><div class="hero">
        <div class="hero-img"><img src="${url(iss.photo || iss.cover)}" alt="${esc(iss.title)} cover photo" onerror="this.parentNode.classList.add('no-photo');this.remove()">${iss.photoCredit ? `<span class="tag">${esc(iss.photoCredit)}</span>` : ''}</div>
        <div>
          <div class="eyebrow">Issue ${iss.number} · ${esc(iss.title)}</div>
          <h1>${esc(iss.headline || 'The ' + iss.month + ' issue is here')}</h1>
          <p class="lede">${esc(iss.lede || '')}</p>
          <ul class="featured">${latest.slice(0, 5).map(a => `<li><a href="#article-${iss.id}-${a.id}">${esc(a.title.split(':')[0])} <em>p${a.page}</em></a></li>`).join('')}</ul>
          <div class="actions"><a class="btn" href="${pdfPage(iss)}" target="_blank" rel="noopener">Read the issue</a><a class="btn ghost" href="#latest-issue">What's inside</a></div>
        </div></div></div>
      <section class="sec-strip"><div class="wrap">
        <span class="sec-strip-label">Browse by section</span>
        <div class="sec-chips">${SITE.sections.map(s => `<a class="sec-chip" href="#section-${s.slug}" title="${esc(s.desc)}"><span aria-hidden="true">${s.ico}</span>${esc(s.name)}</a>`).join('')}</div>
      </div></section>
      <section class="block"><div class="wrap">
        <div class="section-head"><div><div class="eyebrow">In this issue</div><h2>Latest articles</h2></div><a href="#latest-issue">See all ${iss.articles.length} articles →</a></div>
        <div class="grid">${latest.map(card).join('')}</div>
      </div></section>
      ${iss.diary && iss.diary.length ? `<section class="block"><div class="wrap">
        <div class="section-head"><div><div class="eyebrow">Dates for your diary</div><h2>Coming up in Shepley</h2></div><a href="#whats-on">Full diary →</a></div>
        ${diaryTable(iss.diary.slice(0, 8), ['when', 'event', 'where', 'time'])}
      </div></section>` : ''}
      <section class="block" style="border:0"><div class="wrap"><div class="band">
        <div><h2>Got something to share?</h2><p>Club news, letters, photos and memories are always welcome. Email your contribution by the ${esc(SITE.deadlineDay)} of the month to appear in the next issue.</p></div>
        <div><a class="btn" href="#contribute">How to contribute</a></div>
      </div></div></section>`;
    },
    'latest-issue'() { return issueView(LATEST); },
    'whats-on'() {
      const iss = LATEST;
      return `<div class="wrap" style="padding:48px 24px 70px"><div class="eyebrow">What's On</div><h1>Dates for your diary</h1>
        <div class="tabs"><button class="on" data-t="m">${esc(iss.month || 'This month')}</button><button data-t="w">Every week</button></div>
        <div id="diaryBox">${diaryTable(iss.diary || [], ['when', 'event', 'where', 'time'])}</div></div>`;
    },
    archive() {
      return `<div class="wrap" style="padding:48px 24px 70px"><div class="eyebrow">Archive</div><h1>Back issues</h1>
        <p style="max-width:640px">Every issue of Shepley Magazine. Use search to find articles across all issues.</p>
        <div class="issues" style="margin-top:28px">${ISSUES.map((iss, i) => `<a class="issue" href="#issue-${iss.id}"><div class="cov">${coverImg(iss)}</div><b>${esc(iss.title)}</b><span>Issue ${iss.number}${i === 0 ? ' · Latest' : ''}</span></a>`).join('')}</div></div>`;
    },
    contribute() {
      return `<div class="wrap"><div class="article"><div class="eyebrow">Contribute</div><h1>Write for the magazine</h1><div class="body">
        <p>Shepley Magazine is written by the village. Club reports, letters, photographs, memories and event listings are all welcome.</p>
        <h3>Deadline</h3><p>Email contributions by the <strong>${esc(SITE.deadlineDay)} of the month</strong> to <a href="mailto:${esc(SITE.contributionsEmail)}">${esc(SITE.contributionsEmail)}</a>, or put your letter in the Shepley Magazine Box in the library.</p>
        <h3>Advertising &amp; other enquiries</h3><p><a href="mailto:${esc(SITE.enquiriesEmail)}">${esc(SITE.enquiriesEmail)}</a></p>
        <h3>Support the magazine</h3><p>The magazine is free to every household and relies on donations. Cheques payable to Shepley’s Magazine can be left in the Shepley Magazine Box in the library; bank details are printed in each issue.</p>
      </div></div></div>`;
    }
  };

  function issueView(iss) {
    if (!iss) return views.home();
    const groups = SITE.sections.map(s => ({ s, items: iss.articles.filter(a => a.section === s.slug) })).filter(g => g.items.length);
    return `<div class="wrap" style="padding:48px 24px 70px"><div class="issue-layout">
      <div>
        <div class="issue"><div class="cov">${coverImg(iss)}</div></div>
        <div style="display:flex;flex-direction:column;gap:10px;margin-top:18px">
          <a class="btn" href="${pdfPage(iss)}" target="_blank" rel="noopener">Read online (PDF)</a>
          <a class="btn ghost" href="${url(iss.pdf)}" download>Download PDF</a>
        </div>
      </div>
      <div>
        <div class="eyebrow">Issue ${iss.number}</div><h1>${esc(iss.title)}</h1>
        <p class="lede" style="font-size:19px">${esc(iss.lede || '')}</p>
        ${groups.map(g => `<h3 style="margin-top:28px">${g.s.ico} ${esc(g.s.name)}</h3><ul class="featured" style="margin-top:6px">${g.items.map(a => `<li><a href="#article-${iss.id}-${a.id}">${esc(a.title)} <em>page ${a.page}</em></a></li>`).join('')}</ul>`).join('')}
      </div></div></div>`;
  }

  function sectionView(slug) {
    const s = SITE.sections.find(x => x.slug === slug); if (!s) return views.home();
    const items = ALL_ARTICLES.filter(a => a.section === slug);
    return `<div class="wrap" style="padding:48px 24px 70px"><div class="eyebrow">Section</div><h1>${s.ico} ${esc(s.name)}</h1>
      <p style="max-width:640px;color:var(--muted)">${esc(s.desc)}. Articles from every issue appear here, newest first.</p>
      <div class="chips">${SITE.sections.map(x => `<a class="chip ${x.slug === slug ? 'on' : ''}" href="#section-${x.slug}">${esc(x.name)}</a>`).join('')}</div>
      <div class="grid" style="margin-top:28px">${items.map(card).join('') || '<p>No articles in this section yet.</p>'}</div></div>`;
  }

  function articleView(key) {
    const a = ALL_ARTICLES.find(x => key === x.issue.id + '-' + x.id); if (!a) return views.home();
    const s = secBy(a.section); const more = ALL_ARTICLES.filter(x => x.section === a.section && x !== a).slice(0, 3);
    return `<div class="wrap"><article class="article">
      <div class="crumbs"><a href="#home">Home</a> › <a href="#section-${s.slug}">${esc(s.name)}</a></div>
      <div class="eyebrow">${esc(s.name)}</div><h1>${esc(a.title)}</h1>
      <div class="byline"><span>By ${esc(a.author)}</span><span>${esc(a.issue.title)} · Issue ${a.issue.number} · page ${a.page}</span></div>
      <div class="body">${a.body.map(p => `<p>${esc(p)}</p>`).join('')}</div>
      <div class="pdf-note"><span>See the full article with photos in the magazine, page ${a.page}.</span><a class="btn" href="${pdfPage(a.issue, a.page)}" target="_blank" rel="noopener">Open page ${a.page} of the PDF</a></div>
      <div class="chips"><a class="chip" href="#section-${s.slug}">${esc(s.name)}</a><a class="chip" href="#issue-${a.issue.id}">${esc(a.issue.title)}</a></div>
    </article>
    ${more.length ? `<section class="block" style="border-top:1px solid var(--line)"><div class="section-head"><h2>More from ${esc(s.name)}</h2></div><div class="grid">${more.map(card).join('')}</div></section>` : ''}</div>`;
  }

  /* ---------- router ---------- */
  function render() {
    const h = decodeURIComponent(location.hash.slice(1)) || 'home';
    let html, key = h;
    if (h.startsWith('section-')) { html = sectionView(h.slice(8)); key = 'sections'; }
    else if (h.startsWith('article-')) { html = articleView(h.slice(8)); key = 'sections'; }
    else if (h.startsWith('issue-')) { html = issueView(issueBy(h.slice(6))); key = 'archive'; }
    else if (views[h]) html = views[h]();
    else { html = views.home(); key = 'home'; }
    $('#app').innerHTML = html;
    document.querySelectorAll('nav.main > a').forEach(a => a.classList.toggle('active', a.dataset.r === key));
    $('#ddBtn').classList.toggle('active', key === 'sections');
    $('#dd').classList.remove('open'); $('#nav').classList.remove('open');
    window.scrollTo(0, 0);
    const t = $('#app h1'); document.title = (t && key !== 'home' ? t.textContent + ' – ' : '') + SITE.name;
    const tabs = document.querySelectorAll('.tabs button');
    tabs.forEach(b => b.addEventListener('click', () => {
      tabs.forEach(x => x.classList.remove('on')); b.classList.add('on');
      $('#diaryBox').innerHTML = b.dataset.t === 'm' ? diaryTable(LATEST.diary || [], ['when', 'event', 'where', 'time']) : diaryTable(SITE.weekly, ['day', 'event', 'where', 'time']);
    }));
  }

  /* ---------- search ---------- */
  let INDEX = [], pagesLoaded = false, sFilter = 'all', sel = 0, current = [];
  function norm(s) { return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’‘]/g, "'"); }

  function buildIndex() {
    INDEX = [
      ...ALL_ARTICLES.map(a => ({ type: 'Article', cat: secBy(a.section).name, sec: a.section, title: a.title, text: a.summary + ' ' + a.body.join(' ') + ' ' + a.author, href: `#article-${a.issue.id}-${a.id}`, sum: a.summary, issue: a.issue })),
      ...(LATEST.diary || []).map(r => ({ type: 'Event', cat: 'What’s On', sec: 'whats-on', title: r.event, text: Object.values(r).join(' '), href: '#whats-on', sum: `${r.when} ${LATEST.month} · ${r.where} · ${r.time}` })),
      ...SITE.weekly.map(r => ({ type: 'Weekly', cat: 'Every week', sec: 'whats-on', title: r.event, text: Object.values(r).join(' '), href: '#whats-on', sum: `${r.day} · ${r.where} · ${r.time}` }))
    ];
  }
  async function loadPages() {
    if (pagesLoaded) return; pagesLoaded = true;
    for (const iss of ISSUES) {
      try {
        const d = await getJSON(`data/pages-${iss.id}.json`);
        d.pages.forEach((t, i) => { if (t && t.length > 40) INDEX.push({ type: 'Page', cat: 'In the magazine', sec: 'pages', title: `${iss.title} – page ${i + 1}`, text: t, href: pdfPage(iss, i + 1), external: true, sum: t.slice(0, 160) + '…', issue: iss }); });
      } catch (e) { /* no page text for this issue */ }
    }
    if ($('#overlay').classList.contains('open')) runSearch();
  }

  function setupSearch() {
    buildIndex();
    const FILTERS = [['all', 'Everything'], ['whats-on', 'What’s On'], ...SITE.sections.map(s => [s.slug, s.name]), ['pages', 'Magazine pages']];
    $('#sfilters').innerHTML = FILTERS.map(([k, n]) => `<button class="chip ${k === 'all' ? 'on' : ''}" data-f="${k}">${esc(n)}</button>`).join('');
    $('#sfilters').addEventListener('click', e => { const b = e.target.closest('[data-f]'); if (!b) return; sFilter = b.dataset.f; document.querySelectorAll('#sfilters .chip').forEach(c => c.classList.toggle('on', c === b)); runSearch(); $('#q').focus(); });
    $('#openSearch').addEventListener('click', openS);
    $('#closeSearch').addEventListener('click', closeS);
    $('#overlay').addEventListener('click', e => { if (e.target.id === 'overlay') closeS(); });
    $('#sresults').addEventListener('click', e => { if (e.target.closest('.res')) closeS(); });
    $('#q').addEventListener('input', runSearch);
    document.addEventListener('keydown', e => {
      const open = $('#overlay').classList.contains('open');
      if (!open && e.key === '/' && !/input|textarea/i.test(document.activeElement.tagName)) { e.preventDefault(); openS(); return; }
      if (!open) return;
      if (e.key === 'Escape') closeS();
      else if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(sel + 1, current.length - 1); mark(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(sel - 1, 0); mark(); }
      else if (e.key === 'Enter') { const s = document.querySelector('.res.sel'); if (s) s.click(); }
    });
  }
  function hl(text, terms) { let out = esc(text); terms.forEach(t => { if (t.length < 2) return; out = out.replace(new RegExp('(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig'), '<mark>$1</mark>'); }); return out; }
  function snippet(text, terms) {
    const n = norm(text); let i = -1; for (const t of terms) { i = n.indexOf(t); if (i > -1) break; }
    if (i < 0) return text.slice(0, 160) + '…';
    const st = Math.max(0, i - 60); return (st ? '…' : '') + text.slice(st, st + 180) + '…';
  }
  function runSearch() {
    const raw = $('#q').value.trim(); const terms = norm(raw).split(/\s+/).filter(Boolean);
    const pool = INDEX.filter(d => sFilter === 'all' || d.sec === sFilter);
    if (!terms.length) {
      current = pool.filter(d => d.type === 'Article' && d.issue === LATEST).slice(0, 8);
      if (!current.length) current = pool.slice(0, 8);
      $('#sresults').innerHTML = `<div style="padding:8px 12px;font:600 12px Inter,sans-serif;color:#6b675e;text-transform:uppercase;letter-spacing:.08em">${sFilter === 'all' ? 'In the latest issue' : 'Suggestions'}</div>` + current.map((d, i) => resHTML(d, [], i)).join('');
      sel = 0; mark(); return;
    }
    current = pool.map(d => {
      const T = norm(d.title), X = norm(d.text), C = norm(d.cat); let score = 0;
      for (const t of terms) { if (!X.includes(t) && !T.includes(t) && !C.includes(t)) return null; score += (T.includes(t) ? 5 : 0) + (C.includes(t) ? 3 : 0) + Math.min(X.split(t).length - 1, 10); }
      if (d.type === 'Article') score += 3; if (d.type === 'Page') score -= 2;
      return { ...d, score };
    }).filter(Boolean).sort((a, b) => b.score - a.score).slice(0, 40);
    $('#sresults').innerHTML = current.length ? current.map((d, i) => resHTML(d, terms, i)).join('') : `<div class="sempty">No results for “${esc(raw)}”. Try another word, or browse <a href="#archive">back issues</a>.</div>`;
    sel = 0; mark();
  }
  function resHTML(d, terms, i) {
    const body = (d.type === 'Article' || d.type === 'Page') && terms.length ? snippet(d.text, terms) : d.sum;
    const label = d.type === 'Article' ? d.cat + (d.issue !== LATEST ? ` <span class="pg">${esc(d.issue.title)}</span>` : '') : d.type === 'Event' ? 'What’s On · This month' : d.type === 'Weekly' ? 'What’s On · Every week' : 'In the magazine (opens PDF)';
    return `<a class="res" data-i="${i}" href="${d.href}"${d.external ? ' target="_blank" rel="noopener"' : ''}><span class="cat">${label}</span><b>${hl(d.title, terms)}</b><p>${hl(body, terms)}</p></a>`;
  }
  function mark() { document.querySelectorAll('.res').forEach(r => r.classList.toggle('sel', +r.dataset.i === sel)); const s = document.querySelector('.res.sel'); if (s) s.scrollIntoView({ block: 'nearest' }); }
  function openS() { $('#overlay').classList.add('open'); $('#overlay').setAttribute('aria-hidden', 'false'); $('#q').value = ''; $('#q').focus(); runSearch(); loadPages(); }
  function closeS() { $('#overlay').classList.remove('open'); $('#overlay').setAttribute('aria-hidden', 'true'); }

  load().catch(err => { $('#app').innerHTML = '<div class="wrap" style="padding:80px 24px">Sorry, the magazine could not be loaded. Please try again later.</div>'; console.error(err); });
})();
