/* ============================================================
   ★ À MODIFIER avant mise en ligne
   ============================================================ */
const PAYPAL_HANDLE = "swoohair";
const IG_HANDLE = "swoo_hair";

const SUPABASE_URL = "https://mejymryskgxhsojescxf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1lanltcnlza2d4aHNvamVzY3hmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0ODY2OTcsImV4cCI6MjEwMjA2MjY5N30.rBggWuPcL5155_MnrnVG9Gk0BnzA6R89l-4sXeGxvqM";
const supabaseClient = (SUPABASE_URL.includes("TON-PROJET"))
  ? null
  : window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const SUPPLEMENT_REPOSE = 0; // ★ remplace par le vrai montant

const SUPPLEMENTS = {
  horsCreneaux:    { label: "Hors créneaux (avant 11h / après 18h)", montant: 10 },
  stylingCoupe:    { label: "Styling / Coupe carré",                  montant: 10 },
  depotVeille:     { label: "Dépôt de perruque la veille du rdv",     montant: 10 },
  customJourMeme:  { label: "Customisation le jour même",             montant: 15 }
};

/* ---------- Popups ---------- */
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

/* ============================================================
   PLANNING — lecture des horaires définis dans l'admin
   ============================================================ */
const JOURS_KEYS = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi']; // getDay() : 0 = dimanche

let horairesRecurrents = null; // { lundi:{ouvert,debut,fin}, ... }
let overridesParDate = {};     // { '2026-09-15': {ouvert,debut,fin}, ... }
let planningChargePromise = null;

function chargerPlanning(){
  if(planningChargePromise) return planningChargePromise;
  if(!supabaseClient){ planningChargePromise = Promise.resolve(); return planningChargePromise; }

  planningChargePromise = (async ()=>{
    try{
      const { data: cfg } = await supabaseClient.from('planning_config').select('*').eq('id',1).maybeSingle();
      horairesRecurrents = (cfg && cfg.jours) ? cfg.jours : null;
    }catch(e){ console.warn('planning_config indisponible', e); }

    try{
      const { data: overrides } = await supabaseClient.from('planning_overrides').select('*');
      (overrides||[]).forEach(o=>{ overridesParDate[o.date] = o; });
    }catch(e){ console.warn('planning_overrides indisponible', e); }
  })();

  return planningChargePromise;
}
chargerPlanning();

/* Retourne { ouvert, debut, fin } pour une date donnée (YYYY-MM-DD),
   en tenant compte d'abord des overrides ponctuels, sinon des horaires récurrents.
   Si rien n'est configuré (tables absentes), retourne un fallback ouvert 11h-19h
   pour ne jamais bloquer les réservations en cas de problème de configuration. */
function getHorairesDuJour(dateISO){
  if(overridesParDate[dateISO]){
    const o = overridesParDate[dateISO];
    return { ouvert: !!o.ouvert, debut: o.debut || '11:00', fin: o.fin || '19:00' };
  }
  if(horairesRecurrents){
    const jsDate = new Date(dateISO+'T00:00:00');
    const key = JOURS_KEYS[jsDate.getDay()];
    const cfg = horairesRecurrents[key];
    if(cfg) return { ouvert: !!cfg.ouvert, debut: cfg.debut || '11:00', fin: cfg.fin || '19:00' };
  }
  return { ouvert: true, debut: '11:00', fin: '19:00' };
}

/* ============================================================
   CATALOGUE — avec description détaillée par prestation
   ============================================================ */
const CATALOG = {
  "Barrel Twists":[
    {name:"Barrel simple", price:"30€", dep:10, duree:150, type:"slot",
      desc:"Un barrel twist net et soigné, réalisé avec des séparations propres pour un rendu fluide et durable. Une coiffure protectrice élégante, facile à porter au quotidien pendant plusieurs semaines."},
    {name:"Barrel motif", price:"35€", dep:10, duree:150, type:"slot",
      desc:"Le barrel twist décliné avec un motif personnalisé pour un rendu plus créatif et unique, tout en gardant une tenue durable et une protection optimale des cheveux."},
    {name:"Retwist locks avec coupe", price:"45€", dep:10, duree:270, type:"slot",
      desc:"Rafraîchissement complet de tes locks avec retwist et coupe d'entretien, pour un rendu net et une repousse soignée. Durée variable selon la longueur et l'état des locks (4 à 5h)."},
    {name:"Flat Twist simple", price:"30€", dep:10, duree:150, type:"slot",
      desc:"Flat twists plaqués au cuir chevelu pour une finition nette et discrète, idéale au quotidien comme en coiffure protectrice."},
    {name:"Flat Twist simple modèle", price:"35€", dep:10, duree:150, type:"slot",
      desc:"Flat twists avec un motif de séparation personnalisé, pour une touche plus originale tout en gardant une tenue nette et confortable."}
  ],
  "Nattes":[
    {name:"Nattes collées wig", price:"10€", dep:10, duree:30, type:"slot",
      desc:"Préparation des nattes collées avant la pose de ta perruque, pour une base nette et un rendu naturel au niveau du scalp."},
    {name:"Nattes collées simple", price:"15€", dep:10, duree:30, type:"slot",
      desc:"Nattage collé simple, propre et confortable, en préparation d'une pose ou pour un usage seul."},
    {name:"Nattes motif", price:"20€", dep:10, duree:90, type:"slot",
      desc:"Nattes collées avec motif personnalisé pour un rendu soigné et original, adapté à ton style."}
  ],
  "Ponytail":[
    {name:"Ponytail simple", price:"50€", dep:20, duree:180, type:"slot",
      desc:"Préparation et lissage des cheveux, plaquage soigné avec une finition nette, réalisation d'une ponytail haute selon le style souhaité, pose de la queue de cheval (colle ou fil selon préférence) et finitions professionnelles (baby hairs, brillance et fixation)."},
    {name:"Frange / hairstyle", price:"10€", dep:20, duree:30, type:"slot",
      desc:"Ajout d'une frange ou d'un styling complémentaire à ta ponytail pour personnaliser le rendu final."}
  ],
  "Perruque":[
    {name:"Pose + custom", price:"50€", dep:10, duree:120, type:"slot", needPhoto:true,
      desc:"Pose complète de ta perruque avec customisation incluse : décoloration des nœuds, découpe de la tulle et floutage de la lace pour un rendu scalp naturel. La perruque doit être déposée propre avant le rendez-vous."},
    {name:"Pose", price:"40€", dep:10, duree:120, type:"slot", needPhoto:true, hasRepose:true,
      desc:"Pose soignée de ta perruque avec découpe de la lace et application de la colle, floutage pour un rendu naturel. Option 'avec repose' disponible si ta perruque a déjà été posée précédemment."},
    {name:"Pose sans colle", price:"30€", dep:10, duree:120, type:"slot", needPhoto:true,
      desc:"Pose de ta perruque sans colle, une alternative douce et rapide pour un port confortable au quotidien."},
    {name:"Customisation", price:"25€", dep:10, duree:0, type:"depot", needPhoto:true,
      desc:"Blanchiment des nœuds et customisation complète de ta perruque pour un rendu scalp naturel. Dépôt requis 3 à 6 jours avant, perruque propre exigée."},
    {name:"Décoloration des nœuds", price:"15€", dep:10, duree:0, type:"depot", needPhoto:true,
      desc:"Décoloration des nœuds de ta lace pour un rendu plus naturel au niveau du cuir chevelu. Dépôt requis avant traitement."},
    {name:"Lavage wig", price:"20€", dep:10, duree:0, type:"depot", needPhoto:true,
      desc:"Lavage professionnel et soin de ta perruque pour retrouver douceur et brillance."},
    {name:"Remise à neuf", price:"30€", dep:10, duree:0, type:"depot", needPhoto:true,
      desc:"Restauration complète de ta perruque abîmée ou usée : lavage, soin et remise en forme pour un rendu comme neuf."},
    {name:"Changement de lace", price:"25€", dep:10, duree:0, type:"depot", needPhoto:true,
      desc:"Remplacement de la lace de ta perruque pour prolonger sa durée de vie et retrouver un rendu net."},
    {name:"Styling / Coupe carré", price:"10€", dep:10, duree:45, type:"slot",
      desc:"Coupe carré ou styling personnalisé sur ta perruque déjà posée, pour un rendu frais et sur-mesure."},
    {name:"Confection wig", price:"70€", dep:10, duree:180, type:"slot",
      desc:"Confection complète d'une perruque sur-mesure selon tes préférences de couleur, longueur et texture."},
    {name:"Couleur wig", price:"Devis", dep:0, duree:0, type:"devis",
      desc:"Coloration personnalisée de ta perruque — envoie une photo de ta perruque sur Instagram pour recevoir ton devis avant réservation."}
  ]
};
const NOTES = {
  "Barrel Twists":"Cheveux lavés 2 à 3 jours avant",
  "Nattes":"Cheveux lavés 2 à 3 jours avant",
  "Ponytail":"Cheveux lavés 2 à 3 jours avant",
  "Perruque":"Perruque propre à déposer avant le rendez-vous (voir détails après sélection)"
};

Object.keys(CATALOG).forEach(cat=>{
  const wrap = document.querySelector(`.svc-list[data-cat="${cat}"]`);
  if(!wrap) return;
  CATALOG[cat].forEach((item, idx)=>{
    const row = document.createElement('div');
    row.className='svc-row-wrap';
    const dureeTxt = item.type === 'slot' ? ` · ${fmtDuree(item.duree)}` : (item.type === 'depot' ? ' · Dépôt' : '');
    const descId = `desc-${cat.replace(/\s+/g,'')}-${idx}`;
    row.innerHTML = `
      <div class="svc-row">
        <div class="left">
          <span class="svc-name">${item.name}</span>
          <span class="svc-tiny">${(NOTES[cat]||'')}${dureeTxt}</span>
          ${item.desc ? `<button type="button" class="svc-desc-toggle" data-target="${descId}">Voir la description ↓</button>` : ''}
        </div>
        <div class="svc-right">
          <span class="svc-price">${item.price}</span>
          <span class="svc-pick">→ RÉSERVER</span>
        </div>
      </div>
      ${item.desc ? `<p class="svc-desc" id="${descId}" style="display:none">${item.desc}</p>` : ''}
    `;
    wrap.appendChild(row);

    row.querySelector('.svc-row').addEventListener('click', (e)=>{
      if(e.target.classList.contains('svc-desc-toggle')) return;
      document.querySelectorAll('.svc-row').forEach(r=>r.classList.remove('sel'));
      row.querySelector('.svc-row').classList.add('sel');
      selectService(item, NOTES[cat]||'');
    });

    const toggle = row.querySelector('.svc-desc-toggle');
    if(toggle){
      toggle.addEventListener('click', (e)=>{
        e.stopPropagation();
        const p = document.getElementById(descId);
        const open = p.style.display !== 'none';
        p.style.display = open ? 'none' : 'block';
        toggle.textContent = open ? 'Voir la description ↓' : 'Masquer la description ↑';
      });
    }
  });
});

function fmtDuree(min){
  if(min < 60) return min+"min";
  const h = Math.floor(min/60), m = min%60;
  return m ? `${h}h${m.toString().padStart(2,'0')}` : `${h}h`;
}

/* ---------- Formations à horaires fixes ---------- */
function selectFormationFixe(name, price, dep, note, heureDebut, heureFin, jours){
  current = { name, price, dep, note, type:"formation-fixe", heureDebut, heureFin, jours: jours||1, duree: 0 };
  renderTicket();
  document.getElementById('reservation').scrollIntoView({behavior:'smooth', block:'start'});
}

/* ---------- Ticket / sélection ---------- */
let current = null;

function selectService(item, note){
  current = { ...item, note };
  renderTicket();
  document.getElementById('reservation').scrollIntoView({behavior:'smooth', block:'start'});
}

function prixNumerique(str){
  const n = parseFloat(String(str).replace('€','').replace(',','.'));
  return isNaN(n) ? 0 : n;
}

function renderTicket(){
  document.getElementById('ticket-empty').style.display='none';
  document.getElementById('ticket-filled').style.display='block';
  document.getElementById('t-detail').textContent = current.note || '—';
  document.getElementById('t-dep').textContent = current.dep+'€';

  const btn = document.getElementById('paypal-btn');
  if(current.type === 'devis'){
    btn.href = `https://instagram.com/${IG_HANDLE}`;
    btn.textContent = `ENVOIE TA DEMANDE DE DEVIS SUR INSTAGRAM`;
  } else {
    btn.href = `https://paypal.me/${PAYPAL_HANDLE}/${current.dep}`;
    btn.textContent = `PAYER L'ACOMPTE DE ${current.dep}€ VIA PAYPAL`;
  }

  toggleFormFields();
  refreshTicket();
  updateTicketTotal();

  // Redemande la vérification si une date est déjà choisie
  const dateVal = document.getElementById('date_rdv').value;
  if(dateVal) verifierDateEtRafraichirCreneaux();
}

/* Met à jour le prix affiché dans le ticket EN DIRECT avec les suppléments cochés */
function updateTicketTotal(){
  if(!current) return;
  const base = prixNumerique(current.price);
  const { total: suppTotal } = calculerSupplements();
  const finalPrice = base + suppTotal;
  const nameEl = document.getElementById('t-name');
  const priceEl = document.getElementById('t-price');
  nameEl.textContent = current.name;
  if(current.type === 'devis'){
    priceEl.textContent = 'Sur devis';
  } else if(suppTotal > 0){
    priceEl.textContent = `${current.price} + ${suppTotal}€ = ${finalPrice}€`;
  } else {
    priceEl.textContent = current.price;
  }
}

/* Écoute les cases suppléments/repose pour tout recalculer en direct */
document.addEventListener('change', (e)=>{
  if(e.target.id && (e.target.id.startsWith('supp-') || e.target.id === 'repose-checkbox')){
    updateTicketTotal();
  }
});

function toggleFormFields(){
  const heureLabel = document.querySelector('label[for="heure_rdv"]') || document.getElementById('heure_rdv').previousElementSibling;
  const heureSelect = document.getElementById('heure_rdv');
  const reposeBox = document.getElementById('repose-box');
  const photoBox = document.getElementById('photo-etat-box');
  const suppBox = document.getElementById('supplements-box');

  const showHeure = current.type === 'slot';
  heureSelect.style.display = showHeure ? 'block' : 'none';
  if(heureLabel) heureLabel.style.display = showHeure ? 'block' : 'none';

  if(reposeBox) reposeBox.style.display = current.hasRepose ? 'block' : 'none';
  if(photoBox) photoBox.style.display = current.needPhoto ? 'block' : 'none';
  if(suppBox) suppBox.style.display = (current.type === 'slot' || current.type === 'depot') ? 'block' : 'none';

  document.getElementById('date_rdv').style.display = current.type === 'devis' ? 'none' : 'block';
}

function refreshTicket(){
  const d = document.getElementById('date_rdv').value;
  const h = document.getElementById('heure_rdv').value;
  document.getElementById('t-date').textContent = d ? new Date(d).toLocaleDateString('fr-FR') : 'à choisir';
  document.getElementById('t-heure').textContent = current && current.type === 'formation-fixe'
    ? `${current.heureDebut} – ${current.heureFin}`
    : (h || (current && current.type === 'depot' ? "Dépôt (pas d'heure)" : 'à choisir'));
}

/* ---------- Message "jour fermé" affiché sous le champ date ---------- */
function getOrCreateDateStatusEl(){
  let el = document.getElementById('date-status-msg');
  if(!el){
    el = document.createElement('p');
    el.id = 'date-status-msg';
    el.className = 'slot-note';
    el.style.marginTop = '8px';
    el.style.cssText += 'font-size:9.5px !important; margin-top:8px !important;';
    document.getElementById('date_rdv').insertAdjacentElement('afterend', el);
  }
  return el;
}

function fmtDateFr(dateISO){
  return new Date(dateISO+'T00:00:00').toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' });
}

/* ---------- Créneaux dynamiques ---------- */
const heureSel = document.getElementById('heure_rdv');
function toMin(hhmm){ const [h,m] = hhmm.split(':').map(Number); return h*60+(m||0); }
function toHHMM(min){ const h = Math.floor(min/60), m = min%60; return `${h}:${m.toString().padStart(2,'0')}`; }

async function verifierDateEtRafraichirCreneaux(){
  const d = document.getElementById('date_rdv').value;
  const statusEl = getOrCreateDateStatusEl();
  heureSel.innerHTML = '<option value="">Choisir un créneau</option>';
  statusEl.textContent = '';
  statusEl.style.color = '';

  if(!d) return;

  await chargerPlanning();
  const horaires = getHorairesDuJour(d);

  if(!horaires.ouvert){
    statusEl.textContent = `Fermé le ${fmtDateFr(d)} — merci de choisir une autre date.`;
    statusEl.style.color = '#b23b3b';
    document.getElementById('date_rdv').value = '';
    refreshTicket();
    return;
  }

  if(current && current.type === 'slot'){
    await refreshHeureAvailability(horaires);
  }
  refreshTicket();
}
document.getElementById('date_rdv').addEventListener('change', verifierDateEtRafraichirCreneaux);

async function refreshHeureAvailability(horairesDuJour){
  heureSel.innerHTML = '<option value="">Choisir un créneau</option>';
  const d = document.getElementById('date_rdv').value;
  if(!d || !current || current.type !== 'slot' || !supabaseClient) return;

  const horaires = horairesDuJour || getHorairesDuJour(d);
  if(!horaires.ouvert) return;

  const OUVERTURE = toMin(horaires.debut);
  const FERMETURE = toMin(horaires.fin);

  const { data: pris, error } = await supabaseClient
    .from('reservations').select('heure_rdv,duree_minutes')
    .eq('date_rdv', d).in('status', ['pending','confirmed']);
  if(error){ console.error(error); return; }

  const occupes = (pris||[]).filter(r=>r.heure_rdv).map(r=>{
    const debut = toMin(r.heure_rdv);
    return [debut, debut + (r.duree_minutes||60)];
  });

  for(let m = OUVERTURE; m + current.duree <= FERMETURE; m += current.duree){
    const finSlot = m + current.duree;
    const conflit = occupes.some(([od, of_]) => m < of_ && finSlot > od);
    if(!conflit){
      const opt = document.createElement('option');
      opt.value = toHHMM(m);
     opt.textContent = `${toHHMM(m)} – ${toHHMM(finSlot)}`;
      heureSel.appendChild(opt);
    }
  }
  if(heureSel.options.length <= 1){
    const opt = document.createElement('option');
    opt.disabled = true;
    opt.textContent = "Aucun créneau libre ce jour-là, essaie une autre date";
    heureSel.appendChild(opt);
  }
}

/* ---------- Suppléments ---------- */
function calculerSupplements(){
  let total = 0;
  const labels = [];
  Object.entries(SUPPLEMENTS).forEach(([key, s])=>{
    const cb = document.getElementById('supp-'+key);
    if(cb && cb.checked){ total += s.montant; labels.push(s.label+` (+${s.montant}€)`); }
  });
  if(current && current.hasRepose){
    const cbRepose = document.getElementById('repose-checkbox');
    if(cbRepose && cbRepose.checked && SUPPLEMENT_REPOSE > 0){
      total += SUPPLEMENT_REPOSE;
      labels.push(`Avec repose (+${SUPPLEMENT_REPOSE}€)`);
    }
  }
  return { total, labels };
}

/* ---------- Copier récapitulatif ---------- */
function copyRecap(){
  if(!current){ customAlert("Choisis d'abord une prestation."); return; }
  const d = document.getElementById('date_rdv').value ? new Date(document.getElementById('date_rdv').value).toLocaleDateString('fr-FR') : '—';
  const h = current.type === 'formation-fixe' ? `${current.heureDebut}–${current.heureFin}` : (document.getElementById('heure_rdv').value || '—');
  const nom = document.getElementById('nom').value || '—';
  const tel = document.getElementById('telephone').value || '—';
  const insta = document.getElementById('insta').value || '—';
  const { total: suppTotal, labels } = calculerSupplements();
  const finalPrice = prixNumerique(current.price) + suppTotal;
  const txt = `SWOO HAIR — Demande de rendez-vous
Prestation : ${current.name} (${current.price}${suppTotal ? ' + '+suppTotal+'€ suppléments = '+finalPrice+'€' : ''})
Date : ${d}
Heure : ${h}
Nom : ${nom}
Téléphone : ${tel}
Instagram : ${insta}
Acompte réglé : ${current.dep}€ (capture jointe en DM)
${labels.length ? 'Suppléments : '+labels.join(', ') : ''}`;
  navigator.clipboard.writeText(txt).then(()=>{
    customAlert("Récapitulatif copié — garde-le pour tes archives, ta réservation est déjà prise en compte une fois l'acompte réglé.");
  }).catch(()=>customAlert(txt));
}

/* ---------- Message d'avertissement avant confirmation ---------- */
function messageAvertissementPerruque(){
  return `Important avant de confirmer ton rendez-vous perruque :

• Ta perruque doit être propre et déposée avant le rendez-vous (voir délai précisé pour la prestation).
• Un dépôt la veille du rendez-vous entraîne un supplément de ${SUPPLEMENTS.depotVeille.montant}€.
• Une customisation demandée le jour même entraîne un supplément de ${SUPPLEMENTS.customJourMeme.montant}€.
• Merci de joindre une photo de l'état actuel de ta perruque.

En confirmant, tu acceptes ces conditions.`;
}

/* ---------- Envoi vers Supabase ---------- */
async function submitReservation(){
  const statusEl = document.getElementById('submit-status');
  if(!current){ customAlert("Choisis d'abord une prestation dans les rubriques plus haut."); return; }
  if(!supabaseClient){ customAlert("Connexion à la base non configurée."); return; }

  if(current.type === 'devis'){
    customAlert("Pour un devis, contacte-nous directement sur Instagram avec une photo/description de ta perruque.");
    return;
  }

  const date = document.getElementById('date_rdv').value;
  const heure = current.type === 'formation-fixe' ? current.heureDebut : document.getElementById('heure_rdv').value;
  const nom = document.getElementById('nom').value.trim();
  const email = document.getElementById('email').value.trim();
  const telephone = document.getElementById('telephone').value.trim();
  const insta = document.getElementById('insta').value.trim();
  const captureFile = document.getElementById('capture').files[0];
  const photoEtatFile = document.getElementById('photo-etat') ? document.getElementById('photo-etat').files[0] : null;

  if(!nom || !email || !date){
    statusEl.textContent = "Merci de remplir au minimum : date, nom et e-mail.";
    statusEl.style.color = "#b23b3b"; return;
  }

  // Re-vérification finale du jour (au cas où le planning aurait changé entretemps)
  if(current.type !== 'devis'){
    await chargerPlanning();
    const horaires = getHorairesDuJour(date);
    if(!horaires.ouvert){
      statusEl.textContent = `Fermé le ${fmtDateFr(date)} — merci de choisir une autre date.`;
      statusEl.style.color = "#b23b3b"; return;
    }
  }

  if(current.type === 'slot' && !heure){
    statusEl.textContent = "Merci de choisir un créneau horaire.";
    statusEl.style.color = "#b23b3b"; return;
  }
  if(!captureFile){
    statusEl.textContent = "Merci de joindre la capture de ton paiement PayPal avant d'envoyer ta demande.";
    statusEl.style.color = "#b23b3b"; return;
  }
  if(current.needPhoto && !photoEtatFile){
    statusEl.textContent = "Merci de joindre une photo de l'état actuel de ta perruque.";
    statusEl.style.color = "#b23b3b"; return;
  }

  if(current.needPhoto || current.type === 'depot'){
    const ok = await customConfirm(messageAvertissementPerruque());
    if(!ok) return;
  }

  if(current.type === 'slot'){
    statusEl.textContent = "Vérification du créneau…";
    statusEl.style.color = "";
    const { data: pris } = await supabaseClient
      .from('reservations').select('heure_rdv,duree_minutes')
      .eq('date_rdv', date).in('status', ['pending','confirmed']);
    const debut = toMin(heure), fin = debut + current.duree;
    const conflit = (pris||[]).some(r=>{
      const od = toMin(r.heure_rdv), of_ = od + (r.duree_minutes||60);
      return debut < of_ && fin > od;
    });
    if(conflit){
      statusEl.textContent = "Ce créneau vient d'être pris par quelqu'un d'autre, merci d'en choisir un autre.";
      statusEl.style.color = "#b23b3b";
      refreshHeureAvailability();
      return;
    }
  }

  statusEl.textContent = "Envoi en cours…";
  statusEl.style.color = "";

  function nettoyerNomFichier(name){
  return name
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'') // enlève les accents
    .replace(/[^a-zA-Z0-9.\-_]/g, '_'); // remplace tout le reste (espaces, apostrophes...) par _
}
const captureName = `${Date.now()}_${nettoyerNomFichier(captureFile.name)}`;
  const { error: uploadError } = await supabaseClient.storage.from('captures-paiement').upload(captureName, captureFile);
  if(uploadError){
    console.error(uploadError);
    statusEl.textContent = "Erreur lors de l'envoi de la capture, réessaie.";
    statusEl.style.color = "#b23b3b"; return;
  }

 let photoEtatPath = null;
if(photoEtatFile){
  const fname = `etat_${Date.now()}_${nettoyerNomFichier(photoEtatFile.name)}`;
  const { error: err2 } = await supabaseClient.storage.from('etat-perruque').upload(fname, photoEtatFile);
  if(err2){
    console.error("Erreur upload etat-perruque:", err2);
    alert("Erreur upload photo état perruque : " + err2.message);
  } else {
    photoEtatPath = fname;
  }
}
  const { total: suppTotal, labels: suppLabels } = calculerSupplements();
  const reposeChoisie = current.hasRepose && document.getElementById('repose-checkbox')?.checked;

  const noteComplete = [
    current.note,
    reposeChoisie ? `Avec repose (+${SUPPLEMENT_REPOSE}€)` : null,
    suppLabels.length ? `Suppléments : ${suppLabels.join(', ')}` : null,
    current.type === 'formation-fixe' ? `Formation ${current.jours}j — horaire fixe ${current.heureDebut}-${current.heureFin}` : null
  ].filter(Boolean).join(' | ');

  const { error } = await supabaseClient.from('reservations').insert({
    prestation: current.name,
    service_price: current.price,
    acompte: current.dep + '€',
    note: noteComplete,
    date_rdv: date,
    heure_rdv: current.type === 'depot' ? null : heure,
    duree_minutes: current.duree || null,
    nom, telephone, email,
    instagram: insta,
    capture_paiement: captureName,
    photo_etat_perruque: photoEtatPath,
    supplement_total: suppTotal
  });

  if(error){
    console.error(error);
    statusEl.textContent = "Une erreur est survenue, réessaie ou contacte-nous sur Instagram.";
    statusEl.style.color = "#b23b3b"; return;
  }

  statusEl.textContent = "Demande envoyée ✓ — tu recevras un e-mail dès qu'elle sera acceptée ou refusée.";
  statusEl.style.color = "#2f6b3f";
  document.getElementById('booking-form').querySelectorAll('input,button,select').forEach(el=>el.disabled=true);
}

/* ---------- Avis ---------- */
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
  if(!nom || !noteChoisie || !txt){ customAlert("Merci d'indiquer ton prénom, une note et un commentaire."); return; }
  AVIS.unshift({nom, note:noteChoisie, svc, txt});
  renderAvis();
  document.getElementById('avis-nom').value=''; document.getElementById('avis-svc').value=''; document.getElementById('avis-txt').value='';
  noteChoisie=0; rateInput.querySelectorAll('span').forEach(s=>s.classList.remove('on'));
  customAlert("Merci pour ton avis 🖤");
}

document.getElementById('footer-meta').textContent = "© SWOO HAIR RIS-ORANGIS " + new Date().getFullYear();
