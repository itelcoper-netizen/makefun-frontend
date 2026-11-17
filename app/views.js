// Views: each renders one surface to an HTML string. The router in main.js
// swaps the string into #view; nothing here touches the network or the DOM
// except the "Show more" rows, which the router appends without rebuilding.

import { bountyPhase, bountyStatus, dateTime, esc, money, num, renderMarkdown, timeLeft } from './format.js';

export function loadingHTML(label) {
  return `<div class="loading" role="status">Loading ${esc(label)}…</div>`;
}

export function errorHTML(message, retryHash) {
  return `<div class="error-box" role="alert"><strong>Could not load this page.</strong><br>${esc(message)}`
    + (retryHash ? ` <a href="${esc(retryHash)}">Try again</a>` : '') + `</div>`;
}

/** One bounty card: pot first, then fee, time left and entries. */
export function bountyCard(c, now = Date.now()) {
  const left = timeLeft(c.deadline, now);
  const phase = bountyPhase(c, now);
  const phaseChip = phase === 'open' ? ''
    : `<span class="chip ${phase === 'judging' ? 'fee' : 'time-closed'}">${phase === 'judging' ? 'Judging' : 'Done'}</span>`;
  const fee = c.entryFeeUsd === null || c.entryFeeUsd === undefined
    ? '<span class="chip fee">Free entry</span>'
    : `<span class="chip fee">Entry fee ${money(c.entryFeeUsd)}</span>`;
  return `<article class="card">
    <h2><a href="#/bounty/${esc(c.slug)}">${esc(c.title)}</a></h2>
    <div class="pot-row"><span class="pot">${money(c.potUsd)}</span><span class="pot-label">live pot</span></div>
    <div class="meta-row">
      <span class="chip ${left.open ? 'time-open' : 'time-closed'}" data-deadline="${esc(c.deadline)}">${esc(left.text)}</span>
      ${phaseChip}
      ${fee}
      <span class="chip">${esc(c.category || 'Bounty')}</span>
    </div>
    <p class="summary">${esc(c.summary || '')}</p>
    <div class="card-foot">
      <span>${num(c.submissionCount)} entries</span>
      <span>${esc(c.sponsor?.name || '')}</span>
      <a href="#/bounty/${esc(c.slug)}/leaderboard">Leaderboard →</a>
    </div>
  </article>`;
}

/** Just the board's cards, so filters can rebuild the grid without the page. */
export function boardGridHTML(items) {
  if (!items.length) return '<p class="empty">No bounties match these filters.</p>';
  return `<div class="grid" id="board-grid">${items.map((c) => bountyCard(c)).join('')}</div>`;
}

export function boardHTML({ items, state, categories, poolCount }) {
  const statusOptions = [['open', 'Open'], ['judging', 'Judging'], ['done', 'Done'], ['all', 'All statuses']]
    .map(([v, label]) => `<option value="${v}"${state.status === v ? ' selected' : ''}>${label}</option>`).join('');
  const categoryOptions = ['<option value="all">All categories</option>'].concat(
    categories.map((cat) => `<option value="${esc(cat)}"${state.category === cat ? ' selected' : ''}>${esc(cat)}</option>`),
  ).join('');
  const sortOptions = [['deadline', 'Deadline: soonest'], ['pot', 'Prize: largest'], ['entries', 'Entries: most']]
    .map(([v, label]) => `<option value="${v}"${state.sort === v ? ' selected' : ''}>${label}</option>`).join('');
  return `<div class="page-head"><h1>Live bounties</h1>
    <p>Every competition on make.fun, with its live pot, entry fee, time left and entries. Search, filter and sort — all on live data.</p></div>
  <div class="toolbar">
    <label class="visually-hidden" for="board-search">Search bounties</label>
    <input type="search" id="board-search" placeholder="Search by name or slug…" value="${esc(state.query)}" autocomplete="off">
    <label>Status <select id="filter-status">${statusOptions}</select></label>
    <label>Category <select id="filter-category">${categoryOptions}</select></label>
    <label>Sort <select id="filter-sort">${sortOptions}</select></label>
    <span class="count-note" id="board-count">${items.length} of ${poolCount} shown</span>
  </div>
  <div id="board-grid-wrap">${boardGridHTML(items)}</div>`;
}

export function bountyHTML(c, previewHTML = '', now = Date.now()) {
  const status = bountyStatus(c, now);
  const left = timeLeft(c.deadline, now);
  const fees = Number(c.potUsd || 0) - Number(c.rewardAmount || 0);
  const feeNote = fees > 0
    ? `${money(c.potUsd)} = ${money(c.rewardAmount)} reward + ${money(fees)} from ${num(c.entryFeePayers)} entry fee${c.entryFeePayers === 1 ? '' : 's'}`
    : `${money(c.potUsd)} reward`;
  const rows = (c.rewardsNow || []).map((r) => `<tr>
      <td>${num(r.place)}</td>
      <td class="num">${money(r.baseUsd)}</td>
      <td class="num">${money(r.feeShareUsd)}</td>
      <td class="num"><strong>${money(r.amountUsd)}</strong></td>
    </tr>`).join('');
  const dates = [
    ['Opened', c.opensAt || c.publishedAt],
    ['Deadline', c.deadline],
    ['Resolved', c.resolvedAt],
  ].filter(([, v]) => v).map(([k, v]) => `<tr><th scope="row">${k}</th><td>${dateTime(v)}</td></tr>`).join('');
  return `<p class="crumbs"><a href="#/">Board</a> / ${esc(c.title)}</p>
  <div class="page-head"><h1>${esc(c.title)}</h1>
    <p>${esc(c.summary || '')}</p></div>
  <div class="stat-strip">
    <div class="stat"><div class="k">Live pot</div><div class="v green">${money(c.potUsd)}</div><div class="s">${esc(feeNote)}</div></div>
    <div class="stat"><div class="k">Entry fee</div><div class="v">${c.entryFeeUsd === null || c.entryFeeUsd === undefined ? 'Free' : money(c.entryFeeUsd)}</div><div class="s">paid once per account</div></div>
    <div class="stat"><div class="k">Entries</div><div class="v">${num(c.submissionCount)}</div><div class="s">${num(c.submissionsPassed ?? c.submissionCount)} passed checks</div></div>
    <div class="stat"><div class="k">Time left</div><div class="v" data-deadline="${esc(c.deadline)}">${esc(left.text)}</div><div class="s">deadline ${dateTime(c.deadline)}</div></div>
  </div>
  <p><span class="chip ${status.cls}">${esc(status.label)}</span>
    <a class="btn ghost" href="#/bounty/${esc(c.slug)}/leaderboard">Leaderboard →</a>
    <a href="https://make.fun/bounty/${esc(c.slug)}" rel="noopener">View on make.fun ↗</a></p>
  <section class="block"><h2>Rewards — live pot</h2>
    <div class="table-wrap"><table class="data">
      <thead><tr><th>Place</th><th class="num">Base</th><th class="num">Fee share</th><th class="num">Total now</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="4">No rewards table published yet.</td></tr>'}</tbody>
    </table></div></section>
  <section class="block"><h2>About this bounty</h2><div class="md">${renderMarkdown(c.description)}</div></section>
  ${previewHTML ? `<section class="block"><h2>Leaderboard — top 5</h2>${previewHTML}<p><a href="#/bounty/${esc(c.slug)}/leaderboard">Full leaderboard →</a></p></section>` : ''}
  ${c.rules ? `<section class="block"><details class="rules"><summary>Full rules</summary><div class="md">${renderMarkdown(c.rules)}</div></details></section>` : ''}
  <section class="block"><h2>Dates</h2><table class="data"><tbody>${dates}</tbody></table></section>`;
}
