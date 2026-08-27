const SUPABASE_URL = "https://mejymryskgxhsojescxf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1lanltcnlza2d4aHNvamVzY3hmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0ODY2OTcsImV4cCI6MjEwMjA2MjY5N30.rBggWuPcL5155_MnrnVG9Gk0BnzA6R89l-4sXeGxvqM";

/* ★★★ EmailJS — remplace par tes vrais identifiants ★★★ */
const EMAILJS_PUBLIC_KEY = "N3e331Qf_9wb8UEtE";
const EMAILJS_SERVICE_ID = "service_ehfhwi8";
const EMAILJS_TEMPLATE_CONFIRM = "template_r3jmb3f";
const EMAILJS_TEMPLATE_DECLINE = "template_4y1bw8a";

emailjs.init(EMAILJS_PUBLIC_KEY);

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const loginView = document.getElementById('login-view');
const dashView = document.getElementById('dash-view');
const reqList = document.getElementById('req-list');
const loginErr = document.getElementById('login-err');

let allReservations = [];
let currentTab = 'pending';

/* ---------- Popups stylées ---------- */
function customAlert(message){
  return new Promise(resolve=>{
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(20,15,10,.5);display:flex;align-items:center;justify-content:center;z-index:9999;padding:20px';
    overlay.innerHTML = `<div style="background:#f5f0e7;border-radius:14px;padding:30px 28px;max-width:360px;width:100%;text-align:center;border:1px solid #ddd;box-shadow:0 20px 50px rgba(0,0,0,.25);font-family:'DM Sans',sans-serif">
      <p style="font-family:'Playfair Display',serif;font-size:17px;margin-bottom:22px;color:#222;line-height:1.4">${message}</p>
      <button id="ca-ok" style="padding:11px 24px;border-radius:7px;font-size:11.5px;letter-spacing:.06em;cursor:pointer;border:1px solid #111;background:#111;color:#f5f0e7">OK</button>
    </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('#ca-ok').onclick = ()=>{ overlay.remove(); resolve(); };
  });
}
function customConfirm(message){
  return new Promise(resolve=>{
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(20,15,10,.55);display:flex;align-items:center;justify-content:center;z-index:9999;padding:20px';
    overlay.innerHTML = `<div style="background:#f5f0e7;border-radius:14px;padding:30px 28px;max-width:400px;width:100%;text-align:center;border:1px solid #ddd;box-shadow:0 20px 50px rgba(0,0,0,.25);font-family:'DM Sans',sans-serif">
      <p style="font-family:'Playfair Display',serif;font-size:17px;margin-bottom:24px;color:#222;line-height:1.5;white-space:pre-line">${message}</p>
      <div style="display:flex;gap:10px">
        <button id="cc-cancel" style="flex:1;padding:12px 16px;border-radius:7px;font-size:11.5px;letter-spacing:.06em;cursor:pointer;border:1px solid #111;background:transparent;color:#111">ANNULER</button>
        <button id="cc-ok" style="flex:1;padding:12px 16px;border-radius:7px;font-size:11.5px;letter-spacing:.06em;cursor:pointer;border:1px solid #111;background:#111;color:#f5f0e7">JE CONFIRME</button>
      </div>
    </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('#cc-cancel').onclick = ()=>{ overlay.remove(); resolve(false); };
    overlay.querySelector('#cc-ok').onclick = ()=>{ overlay.remove(); resolve(true); };
  });
}

async function adminLogin(){
  loginErr.textContent = "";
  const email = document.getElementById('admin-email').value.trim();
  const password = document.getElementById('admin-pass').value;
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if(error){ loginErr.textContent = "Identifiants incorrects."; return; }
  showDashboard();
}
async function adminLogout(){
  await sb.auth.signOut();
  dashView.style.display = 'none';
  loginView.style.display = 'block';
}

async function showDashboard(){
  loginView.style.display = 'none';
  dashView.style.display = 'block';
  await loadRequests();
}

/* ---------- Navigation entre vues principales ---------- */
function switchMainView(view){
  document.querySelectorAll('.main-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  document.getElementById('reservations-view').style.display = view === 'reservations' ? 'block' : 'none';
  document.getElementById('planning-view').style.display = view === 'planning' ? 'block' : 'none';
  if(view === 'planning'){
    loadPlanning();
  }
}

function switchTab(status){
  currentTab = status;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.status === status));
  renderList();
}

async function loadRequests(){
  const { data, error } = await sb.from('reservations').select('*').order('created_at', { ascending:false });
  if(error){ reqList.innerHTML = `<p class="empty-state">Erreur de chargement.</p>`; return; }
  allReservations = data || [];
  updateCounts();
  renderList();
}

function updateCounts(){
  ['pending','confirmed','declined'].forEach(s=>{
    const el = document.getElementById('count-'+s);
    if(el) el.textContent = '(' + allReservations.filter(r => (r.status||'pending') === s).length + ')';
  });
}

function fmtEuro(v){
  if(v === null || v === undefined || v === '') return '—';
  return String(v).includes('€') ? v : v + '€';
}

function renderList(){
  const filtered = allReservations.filter(r => (r.status || 'pending') === currentTab);

  if(!filtered.length){
    reqList.innerHTML = `<p class="empty-state">Aucune demande dans cette catégorie.</p>`;
    return;
  }

  reqList.innerHTML = filtered.map(r => {
    let captureLink = '';
    if(r.capture_paiement){
      const { data: urlData } = sb.storage.from('captures-paiement').getPublicUrl(r.capture_paiement);
      captureLink = `<p class="req-row"><a href="${urlData.publicUrl}" target="_blank" style="text-decoration:underline">📎 Voir la capture de paiement</a></p>`;
    }
    let etatLink = '';
    if(r.photo_etat_perruque){
      const { data: urlData2 } = sb.storage.from('etat-perruque').getPublicUrl(r.photo_etat_perruque);
      etatLink = `<p class="req-row"><a href="${urlData2.publicUrl}" target="_blank" style="text-decoration:underline">💇 Voir l'état de la perruque</a></p>`;
    }
    return `
    <div class="req-card">
      <div class="req-info">
        <p class="rname">${r.nom || '—'}, ${r.prestation || '—'} <span class="req-badge ${r.status||'pending'}">${(r.status||'pending').toUpperCase()}</span></p>
        <p class="req-row"><b>Date :</b> ${r.date_rdv || '—'}</p>
        <p class="req-row"><b>Heure :</b> ${r.heure_rdv || 'Dépôt (pas d\'heure)'}</p>
        <p class="req-row"><b>Prix :</b> ${fmtEuro(r.service_price)} &nbsp; <b>Acompte :</b> ${fmtEuro(r.acompte)}${r.supplement_total ? ` &nbsp; <b>Suppléments :</b> +${r.supplement_total}€` : ''}</p>
        <p class="req-row"><b>Email :</b> ${r.email || '—'}</p>
        <p class="req-row"><b>Téléphone :</b> ${r.telephone || '—'} &nbsp; <b>Instagram :</b> ${r.instagram || '—'}</p>
        ${r.note ? `<p class="req-row"><b>Note :</b> ${r.note}</p>` : ''}
        ${captureLink}
        ${etatLink}
      </div>
      <div class="req-actions">
        ${r.status === 'pending' || !r.status ? `
          <button class="btn-accept" onclick="respond('${r.id}','confirmed')">ACCEPTER</button>
          <button class="btn-decline" onclick="respond('${r.id}','declined')">REFUSER</button>` : ''}
        <button class="btn-delete" onclick="removeReservation('${r.id}')">SUPPRIMER</button>
      </div>
    </div>
  `;
  }).join('');
}

/* ---------- Bloc d'instructions perruque (vide si non concerné) ---------- */
function construireInstructionsPP(r){
  const estPerruque = r.prestation && (
    r.prestation.toLowerCase().includes('pose') ||
    r.prestation.toLowerCase().includes('perruque') ||
    r.prestation.toLowerCase().includes('custom') ||
    r.prestation.toLowerCase().includes('lace') ||
    r.prestation.toLowerCase().includes('wig')
  );
  if(!estPerruque) return '';

  const avecRepose = r.note && r.note.toLowerCase().includes('avec repose');

  let txt = `\nImportant avant ton rendez-vous perruque :\n`;
  txt += `• Ta perruque doit être propre et déposée avant le rendez-vous (délai selon la prestation, en général 2 à 6 jours avant).\n`;
  txt += avecRepose
    ? `• Ta réservation inclut l'option "avec repose".\n`
    : `• Si ta perruque a déjà été posée avant, il s'agit d'une "repose" — préviens-nous si c'est le cas, un supplément peut s'appliquer.\n`;
  txt += `• Un dépôt la veille du rendez-vous entraîne un supplément de 10€, une customisation demandée le jour même entraîne un supplément de 15€.\n`;
  txt += `• Merci d'avoir joint une photo de l'état actuel de ta perruque — si ce n'est pas encore fait, envoie-la nous sur Instagram avant le rendez-vous.\n`;

  return txt;
}

async function envoyerEmail(r, status){
  if(status === 'confirmed'){
    return emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_CONFIRM, {
      nom: r.nom || '',
      prestation: r.prestation || '',
      date_rdv: r.date_rdv || '',
      heure_rdv: r.heure_rdv || (r.duree_minutes === null ? "dépôt, pas d'heure" : ''),
      instructions_pp: construireInstructionsPP(r),
      to_email: r.email
    });
  } else {
    return emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_DECLINE, {
      nom: r.nom || '',
      prestation: r.prestation || '',
      date_rdv: r.date_rdv || '',
      heure_rdv: r.heure_rdv || '',
      to_email: r.email
    });
  }
}

async function respond(id, status){
  const { error } = await sb.from('reservations').update({ status }).eq('id', id);
  if(error){ await customAlert("Erreur lors de la mise à jour."); return; }

  const r = allReservations.find(x => String(x.id) === String(id));
  let emailOk = false;
  if(r){
    try{
      await envoyerEmail(r, status);
      emailOk = true;
    }catch(e){
      console.error("Email non envoyé :", e);
      await customAlert("Statut mis à jour, mais l'e-mail n'a pas pu être envoyé — vérifie tes identifiants EmailJS.");
    }
  }

  await loadRequests();

  if(emailOk){
    const label = status === 'confirmed' ? 'acceptée' : 'refusée';
    await customAlert(`Demande ${label} ✓ — l'e-mail a bien été envoyé à la cliente.`);
  }
}

async function removeReservation(id){
  const ok = await customConfirm("Supprimer définitivement cette demande ?");
  if(!ok) return;
  const { error } = await sb.from('reservations').delete().eq('id', id);
  if(error){ await customAlert("Erreur lors de la suppression."); return; }
  await loadRequests();
  await customAlert("Demande supprimée ✓");
}

/* ============================================================
   GESTION DU PLANNING
   ============================================================ */

const JOURS_SEMAINE = [
  { key: 'lundi',    label: 'Lundi' },
  { key: 'mardi',    label: 'Mardi' },
  { key: 'mercredi', label: 'Mercredi' },
  { key: 'jeudi',    label: 'Jeudi' },
  { key: 'vendredi', label: 'Vendredi' },
  { key: 'samedi',   label: 'Samedi' },
  { key: 'dimanche', label: 'Dimanche' }
];

let planningCharge = false;
let horairesActuels = {};
let exceptionsActuelles = [];

async function loadPlanning(){
  if(!planningCharge){
    await loadHoraires();
    await loadExceptions();
    planningCharge = true;
  }
}

async function loadHoraires(){
  const { data, error } = await sb.from('planning_config').select('*').eq('id', 1).maybeSingle();
  if(error || !data){
    await customAlert("Impossible de charger les horaires. Vérifie que la table planning_config existe.");
    return;
  }
  horairesActuels = data.jours || {};
  renderJoursList();
}

function renderJoursList(){
  const el = document.getElementById('jours-list');
  el.innerHTML = JOURS_SEMAINE.map(j => {
    const cfg = horairesActuels[j.key] || { ouvert:false };
    const debut = cfg.debut || '09:00';
    const fin = cfg.fin || '18:00';
    return `
    <div class="jour-row" data-jour="${j.key}">
      <div class="jour-nom">${j.label}</div>
      <label class="jour-toggle">
        <input type="checkbox" class="jour-ouvert-check" ${cfg.ouvert ? 'checked' : ''} onchange="toggleJourOuvert('${j.key}', this.checked)">
        Ouvert
      </label>
      <div class="jour-heures" id="heures-${j.key}" style="${cfg.ouvert ? '' : 'display:none'}">
        <input type="time" id="debut-${j.key}" value="${debut}">
        <span>à</span>
        <input type="time" id="fin-${j.key}" value="${fin}">
      </div>
      <span class="jour-ferme-label" id="ferme-${j.key}" style="${cfg.ouvert ? 'display:none' : ''}">Fermé</span>
    </div>`;
  }).join('');
}

function toggleJourOuvert(jourKey, ouvert){
  document.getElementById('heures-'+jourKey).style.display = ouvert ? 'flex' : 'none';
  document.getElementById('ferme-'+jourKey).style.display = ouvert ? 'none' : 'inline';
}

async function saveHoraires(){
  const nouveauxJours = {};
  JOURS_SEMAINE.forEach(j => {
    const ouvert = document.querySelector(`#jours-list [data-jour="${j.key}"] .jour-ouvert-check`).checked;
    if(ouvert){
      nouveauxJours[j.key] = {
        ouvert: true,
        debut: document.getElementById('debut-'+j.key).value || '09:00',
        fin: document.getElementById('fin-'+j.key).value || '18:00'
      };
    } else {
      nouveauxJours[j.key] = { ouvert: false };
    }
  });

  const { error } = await sb.from('planning_config')
    .update({ jours: nouveauxJours, updated_at: new Date().toISOString() })
    .eq('id', 1);

  if(error){ await customAlert("Erreur lors de l'enregistrement des horaires."); return; }
  horairesActuels = nouveauxJours;
  await customAlert("Horaires enregistrés ✓");
}

function toggleBlocHeures(){
  const journeeEntiere = document.getElementById('bloc-journee').checked;
  document.getElementById('bloc-heures').style.display = journeeEntiere ? 'none' : 'flex';
}

async function loadExceptions(){
  const today = new Date().toISOString().slice(0,10);
  const { data, error } = await sb.from('planning_exceptions')
    .select('*')
    .gte('date', today)
    .order('date', { ascending: true });
  if(error){
    document.getElementById('exceptions-list').innerHTML = `<p class="empty-state">Erreur de chargement des dates bloquées.</p>`;
    return;
  }
  exceptionsActuelles = data || [];
  renderExceptions();
}

function fmtDateFr(d){
  const [y,m,day] = d.split('-');
  return `${day}/${m}/${y}`;
}

function renderExceptions(){
  const el = document.getElementById('exceptions-list');
  if(!exceptionsActuelles.length){
    el.innerHTML = `<p class="empty-state">Aucune date bloquée à venir.</p>`;
    return;
  }
  el.innerHTML = exceptionsActuelles.map(ex => {
    const periode = ex.journee_entiere
      ? 'Journée entière'
      : `${ex.debut || '?'} — ${ex.fin || '?'}`;
    return `
    <div class="exception-item">
      <div class="exception-info">
        <b>${fmtDateFr(ex.date)}</b> — ${periode}
        ${ex.note ? `<div class="exception-note">${ex.note}</div>` : ''}
      </div>
      <button class="btn-del-exception" onclick="supprimerException('${ex.id}')">SUPPRIMER</button>
    </div>`;
  }).join('');
}

async function ajouterException(){
  const date = document.getElementById('bloc-date').value;
  if(!date){ await customAlert("Choisis une date."); return; }

  const journeeEntiere = document.getElementById('bloc-journee').checked;
  const debut = journeeEntiere ? null : (document.getElementById('bloc-debut').value || null);
  const fin = journeeEntiere ? null : (document.getElementById('bloc-fin').value || null);
  const note = document.getElementById('bloc-note').value.trim() || null;

  const { error } = await sb.from('planning_exceptions').insert({
    date, journee_entiere: journeeEntiere, debut, fin, note
  });

  if(error){ await customAlert("Erreur lors du blocage de la date."); return; }

  document.getElementById('bloc-date').value = '';
  document.getElementById('bloc-note').value = '';
  document.getElementById('bloc-journee').checked = true;
  toggleBlocHeures();

  await loadExceptions();
  await customAlert("Date bloquée ✓");
}

async function supprimerException(id){
  const ok = await customConfirm("Débloquer cette date ?");
  if(!ok) return;
  const { error } = await sb.from('planning_exceptions').delete().eq('id', id);
  if(error){ await customAlert("Erreur lors de la suppression."); return; }
  await loadExceptions();
}

sb.auth.getSession().then(({data})=>{
  if(data.session) showDashboard();
});
