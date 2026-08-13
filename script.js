/* ============================================================
   ★ À MODIFIER avant mise en ligne
   ============================================================ */
const PAYPAL_HANDLE = "swoohair"; // remplace par ton vrai lien paypal.me
const IG_HANDLE = "swoo_hair";

/* ★ Supabase — URL et clé "anon public" de TON projet swoohair
   (Supabase > Settings > API). Cette clé est publique par design,
   ce n'est pas un secret — la sécurité vient des règles RLS. */
const SUPABASE_URL = "https://mejymryskgxhsojescxf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1lanltcnlza2d4aHNvamVzY3hmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0ODY2OTcsImV4cCI6MjEwMjA2MjY5N30.rBggWuPcL5155_MnrnVG9Gk0BnzA6R89l-4sXeGxvqM";
const supabaseClient = (SUPABASE_URL.includes("TON-PROJET"))
  ? null
  : window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ---------- Mobile menu ---------- */
const menuBtn = document.querySelector('.menu-btn');
const mobileMenu = document.querySelector('.mobile-menu');
menuBtn.addEventListener('click',()=>mobileMenu.classList.toggle('open'));
document.querySelectorAll('.mobile-menu a').forEach(a=>a.addEventListener('click',()=>mobileMenu.classList.remove('open')));

/* ---------- Reveal on scroll ---------- */
const observer = new IntersectionObserver(entries=>{
  entries.forEach(entry=>{ if(entry.isIntersecting){ entry.target.classList.add('visible'); observer.unobserve(entry.target); } });
},{threshold:.1});
document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));

/* ---------- Data : catalogue ---------- */
const CATALOG = {
  "Barrel Twists":[["Barrel simple","30€",10],["Barrel motif","35€",10],["Retwist locks avec coupe","45€",10],["Flat Twist simple","30€",10],["Flat Twist simple modèle","35€",10]],
  "Nattes":[["Nattes collées wig","10€",10],["Nattes collées simple","15€",10],["Nattes motif","20€",10]],
  "Ponytail":[["Ponytail simple","50€",20],["Frange / hairstyle","10€",20]],
  "Perruque":[["Pose + custom","50€",10],["Pose","40€",10],["Pose sans colle","30€",10],["Customisation","25€",10],["Décoloration des nœuds","15€",10],["Lavage wig","20€",10],["Remise à neuf","30€",10],["Changement de lace","25€",10],["Styling / Coupe carré","10€",10],["Confection wig","70€",10],["Couleur wig","Devis",10]]
};
const NOTES = {
  "Barrel Twists":"Cheveux lavés 2 à 3 jours avant",
  "Nattes":"Cheveux lavés 2 à 3 jours avant",
  "Ponytail":"Cheveux lavés 2 à 3 jours avant",
  "Perruque":"Customisation : perruque propre apportée 2 à 5 jours avant"
};
Object.keys(CATALOG).forEach(cat=>{
  const wrap = document.querySelector(`.svc-list[data-cat="${cat}"]`);
  if(!wrap) return;
  CATALOG[cat].forEach(([name,price,dep])=>{
    const row = document.createElement('div');
    row.className='svc-row';
    row.innerHTML = `<div class="left"><span class="svc-name">${name}</span><span class="svc-tiny">${NOTES[cat]||''}</span></div>
      <div class="svc-right"><span class="svc-price">${price}</span><span class="svc-pick">→ RÉSERVER</span></div>`;
    row.addEventListener('click',()=>{
      document.querySelectorAll('.svc-row').forEach(r=>r.classList.remove('sel'));
      row.classList.add('sel');
      selectService(name,price,dep,NOTES[cat]||'');
    });
    wrap.appendChild(row);
  });
});

/* ---------- Time slots 11h-19h ---------- */
const heureSel = document.getElementById('heure_rdv');
for(let h=11; h<=18; h++){
  const opt = document.createElement('option');
  opt.value = h+":00"; opt.textContent = h+":00";
  heureSel.appendChild(opt);
}

/* ---------- Ticket ---------- */
let current = null;
function selectService(name, price, dep, note){
  current = {name, price, dep, note};
  document.getElementById('ticket-empty').style.display='none';
  document.getElementById('ticket-filled').style.display='block';
  document.getElementById('t-name').textContent = name;
  document.getElementById('t-price').textContent = price;
  document.getElementById('t-detail').textContent = note || '—';
  document.getElementById('t-dep').textContent = dep+'€';
  const btn = document.getElementById('paypal-btn');
  btn.href = `https://paypal.me/${PAYPAL_HANDLE}/${dep}`;
  btn.textContent = `PAYER L'ACOMPTE DE ${dep}€ VIA PAYPAL`;
  refreshTicket();
  document.getElementById('reservation').scrollIntoView({behavior:'smooth', block:'start'});
}
function refreshTicket(){
  const d = document.getElementById('date_rdv').value;
  const h = document.getElementById('heure_rdv').value;
  document.getElementById('t-date').textContent = d ? new Date(d).toLocaleDateString('fr-FR') : 'à choisir';
  document.getElementById('t-heure').textContent = h || 'à choisir';
}

/* ---------- Griser les créneaux déjà confirmés pour la date choisie ---------- */
async function refreshHeureAvailability(){
  const d = document.getElementById('date_rdv').value;
  Array.from(heureSel.options).forEach(opt=>{ opt.disabled=false; opt.textContent = opt.value; });
  if(!d || !supabaseClient) return;
  const { data, error } = await supabaseClient.rpc('get_creneaux_pris');
  if(error || !data) return;
  const prisPourCetteDate = data.filter(c => c.date_rdv === d).map(c => c.heure_rdv);
  Array.from(heureSel.options).forEach(opt=>{
    if(prisPourCetteDate.includes(opt.value)){
      opt.disabled = true;
      opt.textContent = opt.value + ' — déjà pris';
      if(heureSel.value === opt.value) heureSel.value = '';
    }
  });
}
document.getElementById('date_rdv').addEventListener('change', refreshHeureAvailability);
function copyRecap(){
  if(!current){ alert("Choisis d'abord une prestation."); return; }
  const d = document.getElementById('date_rdv').value ? new Date(document.getElementById('date_rdv').value).toLocaleDateString('fr-FR') : '—';
  const h = document.getElementById('heure_rdv').value || '—';
  const nom = document.getElementById('nom').value || '—';
  const tel = document.getElementById('telephone').value || '—';
  const insta = document.getElementById('insta').value || '—';
  const txt = `SWOO HAIR — Demande de rendez-vous
Prestation : ${current.name} (${current.price})
Date : ${d}
Heure : ${h}
Nom : ${nom}
Téléphone : ${tel}
Instagram : ${insta}
Acompte réglé : ${current.dep}€ (capture jointe en DM)`;
  navigator.clipboard.writeText(txt).then(()=>{
    alert("Récapitulatif copié — garde-le pour tes archives, ta réservation est déjà prise en compte une fois l'acompte réglé.");
  }).catch(()=>alert(txt));
}

/* ---------- Envoi réel de la demande vers Supabase ----------
   Colonnes de la table `reservations` :
   nom, telephone, email, prestation, technicienne, date_rdv,
   heure_rdv, acompte, capture_paiement
   (+ instagram, service_price, note ajoutées par le script SQL fourni) */
async function submitReservation(){
  const statusEl = document.getElementById('submit-status');
  if(!current){ alert("Choisis d'abord une prestation dans les rubriques plus haut."); return; }
  if(!supabaseClient){
    alert("Connexion à la base non configurée — voir SUPABASE_URL / SUPABASE_ANON_KEY en haut de script.js.");
    return;
  }
  const date = document.getElementById('date_rdv').value;
  const heure = document.getElementById('heure_rdv').value;
  const nom = document.getElementById('nom').value.trim();
  const email = document.getElementById('email').value.trim();
  const telephone = document.getElementById('telephone').value.trim();
  const insta = document.getElementById('insta').value.trim();

  const captureFile = document.getElementById('capture').files[0];

  if(!nom || !email || !date || !heure){
    statusEl.textContent = "Merci de remplir au minimum : date, heure, nom et e-mail.";
    statusEl.style.color = "#b23b3b";
    return;
  }

  if(!captureFile){
    statusEl.textContent = "Merci de joindre la capture de ton paiement PayPal avant d'envoyer ta demande.";
    statusEl.style.color = "#b23b3b";
    return;
  }

  statusEl.textContent = "Vérification du créneau…";
  statusEl.style.color = "";

  const { data: conflit } = await supabaseClient.rpc('get_creneaux_pris');
  if(conflit && conflit.some(c => c.date_rdv === date && c.heure_rdv === heure)){
    statusEl.textContent = "Ce créneau vient d'être pris par quelqu'un d'autre, merci d'en choisir un autre.";
    statusEl.style.color = "#b23b3b";
    refreshHeureAvailability();
    return;
  }

  statusEl.textContent = "Envoi en cours…";
  statusEl.style.color = "";

  let capturePath = null;
  if(captureFile){
    const fileName = `${Date.now()}_${captureFile.name}`;
    const { error: uploadError } = await supabaseClient.storage
      .from('captures-palement')
      .upload(fileName, captureFile);
    if(uploadError){
      console.error(uploadError);
      statusEl.textContent = "Erreur lors de l'envoi de la capture, réessaie.";
      statusEl.style.color = "#b23b3b";
      return;
    }
    capturePath = fileName;
  }

  const { error } = await supabaseClient.from('reservations').insert({
    prestation: current.name,
    service_price: current.price,
    acompte: current.dep + '€',
    note: current.note,
    date_rdv: date,
    heure_rdv: heure,
    nom, telephone, email,
    instagram: insta,
    capture_paiement: capturePath
  });

  if(error){
    console.error(error);
    statusEl.textContent = "Une erreur est survenue, réessaie ou contacte-nous sur Instagram.";
    statusEl.style.color = "#b23b3b";
    return;
  }

  statusEl.textContent = "Demande envoyée ✓ — tu recevras un e-mail dès qu'elle sera acceptée ou refusée.";
  statusEl.style.color = "#2f6b3f";
  document.getElementById('booking-form').querySelectorAll('input,button').forEach(el=>el.disabled=true);
}

/* ---------- Avis (démo en mémoire) ---------- */
let AVIS = [
  {nom:"Awa",note:5,svc:"Barrel motif",txt:"Le motif est ultra propre, tenue impeccable pendant trois semaines."},
  {nom:"Kadia",note:5,svc:"Pose + custom",txt:"Rendu scalp hyper naturel, personne n'a deviné que c'était une perruque."},
  {nom:"Sira",note:5,svc:"Bubble Ponytail",txt:"Douce avec mes cheveux et très professionnelle, je recommande."}
];
function starStr(n){ return "★★★★★".slice(0,n)+"☆☆☆☆☆".slice(0,5-n); }
function renderAvis(){
  document.getElementById('letters').innerHTML = AVIS.map(a=>`<div class="letter">
      <div class="top"><span class="name">${a.nom}</span><span class="stars">${starStr(a.note)}</span></div>
      <p class="txt">"${a.txt}"</p><span class="svc-tag">${a.svc}</span></div>`).join('');
  const moy = AVIS.reduce((s,a)=>s+a.note,0)/AVIS.length;
  document.getElementById('avg-note').textContent = moy.toFixed(1);
  document.getElementById('avg-stars').textContent = starStr(Math.round(moy));
  document.getElementById('avg-count').textContent = AVIS.length+" avis";
}
renderAvis();
let noteChoisie = 0;
const rateInput = document.getElementById('rate-input');
rateInput.querySelectorAll('span').forEach(st=>{
  st.addEventListener('click',()=>{
    noteChoisie = +st.dataset.v;
    rateInput.querySelectorAll('span').forEach(s=>s.classList.toggle('on', +s.dataset.v<=noteChoisie));
  });
});
function postAvis(){
  const nom = document.getElementById('avis-nom').value.trim();
  const svc = document.getElementById('avis-svc').value.trim() || "Prestation";
  const txt = document.getElementById('avis-txt').value.trim();
  if(!nom || !noteChoisie || !txt){ alert("Merci d'indiquer ton prénom, une note et un commentaire."); return; }
  AVIS.unshift({nom, note:noteChoisie, svc, txt});
  renderAvis();
  document.getElementById('avis-nom').value=''; document.getElementById('avis-svc').value=''; document.getElementById('avis-txt').value='';
  noteChoisie=0; rateInput.querySelectorAll('span').forEach(s=>s.classList.remove('on'));
  alert("Merci pour ton avis 🖤");
}

/* ---------- Footer date ---------- */
document.getElementById('footer-meta').textContent = "© SWOO HAIR RIS-ORANGIS " + new Date().getFullYear();
