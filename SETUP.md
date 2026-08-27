# SWOO HAIR — mise en route du système de réservation

5 étapes. Compte 20-30 minutes la première fois. Tout est gratuit pour ton volume.

## 1. Créer le projet Supabase

1. Va sur https://supabase.com → crée un compte gratuit → "New project"
2. Choisis un nom (ex: swoo-hair) et un mot de passe de base de données (note-le, tu n'en auras pas besoin après mais garde-le de côté)
3. Attends ~2 min que le projet soit prêt

## 2. Créer les tables

1. Dans le menu de gauche : **SQL Editor** → **New query**
2. Colle tout le contenu du fichier `supabase/schema.sql` de ce dossier → **Run**
3. Nouvelle requête (**New query**) → colle tout le contenu du fichier `planning-setup.sql` → **Run**

   Ce deuxième script crée les tables qui gèrent ton planning (horaires récurrents + dates bloquées), utilisées par l'onglet "Gérer mon planning" dans `admin.html`.

## 3. Récupérer tes clés publiques et les coller dans le code

1. Menu de gauche : **Settings** → **API**
2. Copie **Project URL** et la clé **anon public**
3. Colle-les à deux endroits (ce sont les MÊMES valeurs dans les deux fichiers) :
   - `script.js` → lignes `SUPABASE_URL` et `SUPABASE_ANON_KEY`
   - `admin.js` → lignes `SUPABASE_URL` et `SUPABASE_ANON_KEY`

Cette clé "anon public" n'est pas un secret — elle est faite pour être visible dans le code du site. C'est normal et sécurisé (la vraie protection vient des règles RLS qu'on a créées à l'étape 2).

## 4. Créer TON compte admin (pour accepter/refuser)

1. Menu de gauche : **Authentication** → **Users** → **Add user** → **Create new user**
2. Mets ton e-mail et un mot de passe à toi (celui que tu utiliseras pour te connecter à `admin.html`)
3. Laisse les réglages par défaut et valide

C'est le SEUL compte qui pourra se connecter à ta page d'administration.

## 5. Envoi automatique des e-mails (EmailJS)

1. https://www.emailjs.com → crée un compte gratuit (200 e-mails/mois)
2. **Email Services** → connecte ton adresse d'envoi (Gmail, Outlook, ou autre) → note l'ID du service généré
3. **Email Templates** → crée un template pour l'acceptation et un pour le refus (variables du type `{{nom}}`, `{{prestation}}`, `{{date_rdv}}`, etc.) → note l'ID de chaque template
4. **Account** → copie ta **Public Key**
5. Colle ces 4 valeurs dans `admin.js` :
   - `EMAILJS_PUBLIC_KEY`
   - `EMAILJS_SERVICE_ID`
   - `EMAILJS_TEMPLATE_CONFIRM`
   - `EMAILJS_TEMPLATE_DECLINE`

Ces identifiants EmailJS sont faits pour être visibles côté client, comme la clé Supabase anon — ce n'est pas un secret à protéger.

## Une fois tout branché

- Le site (`index.html`) écrit chaque demande dans Supabase quand la cliente clique "ENVOYER MA DEMANDE DE RÉSERVATION"
- Toi seule, connectée sur `admin.html`, vois les demandes et cliques "ACCEPTER" ou "REFUSER"
- L'e-mail part automatiquement à la cliente à ce moment-là, via EmailJS
- Dans l'onglet "Gérer mon planning" de `admin.html`, tu définis tes horaires récurrents et tu bloques des dates ponctuelles

## Important

- `admin.html` n'est listé nulle part sur le site public — mais ce n'est pas un vrai coffre-fort, seule la connexion Supabase protège les données. Ne partage jamais ce lien publiquement.
- Aucune clé secrète n'est nécessaire dans ce setup (contrairement à une version avec Resend + Edge Function) : toutes les clés utilisées dans `script.js` et `admin.js` (Supabase anon, EmailJS) sont conçues pour être publiques.
