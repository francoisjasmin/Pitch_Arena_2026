/*
  PITCH ARENA — Attribution ludique des présentations, édition 2026.
  Application locale : aucune bibliothèque, aucun serveur, aucune connexion requis.
*/
'use strict';

const STORAGE_KEY = 'pitch-arena-horaire-2026-v2';
const LEGACY_STORAGE_KEY = 'pitch-arena-horaire-2026-v1';
const SLOT_DURATION_MINUTES = 25;

const TEAMS = Object.freeze([
  { id: '1010-edouardo', group: '1010', name: 'Edouardo Montgrand' },
  { id: '1010-petits', group: '1010', name: 'Petits de Montpetit' },
  { id: '1010-redbull', group: '1010', name: 'Redbull the Peach edition' },
  { id: '1010-tts', group: '1010', name: 'Text To Speech TTS' },
  { id: '1020-bmrz', group: '1020', name: 'B.M.R.Z. Incorporated' },
  { id: '1020-commit', group: '1020', name: 'Commit et Pray' },
  { id: '1020-crack', group: '1020', name: 'Le C.R.A.C.K' },
  { id: '1020-galactiques', group: '1020', name: 'Les Galactiques 3.0' },
  { id: '1020-wardogs', group: '1020', name: 'Les wardogs' },
  { id: '1020-analistas', group: '1020', name: 'Los Analistas' }
]);

/* IMPORTANT : le groupe 1020 compte SIX équipes dans la liste fournie,
   et le groupe 1010 en compte QUATRE : 10 équipes au total.
   Chaque groupe a 6 créneaux, donc 2 créneaux seront libres au total. */

const SESSIONS = Object.freeze([
  { id: 'ven-matin-1020', day: 'Vendredi 4 décembre', shortDay: 'VEN 04 DÉC', dateISO: '2026-12-04', group: '1020', start: 8 * 60 + 10 },
  { id: 'ven-midi-1010', day: 'Vendredi 4 décembre', shortDay: 'VEN 04 DÉC', dateISO: '2026-12-04', group: '1010', start: 12 * 60 + 10 },
  { id: 'lun-matin-1010', day: 'Lundi 7 décembre', shortDay: 'LUN 07 DÉC', dateISO: '2026-12-07', group: '1010', start: 8 * 60 + 10 },
  { id: 'lun-midi-1020', day: 'Lundi 7 décembre', shortDay: 'LUN 07 DÉC', dateISO: '2026-12-07', group: '1020', start: 12 * 60 + 10 }
]);

const SLOTS = Object.freeze(SESSIONS.flatMap(session =>
  Array.from({ length: 3 }, (_, index) => ({
    id: `${session.id}-${index + 1}`,
    sessionId: session.id,
    day: session.day,
    shortDay: session.shortDay,
    dateISO: session.dateISO,
    group: session.group,
    start: session.start + index * SLOT_DURATION_MINUTES,
    end: session.start + (index + 1) * SLOT_DURATION_MINUTES,
    number: index + 1
  }))
));

const $ = id => document.getElementById(id);
const byTeamId = id => TEAMS.find(team => team.id === id);
const formatTime = mins => `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
const shortDayForRoster = date => date === '2026-12-04' ? 'Ven. 4 déc.' : 'Lun. 7 déc.';
const safeNumber = value => String(value).padStart(2, '0');
const countTeams = group => TEAMS.filter(team => team.group === group).length;

let assignments = {};
let undoStacks = { '1010': [], '1020': [] };
let activeGroup = '1010';
let selectedTeamId = null;
let drawing = false;
let storageAvailable = true;
let toastTimer = 0;
let lastFocus = null;

// Ne charger que les attributions cohérentes : jamais deux plages pour une même équipe.
function cleanAssignments(candidate) {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return {};
  const result = {};
  const used = new Set();
  for (const slot of SLOTS) {
    const value = candidate[slot.id];
    if (!value || typeof value !== 'object') continue;
    if (value.type === 'free' && value.teamId === null) {
      result[slot.id] = { type: 'free', teamId: null, timestamp: value.timestamp || '' };
    } else if (['voluntary', 'draw'].includes(value.type)) {
      const team = byTeamId(value.teamId);
      if (team && team.group === slot.group && !used.has(team.id)) {
        used.add(team.id);
        result[slot.id] = { type: value.type, teamId: team.id, timestamp: value.timestamp || '' };
      }
    }
  }
  return result;
}

// Un horaire commun en mémoire, mais les actions et annulations sont isolées par groupe.
function cleanGroupUndo(raw, group) {
  if (!Array.isArray(raw)) return [];
  return raw.slice(-16).map(candidate => {
    const valid = cleanAssignments(candidate);
    return Object.fromEntries(Object.entries(valid).filter(([id]) => SLOTS.some(s => s.id === id && s.group === group)));
  });
}
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      if (saved?.version === 2) {
        assignments = cleanAssignments(saved.assignments);
        activeGroup = ['1010', '1020'].includes(saved.activeGroup) ? saved.activeGroup : '1010';
        for (const group of ['1010', '1020']) undoStacks[group] = cleanGroupUndo(saved.undoStacks?.[group], group);
        return;
      }
    }
    // Reprise en douceur des données de la première version, sans perdre l'horaire.
    const oldRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (oldRaw) {
      const old = JSON.parse(oldRaw);
      if (old?.version === 1) assignments = cleanAssignments(old.assignments);
    }
  } catch (error) {
    console.warn('Sauvegarde indisponible ou non valide :', error);
    storageAvailable = false;
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, activeGroup, assignments, undoStacks }));
    storageAvailable = true;
  } catch (error) {
    storageAvailable = false;
    console.warn('Impossible de mémoriser l’horaire localement :', error);
  }
}

function groupSlots(group = activeGroup) { return SLOTS.filter(slot => slot.group === group); }
function activeSlot(group = activeGroup) { return groupSlots(group).find(slot => !assignments[slot.id]) || null; }
function availableTeams(group = activeGroup) {
  const used = new Set(Object.values(assignments).map(value => value.teamId).filter(Boolean));
  return TEAMS.filter(team => team.group === group && !used.has(team.id));
}
function switchGroup(group) {
  if (drawing || !['1010', '1020'].includes(group) || group === activeGroup) return;
  activeGroup = group;
  selectedTeamId = null;
  saveState();
  render();
  showToast(`Groupe ${group} activé · seules ses équipes participent au tirage.`);
}
function assignmentForTeam(teamId) {
  const slot = SLOTS.find(item => assignments[item.id]?.teamId === teamId);
  return slot ? { slot, entry: assignments[slot.id] } : null;
}
function metrics(group = activeGroup) {
  const all = groupSlots(group).map(slot => assignments[slot.id]).filter(Boolean);
  return {
    placed: all.filter(entry => Boolean(entry.teamId)).length,
    free: all.filter(entry => entry.type === 'free').length,
    completed: all.length
  };
}
function renderGroupSwitcher() {
  for (const group of ['1010', '1020']) {
    const button = $(`groupSelect${group}`);
    button.setAttribute('aria-pressed', String(activeGroup === group));
    const num = countTeams(group);
    const { placed, completed } = metrics(group);
    $(`groupSummary${group}`).textContent = completed === 6
      ? `✓ Terminé · ${placed} / ${num} équipes placées`
      : `${placed} / ${num} équipes placées · ${completed} / 6 plages`;
  }
  $('groupActiveHint').textContent = `🔒 Groupe ${activeGroup} actif : uniquement ses ${countTeams(activeGroup)} équipes peuvent être tirées.`;
  document.body.dataset.activeGroup = activeGroup;
}

function showToast(message) {
  const toast = $('toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3400);
  $('screenReaderAnnounce').textContent = message;
}

function renderMetrics() {
  const { placed, free } = metrics();
  const totalTeams = countTeams(activeGroup);
  $('teamTotalMetric').textContent = safeNumber(totalTeams);
  $('assignedMetric').innerHTML = `${safeNumber(placed)} <span class="metric-denominator">/ ${safeNumber(totalTeams)}</span>`;
  $('freeMetric').innerHTML = `${safeNumber(free)} <span class="metric-denominator">/ ${safeNumber(6 - totalTeams)}</span>`;
}

function renderStage() {
  const active = activeSlot();
  const done = !active;
  const { completed, placed, free } = metrics();
  $('slotCounter').textContent = done ? '06 / 06' : `${safeNumber(groupSlots().indexOf(active) + 1)} / 06`;
  $('stageDate').textContent = done ? `TOUTES LES PLAGES DU GROUPE ${activeGroup} SONT CONFIRMÉES` : active.day.toLocaleUpperCase('fr-CA');
  $('stageTime').innerHTML = done ? 'MISSION <span>✦</span> TERMINÉE' : `${formatTime(active.start)} <span>→</span> ${formatTime(active.end)}`;
  $('stageTime').style.fontSize = done ? 'clamp(26px, 3vw, 42px)' : '';
  $('stageGroup').innerHTML = done
    ? `<span class="group-signal group-${activeGroup}"></span> GROUPE ${activeGroup} · ${placed} ÉQUIPES PLACÉES`
    : `<span class="group-signal group-${active.group}"></span> GROUPE ${active.group} <span class="stage-duration">· 25 MINUTES</span>`;
  $('stageHint').textContent = done
    ? `Les ${6 - countTeams(activeGroup)} plages restantes du groupe ${activeGroup} sont libres. Vous pouvez imprimer cet horaire.`
    : `Prochain choix : uniquement les équipes du groupe ${activeGroup}. Un volontaire ou la roulette !`;
  $('progressLabel').textContent = `${completed} / 6`;
  $('progressTrack').setAttribute('aria-valuenow', String(completed));
  $('progressFill').style.width = `${completed / 6 * 100}%`;
  $('selectionPanel').hidden = done;
  $('donePanel').hidden = !done;
  $('doneMessage').textContent = `Le groupe ${activeGroup} a terminé : ${placed} équipes placées, ${free} plage${free > 1 ? 's' : ''} libre${free > 1 ? 's' : ''}. Vous pouvez imprimer uniquement ce groupe.`;
  const live = document.querySelector('.live-badge');
  live.innerHTML = done ? '✓ GROUPE TERMINÉ' : '<span></span> EN DIRECT';
}

function renderTeamChoices() {
  const slot = activeSlot();
  const list = $('teamChoices');
  list.replaceChildren();
  if (!slot) return;
  const teams = availableTeams(slot.group);
  if (!teams.some(team => team.id === selectedTeamId)) selectedTeamId = null;
  $('availableCount').textContent = `${teams.length} DISPONIBLE${teams.length > 1 ? 'S' : ''}`;
  teams.forEach((team, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'team-button';
    button.setAttribute('aria-pressed', String(selectedTeamId === team.id));
    button.setAttribute('aria-label', `Choisir l'équipe ${team.name}`);
    const number = document.createElement('span');
    number.className = 'team-number';
    number.textContent = safeNumber(index + 1);
    const name = document.createElement('span');
    name.className = 'team-title';
    name.textContent = team.name;
    const check = document.createElement('span');
    check.className = 'team-check';
    check.setAttribute('aria-hidden', 'true');
    check.textContent = '✓';
    button.append(number, name, check);
    button.addEventListener('click', () => {
      if (drawing) return;
      selectedTeamId = selectedTeamId === team.id ? null : team.id;
      renderTeamChoices();
      // Conserve le focus sur le bouton correspondant après le rerendu.
      const newIndex = availableTeams(slot.group).findIndex(item => item.id === team.id);
      list.children[newIndex]?.focus({ preventScroll: true });
    });
    list.append(button);
  });
  $('confirmVolunteer').disabled = !selectedTeamId || drawing;
  $('drawBtn').disabled = teams.length === 0 || drawing;
}

function renderSchedule() {
  const active = activeSlot();
  const grid = $('scheduleGrid');
  grid.replaceChildren();
  for (const session of SESSIONS.filter(item => item.group === activeGroup)) {
    const section = document.createElement('section');
    section.className = 'session';
    if (active?.sessionId === session.id) section.classList.add('is-active');
    const heading = document.createElement('div');
    heading.className = 'session-head';
    heading.innerHTML = `<div><div class="session-day">${session.shortDay}</div><div class="session-start">${formatTime(session.start)}</div></div><span class="group-chip g${session.group}">GROUPE ${session.group}</span>`;
    section.append(heading);
    const slotsNode = document.createElement('div');
    slotsNode.className = 'session-slots';
    const scoped = SLOTS.filter(slot => slot.sessionId === session.id);
    for (const slot of scoped) {
      const entry = assignments[slot.id];
      const isCurrent = active?.id === slot.id;
      const state = entry?.type === 'free' ? 'free' : entry?.teamId ? 'taken' : isCurrent ? 'current' : 'waiting';
      const node = document.createElement('div');
      node.className = `schedule-slot status-${state}`;
      const indicator = document.createElement('span');
      indicator.className = 'slot-indicator';
      indicator.textContent = state === 'taken' ? '✓' : state === 'free' ? '—' : slot.number;
      const detail = document.createElement('div');
      detail.className = 'slot-detail';
      const time = document.createElement('div');
      time.className = 'slot-time';
      time.textContent = `${formatTime(slot.start)} – ${formatTime(slot.end)}`;
      const team = document.createElement('div');
      team.className = 'slot-team';
      if (state === 'taken') {
        team.textContent = byTeamId(entry.teamId).name;
        const method = document.createElement('small');
        method.className = 'slot-method';
        method.textContent = entry.type === 'draw' ? '✺ Tirage au sort' : '✓ Volontaire';
        detail.append(time, team, method);
      } else {
        team.textContent = state === 'free' ? 'Plage libre · équipes déjà placées' : isCurrent ? '✦ C’EST LE MOMENT !' : 'En attente d’attribution';
        detail.append(time, team);
      }
      node.append(indicator, detail);
      slotsNode.append(node);
    }
    section.append(slotsNode);
    grid.append(section);
  }
}

function renderRoster() {
  const grid = $('rosterGrid');
  grid.replaceChildren();
  for (const group of [activeGroup]) {
    const teams = TEAMS.filter(team => team.group === group);
    const placed = teams.filter(team => Boolean(assignmentForTeam(team.id))).length;
    const section = document.createElement('section');
    section.className = 'roster-card';
    const top = document.createElement('div');
    top.className = 'roster-top';
    top.innerHTML = `<h3>Groupe ${group}</h3><span class="roster-amount">${placed} / ${teams.length} placées</span>`;
    const meter = document.createElement('div');
    meter.className = 'roster-meter';
    const fill = document.createElement('div');
    fill.style.width = `${100 * placed / teams.length}%`;
    meter.append(fill);
    section.append(top, meter);
    for (const team of teams) {
      const current = assignmentForTeam(team.id);
      const row = document.createElement('div');
      row.className = 'roster-team';
      if (current) row.classList.add('is-placed');
      const avatar = document.createElement('span');
      avatar.className = 'roster-avatar';
      avatar.textContent = team.name.slice(0, 1).toUpperCase();
      const names = document.createElement('div');
      names.className = 'roster-team-name';
      names.textContent = team.name;
      const subline = document.createElement('small');
      subline.textContent = current ? `${shortDayForRoster(current.slot.dateISO)} · ${formatTime(current.slot.start)}` : 'En attente de sa plage';
      names.append(subline);
      const status = document.createElement('span');
      status.className = 'roster-status';
      status.textContent = current ? (current.entry.type === 'draw' ? '✺ TIRÉE' : '✓ VOLONTAIRE') : '○ EN ATTENTE';
      row.append(avatar, names, status);
      section.append(row);
    }
    grid.append(section);
    const illustration = document.createElement('aside');
    illustration.className = 'roster-illustration';
    illustration.innerHTML = `<img src="images/scene-pitch.svg" alt=""><div><strong>Un tirage juste, par groupe.</strong><p>Seules les équipes du groupe ${group} apparaissent ici. Chaque équipe est attribuée une seule fois, sans mélange entre les classes.</p></div>`;
    grid.append(illustration);
  }
}

function render() {
  renderGroupSwitcher();
  renderMetrics();
  renderStage();
  renderTeamChoices();
  renderSchedule();
  renderRoster();
  renderPrintSheet();
  $('undoBtn').disabled = undoStacks[activeGroup].length === 0 || drawing;
  $('printBtn').textContent = `🖨 Imprimer le groupe ${activeGroup}`;
  document.querySelector('.schedule-note').textContent = `2 COURS · GROUPE ${activeGroup}`;
  if (!storageAvailable) {
    document.querySelector('.tools-panel > div:first-child span').textContent = 'La mémorisation est désactivée dans ce navigateur. Exportez le CSV pour conserver les résultats.';
  } else {
    document.querySelector('.tools-panel > div:first-child span').textContent = 'Les choix sont mémorisés automatiquement dans ce navigateur.';
  }
}

function commitAssignment(slot, team, type) {
  if (!slot || !team || !['voluntary', 'draw'].includes(type)) return false;
  const stillActive = activeSlot(slot.group);
  if (!stillActive || stillActive.id !== slot.id || slot.group !== activeGroup || !availableTeams(slot.group).some(item => item.id === team.id)) return false;
  undoStacks[activeGroup].push(Object.fromEntries(Object.entries(assignments).filter(([id]) => groupSlots().some(s => s.id === id))));
  if (undoStacks[activeGroup].length > 16) undoStacks[activeGroup].shift();
  assignments[slot.id] = { type, teamId: team.id, timestamp: new Date().toISOString() };

  // Lorsqu'il n'y a plus d'équipe disponible pour la prochaine plage,
  // celle-ci est identifiée « Libre » sans refaire passer une équipe.
  let next = activeSlot(slot.group);
  while (next && availableTeams(slot.group).length === 0) {
    assignments[next.id] = { type: 'free', teamId: null, timestamp: new Date().toISOString() };
    next = activeSlot(slot.group);
  }
  selectedTeamId = null;
  saveState();
  render();
  return true;
}

function confirmVolunteer() {
  if (drawing) return;
  const slot = activeSlot();
  const team = byTeamId(selectedTeamId);
  if (commitAssignment(slot, team, 'voluntary')) {
    celebrate(18);
    showToast(`✓ ${team.name} — plage de ${formatTime(slot.start)} confirmée !`);
  }
}

// Sélection uniforme parmi les équipes admissibles. Utilise le générateur
// cryptographique du navigateur quand il est disponible.
function randomIndex(length) {
  if (length < 2) return 0;
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const values = new Uint32Array(1);
    const total = 0x100000000;
    const max = Math.floor(total / length) * length;
    do { crypto.getRandomValues(values); } while (values[0] >= max);
    return values[0] % length;
  }
  return Math.floor(Math.random() * length);
}

function startRaffle() {
  if (drawing || !activeSlot()) return;
  const slot = activeSlot();
  const candidates = availableTeams(slot.group);
  if (!candidates.length) return;
  const winner = candidates[randomIndex(candidates.length)];
  drawing = true;
  selectedTeamId = null;
  renderTeamChoices();
  $('undoBtn').disabled = true;
  lastFocus = document.activeElement;
  $('raffleModal').hidden = false;
  $('raffleModal').setAttribute('aria-hidden', 'false');
  $('raffleTitle').textContent = 'Que le sort décide !';
  $('raffleDescription').textContent = `Groupe ${slot.group} · ${formatTime(slot.start)} · ${candidates.length} équipe${candidates.length > 1 ? 's' : ''} dans la roulette`;
  $('rouletteMachine').classList.remove('is-winner');
  $('rouletteName').textContent = '???';
  $('rouletteLabel').textContent = 'LA ROULETTE TOURNE…';
  $('raffleResult').hidden = true;
  $('closeRaffleBtn').hidden = true;
  $('raffleTitle').setAttribute('tabindex', '-1');
  $('raffleTitle').focus();

  // Oscillation avec ralentissement : accélère la tension avant la révélation.
  let step = 0;
  const steps = 22;
  function spin() {
    if (step < steps) {
      $('rouletteName').textContent = candidates[randomIndex(candidates.length)].name;
      step += 1;
      const fraction = step / steps;
      const delay = 56 + Math.round(Math.pow(fraction, 3.4) * 240);
      setTimeout(spin, delay);
      return;
    }
    $('rouletteName').textContent = winner.name;
    $('rouletteMachine').classList.add('is-winner');
    $('rouletteLabel').textContent = 'LE DESTIN A PARLÉ !';
    $('raffleTitle').textContent = 'Équipe sélectionnée !';
    $('raffleResultDescription').textContent = `Le groupe ${slot.group} présentera à ${formatTime(slot.start)} – ${formatTime(slot.end)}.`;
    $('raffleResult').hidden = false;
    const success = commitAssignment(slot, winner, 'draw');
    drawing = false;
    render();
    if (success) {
      celebrate(65);
      $('closeRaffleBtn').hidden = false;
      $('closeRaffleBtn').focus();
      $('screenReaderAnnounce').textContent = `Tirage terminé : ${winner.name}, groupe ${slot.group}, plage de ${formatTime(slot.start)}.`;
    } else {
      hideRaffle();
      showToast('Le tirage a été interrompu. Relancez-le.');
    }
  }
  setTimeout(spin, 260);
}

function hideRaffle() {
  if (drawing) return;
  $('raffleModal').hidden = true;
  $('raffleModal').setAttribute('aria-hidden', 'true');
  if (activeSlot()) $('drawBtn').focus();
  else $('doneExportBtn').focus();
}

function undoLast() {
  const stack = undoStacks[activeGroup];
  if (!stack.length || drawing) return;
  const restored = cleanAssignments(stack.pop());
  for (const slot of groupSlots()) delete assignments[slot.id];
  Object.assign(assignments, restored);
  selectedTeamId = null;
  saveState();
  render();
  showToast(`↶ Dernière attribution du groupe ${activeGroup} annulée.`);
}

function exportCSV() {
  const rows = [
    ['Date', 'Jour', 'Cours', 'Groupe', 'Début', 'Fin', 'Équipe', 'Attribution']
  ];
  for (const slot of groupSlots()) {
    const entry = assignments[slot.id];
    const team = entry?.teamId ? byTeamId(entry.teamId) : null;
    const course = slot.start < 12 * 60 ? 'Matin — 8 h 10' : 'Après-midi — 12 h 10';
    const status = !entry ? 'À attribuer' : entry.type === 'free' ? 'Libre (aucune équipe restante)' : entry.type === 'draw' ? 'Tirage au sort' : 'Volontaire';
    rows.push([slot.dateISO, slot.day, course, slot.group, formatTime(slot.start), formatTime(slot.end), team?.name || '', status]);
  }
  const quote = field => `"${String(field).replaceAll('"', '""')}"`;
  const content = '\uFEFF' + rows.map(row => row.map(quote).join(';')).join('\r\n');
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Pitch_Arena_Horaire_Groupe_${activeGroup}_2026.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast(`↓ CSV du groupe ${activeGroup} prêt pour Excel ou Google Sheets.`);
}

function celebrate(amount) {
  const colors = ['#7ff5d5', '#a98bff', '#ffd17e', '#72a6ff', '#ff9bb5'];
  for (let i = 0; i < amount; i++) {
    const piece = document.createElement('span');
    piece.className = 'confetti';
    piece.style.backgroundColor = colors[randomIndex(colors.length)];
    piece.style.setProperty('--start-x', `${Math.random() * 100}vw`);
    piece.style.setProperty('--drift', `${Math.random() * 220 - 110}px`);
    piece.style.setProperty('--rotation', `${Math.random() * 360}deg`);
    piece.style.setProperty('--duration', `${1.7 + Math.random() * 1.5}s`);
    document.body.append(piece);
    setTimeout(() => piece.remove(), 3400);
  }
}

function openReset() {
  if (drawing) return;
  lastFocus = document.activeElement;
  $('confirmTitle').textContent = `Réinitialiser le groupe ${activeGroup} ?`;
  $('resetDescription').textContent = `Seules les attributions du groupe ${activeGroup} seront effacées. L’autre groupe restera intact. Cette action est irréversible.`;
  $('confirmModal').hidden = false;
  $('confirmModal').setAttribute('aria-hidden', 'false');
  $('cancelResetBtn').focus();
}
function closeReset() {
  $('confirmModal').hidden = true;
  $('confirmModal').setAttribute('aria-hidden', 'true');
  (lastFocus || $('resetBtn')).focus();
}
function resetSchedule() {
  closeReset();
  for (const slot of groupSlots()) delete assignments[slot.id];
  undoStacks[activeGroup] = [];
  selectedTeamId = null;
  saveState();
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  showToast(`↺ Groupe ${activeGroup} réinitialisé, l'autre groupe a été conservé.`);
}

// La feuille d'impression est entièrement distincte de l'écran interactif.
function renderPrintSheet() {
  $('printHeading').textContent = `Horaire des présentations — Groupe ${activeGroup}`;
  const { placed, free } = metrics();
  $('printSubtitle').textContent = `${placed} / ${countTeams(activeGroup)} équipes attribuées · ${free} plage${free > 1 ? 's' : ''} libre${free > 1 ? 's' : ''} · 2 cours · 6 plages de 25 min`;
  const root = $('printContent');
  root.replaceChildren();
  for (const session of SESSIONS.filter(item => item.group === activeGroup)) {
    const block = document.createElement('section');
    block.className = 'print-session';
    const heading = document.createElement('h2');
    heading.textContent = `${session.day} · ${formatTime(session.start)}`;
    block.append(heading);
    const table = document.createElement('table');
    table.className = 'print-table';
    const thead = document.createElement('thead');
    const hr = document.createElement('tr');
    for (const label of ['Plage horaire', 'Équipe', 'Attribution']) {
      const th = document.createElement('th'); th.textContent = label; hr.append(th);
    }
    thead.append(hr); table.append(thead);
    const tbody = document.createElement('tbody');
    for (const slot of SLOTS.filter(s => s.sessionId === session.id)) {
      const tr = document.createElement('tr');
      const entry = assignments[slot.id];
      const team = entry?.teamId ? byTeamId(entry.teamId) : null;
      const values = [
        `${formatTime(slot.start)} – ${formatTime(slot.end)}`,
        team?.name || (entry?.type === 'free' ? '— Plage libre —' : '— À attribuer —'),
        entry?.type === 'draw' ? 'Tirage au sort' : entry?.type === 'voluntary' ? 'Volontaire' : entry?.type === 'free' ? 'Libre' : 'À venir'
      ];
      for (const value of values) { const td = document.createElement('td'); td.textContent = value; tr.append(td); }
      tbody.append(tr);
    }
    table.append(tbody); block.append(table); root.append(block);
  }
}
function printGroup() {
  if (drawing) return;
  renderPrintSheet();
  window.print();
}

async function toggleProjection() {
  if (document.fullscreenElement) {
    try { await document.exitFullscreen(); } catch (error) { console.warn(error); }
    document.body.classList.remove('projection-mode');
  } else if (document.body.classList.contains('projection-mode')) {
    document.body.classList.remove('projection-mode');
  } else {
    document.body.classList.add('projection-mode');
    if (document.documentElement.requestFullscreen) {
      try { await document.documentElement.requestFullscreen(); } catch (error) {
        // Le mode projection CSS reste actif même si le plein écran est bloqué.
        console.info('Plein écran non disponible : mode de projection compact activé.');
      }
    }
  }
  $('projectionBtn').setAttribute('aria-pressed', String(document.body.classList.contains('projection-mode')));
}

function init() {
  loadState();
  saveState(); // Enregistre également les données éventuellement récupérées de l'ancienne version.
  render();
  for (const group of ['1010', '1020']) $(`groupSelect${group}`).addEventListener('click', () => switchGroup(group));
  $('confirmVolunteer').addEventListener('click', confirmVolunteer);
  $('drawBtn').addEventListener('click', startRaffle);
  $('closeRaffleBtn').addEventListener('click', hideRaffle);
  $('undoBtn').addEventListener('click', undoLast);
  $('exportBtn').addEventListener('click', exportCSV);
  $('doneExportBtn').addEventListener('click', exportCSV);
  $('donePrintBtn').addEventListener('click', printGroup);
  $('printBtn').addEventListener('click', printGroup);
  $('resetBtn').addEventListener('click', openReset);
  $('cancelResetBtn').addEventListener('click', closeReset);
  $('acceptResetBtn').addEventListener('click', resetSchedule);
  $('projectionBtn').addEventListener('click', toggleProjection);
  window.addEventListener('beforeprint', renderPrintSheet);
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) document.body.classList.remove('projection-mode');
    $('projectionBtn').setAttribute('aria-pressed', String(document.body.classList.contains('projection-mode')));
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    if (!$('confirmModal').hidden) closeReset();
    else if (!$('raffleModal').hidden && !drawing) hideRaffle();
  });
  $('confirmModal').addEventListener('click', event => {
    if (event.target === $('confirmModal')) closeReset();
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
