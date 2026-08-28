<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>SWOO HAIR — Admin</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,700;1,500&family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="style.css">
<style>
  body{background:var(--paper2)}
  .admin-wrap{max-width:900px;margin:0 auto;padding:40px 5% 80px}
  .admin-login{max-width:340px;margin:80px auto;background:var(--cream);border:1px solid var(--line);padding:32px;border-radius:12px}
  .admin-login h1{font-family:"Playfair Display",serif;font-size:22px;margin-bottom:18px}
  .admin-login input{width:100%;padding:12px;margin-bottom:12px;border:1px solid var(--line);border-radius:6px;font-size:14px}
  .admin-login button{width:100%;padding:13px;background:var(--ink);color:var(--cream);border:0;border-radius:6px;font-size:13px;letter-spacing:.06em;cursor:pointer}
  .admin-err{color:#b23b3b;font-size:12.5px;margin-top:8px}
  .admin-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:10px}
  .admin-top h1{font-family:"Playfair Display",serif;font-size:24px}
  .admin-top button{background:transparent;border:1px solid var(--ink);padding:8px 14px;border-radius:6px;font-size:11.5px;letter-spacing:.06em;cursor:pointer}

  .main-tabs{display:flex;gap:10px;margin-bottom:28px;border-bottom:1px solid var(--line);flex-wrap:wrap}
  .main-tab-btn{padding:12px 4px;margin-right:18px;border:0;background:transparent;font-size:13px;letter-spacing:.05em;cursor:pointer;color:#888;border-bottom:2px solid transparent;font-weight:500}
  .main-tab-btn.active{color:var(--ink);border-bottom-color:var(--ink)}

  .tabs{display:flex;gap:8px;margin-bottom:22px;flex-wrap:wrap}
  .tab-btn{padding:9px 16px;border-radius:999px;border:1px solid var(--line);background:var(--cream);font-size:12px;letter-spacing:.04em;cursor:pointer;color:#555}
  .tab-btn.active{background:var(--ink);color:var(--cream);border-color:var(--ink)}
  .tab-count{opacity:.7;font-size:11px}

  .req-card{background:var(--cream);border:1px solid var(--line);border-radius:10px;padding:18px 20px;margin-bottom:14px;display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap}
  .req-info .rname{font-family:"Playfair Display",serif;font-size:17px;margin-bottom:8px}
  .req-row{font-size:13px;margin:3px 0;color:#333}
  .req-row b{color:#111;font-weight:600}
  .req-badge{display:inline-block;font-size:10px;letter-spacing:.06em;padding:3px 9px;border-radius:999px;margin-left:8px;vertical-align:middle}
  .req-badge.pending{background:#f0e6c9;color:#6b5a1e}
  .req-badge.confirmed{background:#d9ecdd;color:#2f6b3f}
  .req-badge.declined{background:#f5d9d9;color:#8a2f2f}
  .req-actions{display:flex;gap:8px;align-items:flex-start;flex-wrap:wrap}
  .req-actions button{padding:10px 16px;border-radius:6px;font-size:11.5px;letter-spacing:.05em;cursor:pointer;border:1px solid var(--ink)}
  .btn-accept{background:var(--ink);color:var(--cream)}
  .btn-decline{background:transparent;color:var(--ink)}
  .btn-delete{background:transparent;color:#b23b3b;border-color:#b23b3b}
  .empty-state{text-align:center;color:#888;padding:60px 0;font-size:14px}

  /* Planning */
  .planning-card{background:var(--cream);border:1px solid var(--line);border-radius:10px;padding:24px 22px;margin-bottom:22px}
  .planning-title{font-family:"Playfair Display",serif;font-size:19px;margin-bottom:4px}
  .planning-sub{font-size:12.5px;color:#777;margin-bottom:18px}

  .jour-row{display:flex;align-items:center;gap:14px;padding:10px 0;border-bottom:1px solid var(--line);flex-wrap:wrap}
  .jour-row:last-child{border-bottom:0}
  .jour-nom{width:100px;font-size:13.5px;font-weight:600}
  .jour-toggle{display:flex;align-items:center;gap:6px;font-size:12.5px;color:#555}
  .jour-heures{display:flex;align-items:center;gap:8px;font-size:13px}
  .jour-heures input[type=time]{padding:7px 8px;border:1px solid var(--line);border-radius:6px;font-size:13px;background:#fff}
  .jour-ferme-label{font-size:12.5px;color:#999;font-style:italic}

  .btn-save-planning{margin-top:18px;padding:12px 22px;background:var(--ink);color:var(--cream);border:0;border-radius:6px;font-size:12px;letter-spacing:.06em;cursor:pointer}

  /* Vue par semaine */
  .semaine-nav{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;gap:10px;flex-wrap:wrap}
  .semaine-nav-btn{padding:9px 14px;border:1px solid var(--ink);background:transparent;border-radius:6px;cursor:pointer;font-size:13px}
  .semaine-nav-btn:hover{background:var(--ink);color:var(--cream)}
  .semaine-label{font-family:"Playfair Display",serif;font-size:17px;text-align:center;flex:1}
  .semaine-label small{display:block;font-family:"DM Sans",sans-serif;font-size:11px;color:#999;font-weight:400;margin-top:2px}
  .semaine-today-btn{font-size:11px;color:#888;text-decoration:underline;cursor:pointer;background:none;border:0;padding:0}

  .jour-row.override .jour-nom{color:#8a5a1e}
  .jour-row.override{background:#faf3e2;margin:0 -10px;padding:10px;border-radius:6px;border-bottom:1px solid #ecdfc0}
  .jour-date{font-size:11px;color:#999;width:60px}
  .override-badge{font-size:9.5px;letter-spacing:.05em;background:#f0e6c9;color:#6b5a1e;padding:2px 7px;border-radius:999px;margin-left:6px}
  .btn-reset-jour{font-size:11px;color:#b23b3b;text-decoration:underline;background:none;border:0;cursor:pointer;padding:0;white-space:nowrap}

  .modal-overlay{position:fixed;inset:0;background:rgba(20,15,10,.5);display:flex;align-items:center;justify-content:center;z-index:999;padding:20px}
  .modal-box{background:var(--cream);border-radius:14px;padding:30px 28px;max-width:360px;width:100%;text-align:center;border:1px solid var(--line);box-shadow:0 20px 50px rgba(0,0,0,.25)}
  .modal-box p{font-family:"Playfair Display",serif;font-size:17px;margin-bottom:24px;color:#222;line-height:1.4}
  .modal-actions{display:flex;gap:10px;justify-content:center}
  .modal-actions button{padding:11px 20px;border-radius:7px;font-size:11.5px;letter-spacing:.06em;cursor:pointer;border:1px solid var(--ink);flex:1}
  .modal-btn-primary{background:var(--ink);color:var(--cream)}
  .modal-btn-danger{background:#b23b3b;color:#fff;border-color:#b23b3b}
  .modal-btn-secondary{background:transparent;color:var(--ink)}
</style>
</head>
<body>
<div id="login-view" class="admin-login">
  <h1>SWOO HAIR — Admin</h1>
  <input type="email" id="admin-email" placeholder="ton e-mail">
  <input type="password" id="admin-pass" placeholder="mot de passe">
  <button onclick="adminLogin()">SE CONNECTER</button>
  <p class="admin-err" id="login-err"></p>
</div>

<div id="dash-view" class="admin-wrap" style="display:none">
  <div class="admin-top">
    <h1>Administration</h1>
    <button onclick="adminLogout()">SE DÉCONNECTER</button>
  </div>

  <div class="main-tabs">
    <button class="main-tab-btn active" data-view="reservations" onclick="switchMainView('reservations')">RÉSERVATIONS</button>
    <button class="main-tab-btn" data-view="planning" onclick="switchMainView('planning')">GÉRER MON PLANNING</button>
  </div>

  <div id="reservations-view">
    <div class="tabs">
      <button class="tab-btn active" data-status="pending" onclick="switchTab('pending')">EN ATTENTE <span class="tab-count" id="count-pending"></span></button>
      <button class="tab-btn" data-status="confirmed" onclick="switchTab('confirmed')">ACCEPTÉES <span class="tab-count" id="count-confirmed"></span></button>
      <button class="tab-btn" data-status="declined" onclick="switchTab('declined')">REFUSÉES <span class="tab-count" id="count-declined"></span></button>
    </div>
    <div id="req-list"></div>
  </div>

  <div id="planning-view" style="display:none">

    <div class="planning-card">
      <h2 class="planning-title">Horaires récurrents</h2>
      <p class="planning-sub">C'est la base appliquée par défaut chaque semaine. Utilise la vue par semaine ci-dessous pour ajuster un jour précis.</p>
      <div id="jours-list"></div>
      <button class="btn-save-planning" onclick="saveHoraires()">ENREGISTRER LES HORAIRES</button>
    </div>

    <div class="planning-card">
      <h2 class="planning-title">Vue par semaine</h2>
      <p class="planning-sub">Modifie les horaires d'un jour précis (ex : fermer un mardi, changer une heure) sans toucher à tes horaires récurrents.</p>

      <div class="semaine-nav">
        <button class="semaine-nav-btn" onclick="semainePrecedente()">← Semaine préc.</button>
        <div class="semaine-label" id="semaine-label">
          — <small id="semaine-sublabel"></small>
        </div>
        <button class="semaine-nav-btn" onclick="semaineSuivante()">Semaine suiv. →</button>
      </div>
      <div style="text-align:center;margin-bottom:18px">
        <button class="semaine-today-btn" onclick="allerSemaineActuelle()">Revenir à cette semaine</button>
      </div>

      <div id="semaine-jours-list"></div>
    </div>

  </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script>
<script src="admin.js"></script>
</body>
</html>
