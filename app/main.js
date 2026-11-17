// Router and boot for the lean make.fun client.
//
// Routes (hash, so every surface has its own address and works from a link):
//   #/                              the bounty board (open bounties)
//   #/all                           all bounties, open and past
//   #/bounty/<slug>                 one bounty's page (+ top-5 leaderboard)
//   #/bounty/<slug>/leaderboard     that bounty's leaderboard (?view=overall|performance)
//   #/u/<handle>                    an account's public profile
//
// The board's search, status/category filters and sort all run on the live
// data already fetched — no request per keystroke — and the filter state is
// kept in the URL (?status=&category=&sort=&q=), so a filtered board is
// shareable and survives a reload. The leaderboard and profile modules load
// with import() only when their surface opens, keeping the first load to
// index.html + style.css + main.js + api.js + format.js + views.js.
//
// window.__shotReady is false while a route loads and true once its data has
// rendered, so screenshot scripts catch rendered data, not spinners.

import { apiStats, boardAll, boardOpen, bounty, leaderboard, profile } from './api.js';
import { boardGridHTML, boardHTML, bountyHTML, errorHTML, loadingHTML } from './views.js';
import { bountyPhase, esc, timeLeft } from './format.js';

const view = document.getElementById('view');
const footStats = document.getElementById('foot-stats');

// Board data: open bounties load first; the full list loads only when a
// filter needs past bounties (status judging/done, or a category with none
// open). Either way the API answers are cached and ETag-revalidated.
let openItems = null;
let allItems = null;
let boardState = { query: '', status: 'open', category: 'all', sort: 'deadline' };
// The leaderboard's rows and its row renderer, kept so "Show more" appends
// without a refetch or a rebuild.
let lbEntries = null;
let lbRows = null;

function setReady(ready) {
  window.__shotReady = ready;
}

function showStats() {
  const s = apiStats();
  footStats.textContent = ` · ${s.networkGets} API request${s.networkGets === 1 ? '' : 's'} this session, ${s.cachedUrls} answer${s.cachedUrls === 1 ? '' : 's'} cached`;
}

function parseHash() {
  const raw = location.hash.replace(/^#/, '') || '/';
  const [path, query] = raw.split('?');
  const parts = path.split('/').filter(Boolean);
  return { parts, params: new URLSearchParams(query || '') };
}

async function route() {
  const { parts, params } = parseHash();
  setReady(false);
  document.querySelectorAll('.top-nav a').forEach((a) => {
    a.removeAttribute('aria-current');
    if ((parts.length === 0 && a.getAttribute('href') === '#/')
      || (parts[0] === 'all' && a.getAttribute('href') === '#/all')) a.setAttribute('aria-current', 'page');
  });
  try {
    if (parts.length === 0) await renderBoard(false, params);
    else if (parts[0] === 'all') await renderBoard(true, params);
    else if (parts[0] === 'bounty' && parts[1] && parts[2] === 'leaderboard') await renderLeaderboard(parts[1], params.get('view'));
    else if (parts[0] === 'bounty' && parts[1]) await renderBounty(parts[1]);
    else if (parts[0] === 'u' && parts[1]) await renderProfile(decodeURIComponent(parts[1]));
    else view.innerHTML = errorHTML('Unknown page: ' + location.hash, '#/');
  } catch (err) {
    view.innerHTML = errorHTML(err.message || String(err), '#/');
  }
  showStats();
  setReady(true);
}

// --- Board: search, filter, sort -------------------------------------------

function boardPool() {
  return allItems || openItems || [];
}

function boardCategories() {
  return [...new Set(boardPool().map((c) => c.category).filter(Boolean))].sort();
}

/** The visible bounties under the current search, filters and sort. */
function visibleBoardItems(now = Date.now()) {
  const q = boardState.query.trim().toLowerCase();
  const list = boardPool().filter((c) => {
    if (boardState.status !== 'all' && bountyPhase(c, now) !== boardState.status) return false;
    if (boardState.category !== 'all' && c.category !== boardState.category) return false;
    if (q && !(c.title + ' ' + c.slug + ' ' + (c.category || '')).toLowerCase().includes(q)) return false;
    return true;
  });
  if (boardState.sort === 'pot') list.sort((a, b) => Number(b.potUsd || 0) - Number(a.potUsd || 0));
  else if (boardState.sort === 'entries') list.sort((a, b) => (b.submissionCount || 0) - (a.submissionCount || 0));
  else list.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
  return list;
}

/** Does the current filter need past bounties, which the open-only list lacks? */
function boardNeedsAll() {
  return boardState.status !== 'open';
}

async function ensureBoardData() {
  if (boardNeedsAll() && !allItems) {
    allItems = (await boardAll()).items || [];
  } else if (!openItems && !allItems) {
    openItems = (await boardOpen()).items || [];
  }
}

function paintBoardGrid() {
  const items = visibleBoardItems();
  const wrap = document.getElementById('board-grid-wrap');
  const count = document.getElementById('board-count');
  if (wrap) wrap.innerHTML = boardGridHTML(items);
  if (count) count.textContent = `${items.length} of ${boardPool().length} shown`;
}

/** Mirror the filter state into the URL without navigating or re-rendering. */
function syncBoardHash() {
  const path = location.hash.replace(/^#/, '').split('?')[0] || '/';
  const q = new URLSearchParams();
  if (boardState.status !== 'open') q.set('status', boardState.status);
  if (boardState.category !== 'all') q.set('category', boardState.category);
  if (boardState.sort !== 'deadline') q.set('sort', boardState.sort);
  if (boardState.query) q.set('q', boardState.query);
  const hash = '#' + path + (q.toString() ? '?' + q.toString() : '');
  history.replaceState(null, '', hash);
}

async function renderBoard(all, params) {
  const status = params.get('status');
  boardState = {
    query: params.get('q') || '',
    status: ['open', 'judging', 'done', 'all'].includes(status) ? status : (all ? 'all' : 'open'),
    category: params.get('category') || 'all',
    sort: ['deadline', 'pot', 'entries'].includes(params.get('sort')) ? params.get('sort') : 'deadline',
  };
  view.innerHTML = loadingHTML(all ? 'all bounties' : 'the bounty board');
  await ensureBoardData();
  view.innerHTML = boardHTML({
    items: visibleBoardItems(),
    state: boardState,
    categories: boardCategories(),
    poolCount: boardPool().length,
  });
}

/** A filter control changed: fetch past bounties first if the filter needs them. */
async function applyBoardFilters() {
  if (boardNeedsAll() && !allItems) {
    const wrap = document.getElementById('board-grid-wrap');
    if (wrap) wrap.innerHTML = loadingHTML('past bounties');
    allItems = (await boardAll()).items || [];
    const select = document.getElementById('filter-category');
    if (select) {
      const keep = boardState.category;
      select.innerHTML = '<option value="all">All categories</option>' + boardCategories()
        .map((cat) => `<option value="${esc(cat)}"${cat === keep ? ' selected' : ''}>${esc(cat)}</option>`).join('');
    }
  }
  paintBoardGrid();
  syncBoardHash();
}

// --- Bounty, leaderboard, profile ------------------------------------------

async function renderBounty(slug) {
  view.innerHTML = loadingHTML('the bounty');
  const [c, lb] = await Promise.all([
    bounty(slug),
    leaderboard(slug).catch(() => null),
  ]);
  let preview = '';
  if (lb && (lb.entries || []).length) {
    const mod = await import('./leaderboard.js');
    preview = mod.leaderboardPreview(lb.entries);
  }
  view.innerHTML = bountyHTML(c, preview);
}

async function renderLeaderboard(slug, viewName) {
  view.innerHTML = loadingHTML('the leaderboard');
  const lb = await leaderboard(slug, viewName || undefined);
  const mod = await import('./leaderboard.js');
  lbEntries = lb.entries || [];
  lbRows = mod.leaderboardRows;
  view.innerHTML = mod.leaderboardHTML(lb, slug);
}

async function renderProfile(handle) {
  view.innerHTML = loadingHTML('the profile');
  const p = await profile(handle);
  const mod = await import('./profile.js');
  view.innerHTML = mod.profileHTML(p);
}

// --- Events ------------------------------------------------------------------

// Board search types as you type; the selects fire on change. Only the grid
// is rebuilt, never the page, and no request is made for a filter change
// (past bounties load once, the first time a filter needs them).
view.addEventListener('input', (ev) => {
  if (ev.target.id === 'board-search') {
    boardState.query = ev.target.value;
    paintBoardGrid();
    syncBoardHash();
  }
});
view.addEventListener('change', (ev) => {
  if (ev.target.id === 'filter-status') boardState.status = ev.target.value;
  else if (ev.target.id === 'filter-category') boardState.category = ev.target.value;
  else if (ev.target.id === 'filter-sort') boardState.sort = ev.target.value;
  else return;
  applyBoardFilters();
});

// "Show more" appends the next 25 leaderboard rows in place.
view.addEventListener('click', (ev) => {
  const btn = ev.target.closest('[data-action="more"]');
  if (!btn || !lbEntries || !lbRows) return;
  const shown = Number(btn.dataset.shown) || 0;
  const next = Math.min(shown + 25, lbEntries.length);
  document.getElementById('lb-body')?.insertAdjacentHTML('beforeend', lbRows(lbEntries, shown, next));
  btn.dataset.shown = String(next);
  btn.textContent = next >= lbEntries.length
    ? `All ${lbEntries.length} entries shown`
    : `Show more (${next} of ${lbEntries.length})`;
  if (next >= lbEntries.length) btn.disabled = true;
});

// The header profile search goes to that account's route.
document.getElementById('handle-search').addEventListener('submit', (ev) => {
  ev.preventDefault();
  const handle = new FormData(ev.target).get('handle').trim().replace(/^@/, '');
  if (handle) location.hash = '#/u/' + encodeURIComponent(handle);
});

// Time-left badges tick every 30 s by rewriting their text only —
// the page is never rebuilt for a countdown.
setInterval(() => {
  document.querySelectorAll('[data-deadline]').forEach((el) => {
    el.textContent = timeLeft(el.dataset.deadline).text;
  });
}, 30_000);

window.addEventListener('hashchange', () => {
  window.scrollTo(0, 0);
  route();
});

route();
