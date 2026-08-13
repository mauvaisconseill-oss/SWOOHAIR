const SUPABASE_URL = "https://mejymryskgxhsojescxf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1lanltcnlza2d4aHNvamVzY3hmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0ODY2OTcsImV4cCI6MjEwMjA2MjY5N30.rBggWuPcL5155_MnrnVG9Gk0BnzA6R89l-4sXeGxvqM";
const EDGE_FUNCTION_URL = "https://mejymryskgxhsojescxf.supabase.co/functions/v1/resend-email";

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
    return `
    <div class="req-card">
      <div class="req-info">
        <p class="rname">${r.nom || '—'} <span class="req-badge ${r.status||'pending'}">${(r.status||'pending').toUpperCase()}</span></p>
        <p class="req-row"><b>Prestation :</b> ${r.prestation || '—'} (${fmtEuro(r.service_price)}, acompte ${fmtEuro(r.acompte)})</p>
        <p class="req-row"><b>Date :</b> ${r.date_rdv || '—'} &nbsp; <b>Heure :</b> ${r.heure_rdv || '—'}</p>
        <p class="req-row"><b>Email :</b> ${r.email || '—'}</p>
        <p class="req-row"><b>Téléphone :</b> ${r.telephone || '—'} &nbsp; <b>Instagram :</b> ${r.instagram || '—'}</p>
        ${captureLink}
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

async function respond(id, status){
  const { error } = await sb.from('reservations').update({ status }).eq('id', id);
  if(error){ alert("Erreur lors de la mise à jour."); return; }

  try{
    const { data:{ session } } = await sb.auth.getSession();
    const res = await fetch(EDGE_FUNCTION_URL, {
      method:'POST',
      headers:{ 'Content-Type':'application/json', 'Authorization':`Bearer ${session.access_token}` },
      body: JSON.stringify({ id, status })
    });
    if(!res.ok){
      const detail = await res.text();
      console.error("Réponse fonction email :", detail);
      alert("Statut mis à jour, mais l'e-mail n'a pas pu être envoyé — vérifie les Logs de la fonction resend-email dans Supabase.");
    }
  }catch(e){
    console.error("Email non envoyé :", e);
    alert("Statut mis à jour, mais l'e-mail n'a pas pu être envoyé.");
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
