'use strict';
const $ = id => document.getElementById(id);
const { today, validDate, classes } = SalaInfo;
// Only this composition point changes when shared services are implemented.
const services = SalaInfo.createServices({ getItem: key => localStorage.getItem(key), setItem: (key, value) => localStorage.setItem(key, value) }, navigator.locks);
let rows = [], currentUser = null, busy = false;
const formatDate = value => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeZone: 'America/Sao_Paulo' }).format(new Date(value + 'T12:00:00Z'));
function node(tag, className, text) {
  const el = document.createElement(tag); el.className = className; el.textContent = text; return el;
}
function render() {
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
    const status = node(reservation ? 'span' : 'button', 'status ' + (reservation ? 'reserved' : 'available'), reservation ? 'Reservada' : 'Disponível');
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
  rows = await services.reservations.list();
  $('appError').textContent = ''; render();
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
    $('password').value = ''; $('password').type = 'password'; $('showPassword').textContent = 'Mostrar';
    $('loginMessage').style.display = 'none';
    $('loginScreen').style.display = 'none'; $('appScreen').style.display = 'block';
    try { await refresh(); } catch (error) { $('appError').textContent = error.message; }
  } catch (error) { $('loginMessage').style.display = 'block'; $('loginMessage').textContent = error.message; }
};
$('logoutButton').onclick = async () => {
  await services.auth.signOut(); currentUser = null; rows = [];
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
  document.querySelectorAll('[data-view]').forEach(b => b.classList.toggle('active', b === button));
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
