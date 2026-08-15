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
  if(error){ alert("Erreur lors de la mise à jour."); return; }

  const r = allReservations.find(x => x.id === id);
  if(r){
    try{
      await envoyerEmail(r, status);
    }catch(e){
      console.error("Email non envoyé :", e);
      alert("Statut mis à jour, mais l'e-mail n'a pas pu être envoyé — vérifie tes identifiants EmailJS.");
    }
  }

  await loadRequests();
}

async function removeReservation(id){
  if(!confirm("Supprimer définitivement cette demande ?")) return;
  const { error } = await sb.from('reservations').delete().eq('id', id);
  if(error){ alert("Erreur lors de la suppression."); return; }
  await loadRequests();
}

sb.auth.getSession().then(({data})=>{
  if(data.session) showDashboard();
});
