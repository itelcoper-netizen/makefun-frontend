// Public profile view. Loaded lazily with import() — only when the visitor
// opens a profile — so it never weighs down the first load.

import { dateTime, esc, initials, makefunImage, money, num, winRate } from './format.js';

export function profileHTML(p) {
  const r = p.record || {};
  const img = makefunImage(p.avatar || p.image);
  const links = [];
  if (p.github_login) links.push(`<a class="chip" href="https://github.com/${esc(p.github_login)}" rel="noopener">GitHub: ${esc(p.github_login)}</a>`);
  if (p.x) {
    const xName = typeof p.x === 'string' ? p.x : (p.x.username || p.x.handle || '');
    const xUrl = typeof p.x === 'object' && p.x.url ? p.x.url : 'https://x.com/' + encodeURIComponent(xName);
    if (xName) links.push(`<a class="chip" href="${esc(xUrl)}" rel="noopener">X: @${esc(xName)}</a>`);
  }
  if (p.discord) links.push(`<span class="chip">Discord: ${esc(typeof p.discord === 'string' ? p.discord : (p.discord.username || ''))}</span>`);
  if (p.wallet?.explorer_url) links.push(`<a class="chip" href="${esc(p.wallet.explorer_url)}" rel="noopener">Wallet ↗</a>`);
  const solutions = (p.solutions || []).map((s) => `<tr>
      <td><a href="#/bounty/${esc(s.competition?.slug || '')}">${esc(s.competition?.title || '')}</a></td>
      <td class="num">${s.placement ? '#' + num(s.placement) : '—'}</td>
      <td class="num">${s.prize_usd ? money(s.prize_usd) : '—'}</td>
      <td class="num mono">${s.score ? winRate(s.score.value) : '—'}</td>
    </tr>`).join('');
  const payouts = (p.payouts || []).map((pay) => `<tr>
      <td class="num"><strong>${money(pay.amount_usd)}</strong></td>
      <td class="num">#${num(pay.place)}</td>
      <td>${esc(pay.competition?.title || '')}</td>
      <td class="num">${dateTime(pay.paid_at)}</td>
    </tr>`).join('');
  const stats = [
    ['Entered', num(r.competitions_entered)],
    ['Won', num(r.competitions_won)],
    ['Placed', num(r.competitions_placed)],
    ['Podiums', num(r.podium_finishes)],
    ['Best place', r.best_placement ? '#' + num(r.best_placement) : '—'],
    ['Prize money', money(r.prize_usd)],
  ].map(([k, v]) => `<div class="stat"><div class="k">${k}</div><div class="v">${v}</div></div>`).join('');
  return `<p class="crumbs"><a href="#/">Board</a> / Profile</p>
  <div class="profile-head">
    ${img
      ? `<img class="avatar lg" crossorigin="anonymous" src="${esc(img)}" alt="" width="84" height="84">`
      : `<span class="avatar lg avatar-fallback" aria-hidden="true">${esc(initials(p.handle))}</span>`}
    <div>
      <h1>${esc(p.display_name || p.handle)}</h1>
      <p class="handle">@${esc(p.handle)} · joined ${dateTime(p.joined_at)}</p>
      ${p.bio ? `<p class="bio">${esc(p.bio)}</p>` : ''}
      ${links.length ? `<div class="link-row">${links.join('')}</div>` : ''}
    </div>
  </div>
  <div class="record-grid">${stats}</div>
  <section class="block"><h2>Entries (${num((p.solutions || []).length)})</h2>
    ${solutions
      ? `<div class="table-wrap"><table class="data"><thead><tr><th>Competition</th><th class="num">Place</th><th class="num">Prize</th><th class="num">Win rate</th></tr></thead><tbody>${solutions}</tbody></table></div>`
      : '<p class="empty">No public entries yet.</p>'}
  </section>
  ${payouts ? `<section class="block"><h2>Payouts</h2>
    <div class="table-wrap"><table class="data"><thead><tr><th class="num">Amount</th><th class="num">Place</th><th>Competition</th><th class="num">Paid</th></tr></thead><tbody>${payouts}</tbody></table></div></section>` : ''}`;
}
