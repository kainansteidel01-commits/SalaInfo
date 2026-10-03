'use strict';
const $ = id => document.getElementById(id);
const { today, validDate, classes } = SalaInfo;
// Only this composition point changes when shared services are implemented.
const services = SalaInfo.createCloudServices();
let rows = [], currentUser = null, busy = false;
let secretaryMode = location.hash === '#secretaria';
function setLoginMode() {
  secretaryMode = location.hash === '#secretaria';
  document.querySelector('.login-card h2').textContent = secretaryMode ? 'Acesso da secretaria' : 'Acesse sua conta';
  $('teacherAccess').hidden = !secretaryMode;
  $('secretaryAccess').hidden = secretaryMode;
}
window.addEventListener('hashchange', setLoginMode);
setLoginMode();
function renderAdmin() {
  $('adminReservations').replaceChildren();
  if (!rows.length) $('adminReservations').append(node('p', 'empty-message', 'Nenhuma reserva cadastrada.'));
  [...rows].sort((a,b) => b.date.localeCompare(a.date) || a.lesson-b.lesson).forEach(r => {
    const item = node('div', 'reservation-item', '');
    item.append(node('p','reservation-title',formatDate(r.date) + ' · ' + r.lesson + 'ª aula'), node('p','reservation-details',r.teacher + ' · ' + r.schoolClass + (r.purpose ? ' · ' + r.purpose : '')));
    const cancel = node('button','logout-button','Cancelar reserva');
    cancel.onclick = () => {
      $('cancellationDetails').textContent = r.teacher + ' · ' + formatDate(r.date) + ' · ' + r.lesson + 'ª aula · ' + r.schoolClass + '. A reserva será removida.';
      $('cancellationError').textContent = '';
      $('confirmCancellation').dataset.reservationId = r.id;
      $('cancellationDialog').showModal();
    };
    item.append(cancel); $('adminReservations').append(item);
  });
}
async function loadTeachers() {
  const user = currentUser;
  const people = await services.admin.teachers();
  if (!user || currentUser !== user) return;
  $('teacherList').replaceChildren();
  people.forEach(p => $('teacherList').append(node('p','reservation-item',p.name + ' · ' + (p.role === 'secretary' ? 'Secretaria' : 'Professor') + ' · ' + (p.active ? 'Ativo' : 'Inativo'))));
}
$('teacherForm').onsubmit = async event => {
  event.preventDefault();
  if ($('saveTeacher').disabled) return;
  $('saveTeacher').disabled = true; $('teacherMessage').textContent = '';
  try {
    const result = await services.admin.createTeacher({name:$('teacherName').value.trim(),email:$('teacherEmail').value.trim(),password:$('teacherPassword').value});
    $('teacherForm').reset(); $('teacherMessage').textContent = result.message;
    await loadTeachers();
  } catch(error) { $('teacherMessage').textContent = error.message; }
  finally { $('teacherPassword').value = ''; $('saveTeacher').disabled = false; }
};
const formatDate = value => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeZone: 'America/Sao_Paulo' }).format(new Date(value + 'T12:00:00Z'));
function shiftDate(value, amount) {
  const date = new Date(value + 'T12:00:00Z'); date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0,10);
}
function monday(value) {
  const day = new Date(value + 'T12:00:00Z').getUTCDay();
  return shiftDate(value, -(day === 0 ? 6 : day - 1));
}
let weekStart = monday(today());
function renderWeek() {
  $('weekLabel').textContent = formatDate(weekStart) + ' — ' + formatDate(shiftDate(weekStart,4));
  const table = $('weeklyTable'); table.replaceChildren();
  const head = document.createElement('thead'), header = document.createElement('tr');
  const corner = node('th','','Aula'); corner.scope = 'col'; header.append(corner);
  ['Seg','Ter','Qua','Qui','Sex'].forEach((name,i) => {
    const date = shiftDate(weekStart,i);
    const cell = node('th',date === today() ? 'today-column' : '',name + ' · ' + date.slice(8) + '/' + date.slice(5,7));
    cell.scope = 'col'; header.append(cell);
  });
  head.append(header); table.append(head);
  const body = document.createElement('tbody');
  for(let lesson=1;lesson<=5;lesson++) {
    const line = document.createElement('tr'), label = node('th','',lesson + 'ª');
    label.scope = 'row'; line.append(label);
    for(let i=0;i<5;i++) {
      const date = shiftDate(weekStart,i), r = rows.find(r=>r.date===date && r.lesson===lesson);
      const mine = r?.userId === currentUser.id, past = date < today();
      const state = r ? (mine ? 'mine' : 'reserved') : (past ? 'past' : '');
      const cell = document.createElement('td'), slot = node(!r && !past ? 'button' : 'div','week-slot ' + state,'');
      slot.append(node('strong','',r ? (mine ? 'Sua reserva' : 'Ocupada') : (past ? 'Encerrada' : 'Disponível')));
      slot.append(node('small','',r ? r.teacher + ' · ' + r.schoolClass : (past ? 'Data passada' : 'Reservar aula')));
      if(!r && !past) {
        slot.type = 'button'; slot.setAttribute('aria-label','Reservar ' + lesson + 'ª aula em ' + formatDate(date));
        slot.onclick = () => { $('viewDate').value=date; openReservation(lesson); };
      }
      cell.append(slot); line.append(cell);
    }
    body.append(line);
  }
  table.append(body);
}
$('previousWeek').onclick=()=>{ weekStart=shiftDate(weekStart,-7); renderWeek(); };
$('nextWeek').onclick=()=>{ weekStart=shiftDate(weekStart,7); renderWeek(); };
$('currentWeek').onclick=()=>{ weekStart=monday(today()); renderWeek(); };
let toastTimer;
new MutationObserver(() => {
  clearTimeout(toastTimer);
  if ($('notice').textContent) toastTimer=setTimeout(()=>{ $('notice').textContent=''; },9000);
}).observe($('notice'),{childList:true});
function node(tag, className, text) {
  const el = document.createElement(tag); el.className = className; el.textContent = text; return el;
}
function render() {
  renderWeek();
  const date = $('viewDate').value;
  const selected = rows.filter(r => r.date === date);
  const mine = rows.filter(r => r.userId === currentUser.id && r.date >= today()).sort((a,b) => a.date.localeCompare(b.date) || a.lesson - b.lesson);
  const usedToday = rows.filter(r => r.date === today()).length;
  $('availableCount').textContent = 5 - usedToday;
  $('reservedCount').textContent = usedToday;
  $('mineCount').textContent = mine.length;
  $('availabilityTitle').textContent = date === today() ? 'Disponibilidade de hoje' : 'Disponibilidade da sala';
  $('selectedDateLabel').textContent = formatDate(date);
  $('schedule').replaceChildren();
  for (let lesson = 1; lesson <= 5; lesson++) {
    const reservation = selected.find(r => r.lesson === lesson);
    const row = node('div', 'schedule-item', '');
    const info = node('div', 'lesson', '');
    info.append(node('div', 'lesson-number', lesson + 'ª'));
    const detail = node('div', 'lesson-info', '');
    detail.append(node('strong', '', lesson + 'ª aula'), node('p', '', reservation ? reservation.teacher + ' · ' + reservation.schoolClass : 'Sala de Informática'));
    info.append(detail);
    const own = reservation?.userId === currentUser.id;
    const status = node(reservation ? 'span' : 'button', 'status ' + (reservation ? (own ? 'mine' : 'reserved') : 'available'), reservation ? (own ? 'Sua reserva' : 'Reservada') : 'Disponível');
    if (!reservation) {
      status.disabled = date < today();
      status.setAttribute('aria-label', 'Reservar ' + lesson + 'ª aula');
      status.addEventListener('click', () => openReservation(lesson));
    }
    row.append(info, status); $('schedule').append(row);
  }
  $('reservationsList').replaceChildren();
  if (!mine.length) $('reservationsList').append(node('p', 'empty-message', 'Você ainda não tem reservas. Escolha uma aula para começar.'));
  mine.forEach(r => {
    const item = node('div', 'reservation-item', '');
    item.append(node('p', 'reservation-date', formatDate(r.date)), node('p', 'reservation-title', r.lesson + 'ª aula · ' + r.schoolClass), node('p', 'reservation-details', r.purpose || 'Sala de Informática'));
    const cancel = node('button', 'logout-button', 'Cancelar reserva');
    cancel.style.marginTop = '12px';
    cancel.onclick = () => {
      $('cancellationDetails').textContent = formatDate(r.date) + ' · ' + r.lesson + 'ª aula · ' + r.schoolClass + '. A aula ficará disponível novamente.';
      $('cancellationError').textContent = '';
      $('confirmCancellation').dataset.reservationId = r.id;
      $('cancellationDialog').showModal();
    };
    item.append(cancel);
    $('reservationsList').append(item);
  });
}
async function refresh() {
  const user = currentUser;
  const result = await services.reservations.list();
  if (!user || user !== currentUser) return;
  rows = result;
  $('appError').textContent = ''; render();
  if (currentUser.role === 'secretary') renderAdmin();
}
function updateLessons(preferred = '') {
  const occupied = rows.filter(r => r.date === $('reservationDate').value);
  $('lesson').replaceChildren(new Option('Selecione a aula', ''));
  for (let n = 1; n <= 5; n++) {
    const taken = occupied.some(r => r.lesson === n);
    const option = new Option(n + 'ª aula' + (taken ? ' — Reservada' : ' — Disponível'), n);
    option.disabled = taken; $('lesson').append(option);
  }
  const chosen = [...$('lesson').options].find(o => o.value === String(preferred) && !o.disabled);
  $('lesson').value = chosen ? chosen.value : '';
  $('confirmReservation').disabled = busy || occupied.length === 5;
  if (occupied.length === 5) $('reservationError').textContent = 'Todas as aulas desta data estão reservadas. Selecione outra data.';
}
async function openReservation(lesson = '') {
  try {
    await refresh();
    $('reservationForm').reset(); $('reservationError').textContent = '';
    $('reservationDate').min = today();
    $('reservationDate').value = $('viewDate').value < today() ? today() : $('viewDate').value;
    updateLessons(lesson); $('reservationDialog').showModal();
  } catch (error) { $('appError').textContent = error.message; }
}
classes.forEach(c => $('schoolClass').append(new Option(c,c)));
$('viewDate').value = today();
$('loginMessage').setAttribute('role', 'alert');
setTimeout(() => {
  $('loadingScreen').style.display = 'none'; $('loginScreen').style.display = 'flex';
  $('loginScreen').classList.add('show');
}, 700);
$('showPassword').onclick = () => {
  $('password').type = $('password').type === 'password' ? 'text' : 'password';
  $('showPassword').textContent = $('password').type === 'password' ? 'Mostrar' : 'Ocultar';
};
$('loginForm').onsubmit = async event => {
  event.preventDefault();
  try {
    currentUser = await services.auth.signIn($('username').value, $('password').value);
    if (secretaryMode && currentUser.role !== 'secretary') {
      await services.auth.signOut(); currentUser = null;
      throw new Error('Este acesso é exclusivo da secretaria. Use o acesso dos professores.');
    }
    $('secretaryPanel').hidden = currentUser.role !== 'secretary';
    if (currentUser.role === 'secretary') {
      try { await loadTeachers(); } catch(error) { $('teacherMessage').textContent = error.message; }
    }
    document.querySelector('.welcome h1').textContent = 'Olá, ' + currentUser.name + '.';
    $('profileName').textContent = currentUser.name;
    $('profileRole').textContent = currentUser.role === 'secretary' ? 'Secretaria' : 'Professor';
    $('profileInitials').textContent = currentUser.name.trim().split(/\s+/).filter(Boolean).map(n=>n[0]).filter((_,i,a)=>i===0||i===a.length-1).join('').toUpperCase();
    document.querySelector('.user-profile').setAttribute('aria-label', currentUser.name + ', ' + $('profileRole').textContent);
    document.querySelector('#reservationForm .demo-note').textContent = 'Sala de Informática · ' + currentUser.name;
    $('password').value = ''; $('password').type = 'password'; $('showPassword').textContent = 'Mostrar';
    $('loginMessage').style.display = 'none';
    $('loginScreen').style.display = 'none'; $('appScreen').style.display = 'block';
    try { await refresh(); } catch (error) { $('appError').textContent = error.message; }
  } catch (error) { $('loginMessage').style.display = 'block'; $('loginMessage').textContent = error.message; }
};
$('logoutButton').onclick = async () => {
  try { await services.auth.signOut(); }
  catch (error) { $('appError').textContent = error.message; return; }
  currentUser = null; rows = [];
  $('secretaryPanel').hidden = true; $('teacherList').replaceChildren(); $('adminReservations').replaceChildren(); $('teacherForm').reset();
  $('reservationDialog').close(); $('appScreen').style.display = 'none';
  $('cancellationDialog').close();
  $('notice').textContent = ''; $('loginScreen').style.display = 'flex'; $('password').focus();
};
$('newReservation').onclick = () => openReservation();
$('cancelReservation').onclick = () => $('reservationDialog').close();
$('keepReservation').onclick = () => $('cancellationDialog').close();
$('confirmCancellation').onclick = async () => {
  const button = $('confirmCancellation');
  if (button.disabled) return;
  button.disabled = true;
  $('cancellationError').textContent = '';
  try {
    const row = await services.reservations.cancel(button.dataset.reservationId);
    $('cancellationDialog').close();
    $('notice').textContent = 'Reserva cancelada. ' + formatDate(row.date) + ' · ' + row.lesson + 'ª aula disponível novamente.';
    await refresh();
  } catch (error) {
    if ($('cancellationDialog').open) $('cancellationError').textContent = error.message;
    else $('appError').textContent = error.message;
  } finally { button.disabled = false; }
};
$('reservationDate').onchange = async () => {
  $('reservationError').textContent = '';
  try { rows = await services.reservations.list(); updateLessons(); }
  catch (error) { $('reservationError').textContent = error.message; }
};
$('viewDate').onchange = () => {
  if (!validDate($('viewDate').value)) $('viewDate').value = today();
  refresh().catch(error => $('appError').textContent = error.message);
};
$('reservationForm').onsubmit = async event => {
  event.preventDefault(); if (busy) return;
  busy = true; $('confirmReservation').disabled = true; $('reservationError').textContent = '';
  try {
    const row = await services.reservations.create({ date: $('reservationDate').value, lesson: Number($('lesson').value), schoolClass: $('schoolClass').value, purpose: $('purpose').value });
    $('viewDate').value = row.date;
    $('reservationDialog').close();
    $('notice').textContent = 'Reserva confirmada! ' + formatDate(row.date) + ' · ' + row.lesson + 'ª aula · ' + row.schoolClass + '.';
    await refresh();
  } catch (error) {
    if ($('reservationDialog').open) {
      try { rows = await services.reservations.list(); updateLessons($('lesson').value); } catch {}
      $('reservationError').textContent = error.message;
    } else $('appError').textContent = error.message;
  } finally { busy = false; $('confirmReservation').disabled = false; }
};
document.querySelectorAll('[data-view]').forEach(button => button.onclick = () => {
  document.querySelectorAll('[data-view]').forEach(b => { b.classList.toggle('active', b.dataset.view === button.dataset.view); b.setAttribute('aria-current', b.dataset.view === button.dataset.view ? 'page' : 'false'); });
  $('weeklyPanel').hidden = button.dataset.view === 'mine';
  $('availabilityPanel').hidden = button.dataset.view === 'mine';
  $('minePanel').hidden = button.dataset.view === 'reservations';
  if (button.dataset.view === 'home') $('viewDate').value = today();
  refresh().catch(error => $('appError').textContent = error.message);
});
window.addEventListener('storage', event => {
  if (currentUser && (event.key === SalaInfo.KEY || event.key === null)) refresh().then(() => {
    if ($('reservationDialog').open) updateLessons($('lesson').value);
  }).catch(error => $('appError').textContent = error.message);
});
// Shared reservations refresh every 15 seconds while the page is visible.
let polling = false;
async function syncSharedReservations() {
  if (!currentUser || document.hidden || polling) return;
  polling = true;
  try {
    await refresh();
    if (currentUser && $('reservationDialog').open) updateLessons($('lesson').value);
  } catch (error) { if (currentUser) $('appError').textContent = error.message; }
  finally { polling = false; }
}
setInterval(syncSharedReservations, 15000);
window.addEventListener('focus', syncSharedReservations);
