# SWOO HAIR — mise en route du système de réservation

5 étapes. Compte 20-30 minutes la première fois. Tout est gratuit pour ton volume.

## 1. Créer le projet Supabase

1. Va sur https://supabase.com → crée un compte gratuit → "New project"
2. Choisis un nom (ex: swoo-hair) et un mot de passe de base de données (note-le, tu n'en auras pas besoin après mais garde-le de côté)
3. Attends ~2 min que le projet soit prêt

## 2. Créer la table

1. Dans le menu de gauche : **SQL Editor** → **New query**
2. Colle tout le contenu du fichier `supabase/schema.sql` de ce dossier
3. Clique **Run**

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
3. Décoche "Auto confirm user" n'est pas nécessaire, laisse les réglages par défaut et valide

C'est le SEUL compte qui pourra se connecter à ta page d'administration.

## 5. Envoi automatique des e-mails (Resend + Edge Function)

### 5a. Créer un compte Resend (gratuit, 100 e-mails/jour)
1. https://resend.com → crée un compte
2. **API Keys** → **Create API Key** → copie la clé (commence par `re_...`)
3. Pour envoyer depuis ta propre adresse (ex: reservations@tondomaine.com), il faut vérifier un nom de domaine dans Resend (onglet **Domains**). Si tu n'as pas de nom de domaine, Resend te donne une adresse de test le temps de ta mise en ligne — dis-le moi et j'ajuste le code.

### 5b. Déployer la fonction qui envoie l'e-mail
Ça se fait en ligne de commande, une seule fois. Si tu n'es pas à l'aise avec ça, dis-le moi et on regarde ensemble en visio-équivalent (je te guide commande par commande).

```bash
npm install -g supabase
supabase login
supabase link --project-ref TON-PROJECT-REF   # trouvable dans Settings > General
supabase secrets set RESEND_API_KEY=re_xxxxxxxx
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=xxxx   # Settings > API > service_role (SECRET, ne jamais mettre dans script.js)
supabase secrets set SUPABASE_URL=https://ton-projet.supabase.co
supabase functions deploy send-status-email
```

3. Une fois déployée, Supabase te donne l'URL de la fonction (visible aussi dans **Edge Functions** dans le tableau de bord). Colle-la dans `admin.js` → `EDGE_FUNCTION_URL`.

## Une fois tout branché

- Le site (`index.html`) écrit chaque demande dans Supabase quand la cliente clique "ENVOYER MA DEMANDE DE RÉSERVATION"
- Toi seule, connectée sur `admin.html`, vois les demandes et cliques "ACCEPTER" ou "REFUSER"
- L'e-mail part automatiquement à la cliente à ce moment-là

## Important

- Ne mets jamais la clé `service_role` ni la clé Resend dans `script.js`, `admin.js` ou `index.html` — uniquement dans les secrets Supabase (étape 5b). Ce sont les seules clés vraiment secrètes.
- `admin.html` n'est listé nulle part sur le site public — mais ce n'est pas un vrai coffre-fort, seule la connexion Supabase protège les données. Ne partage jamais ce lien publiquement.
