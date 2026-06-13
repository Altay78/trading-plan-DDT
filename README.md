# DDT — Plan & discipline de trading

App pour que des membres **définissent leur plan de trading** puis **valident chaque trade** avant d'entrer (gate pré-trade). Pensée pour être dupliquée facilement à plusieurs membres.

**Stack** : Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4.
**Marque** : logo `DDT` chrome (CSS animé, `components/Logo.tsx` + `.chrome-text`). Thème bleu nuit + accent bleu, motion sobre (entrées en cascade, shimmer, hover, sheen).

## Lancer en local

```bash
npm install
npm run dev      # http://localhost:3000
```

## Pages

| Route    | Rôle |
|----------|------|
| `/`      | Accueil — **plan actif** (carte + profil de risque), ou **CTA urgent** si aucun plan |
| `/plan`  | Constructeur **étape par étape** (wizard 7 étapes) : capital, money management, psycho, **confirmations d'entrée**, sessions, **actifs par catégorie + indices conseillés**, puis récap avec **profil de risque** (Prudent/Modéré/Agressif) et **projection & rentabilité** |
| `/login` | Connexion par lien magique (email). Affiche un message si Supabase n'est pas configuré |
| `/trade` | Check pré-trade (gate) : évalue le setup contre le plan → ✅ valide / ⛔ bloqué, avec RR, montant risqué et taille de position. Bouton « Logger ce trade » qui pré-remplit le journal |
| `/journal` | Journal de trades : R calculé auto (entrée/SL/sortie), respect du plan, stats (win rate, R cumulé, R moyen, score de discipline), courbe d'équité en R |

## Architecture

- `lib/plan.ts` — modèle `TradingPlan` (plat, prêt à mapper sur une table Supabase) + catalogues (conditions, émotions, sessions, indices).
- `lib/calc.ts` — `evaluateTrade()` : RR, taille de position, et tous les checks bloquants/avertissements.
- `lib/usePlan.ts` — persistance **locale** (localStorage) pour le MVP. Remplaçable par un fetch Supabase sans toucher aux composants.
- `components/` — UI réutilisable (`Section`, `Field`, `Chip`, `Toggle`, `Badge`, `Nav`).

## Règles du gate (bloquantes)

Actif autorisé · session du plan · état psycho non bloquant · filtre news · confluences ≥ minimum · RR ≥ minimum · trades du jour < max · pertes consécutives < max · perte journalière non atteinte.
Avertissement non bloquant : objectif de gain du jour atteint.

## Connexion & données par membre (Supabase)

L'auth + la persistance par membre sont **codées** (lien magique, RLS). Sans clés, l'app
tourne en **mode local** (localStorage). Pour activer le multi-membres :

1. Crée un projet gratuit sur [supabase.com](https://supabase.com).
2. **SQL Editor** → colle et exécute [`supabase/schema.sql`](supabase/schema.sql) (tables + RLS + rôle mentor).
3. **Authentication → URL Configuration** : Site URL = `http://localhost:3000`, et ajoute `http://localhost:3000/**` aux Redirect URLs (plus l'URL de prod le moment venu).
4. **Project Settings → API** : copie l'URL du projet + la clé `anon`/publishable dans `.env.local` (voir [`.env.local.example`](.env.local.example)). ⚠️ jamais la clé `service_role`.
5. Redémarre `npm run dev`. La page de connexion devient active.
6. Pour te voir en mentor : exécute la requête `update profiles set role='mentor'…` en bas du `schema.sql`.

Mode connecté : le plan vit dans la table `plans` (1 ligne/membre), les trades dans `trades`,
isolés par `user_id` via RLS. Un compte `mentor` peut tout lire (base du futur dashboard).

## Roadmap

1. ✅ **Plan + gate pré-trade** — persistance locale.
2. ✅ **Journal de trades** — résultat en R, respect du plan, score de discipline, courbe d'équité.
3. ✅ **Projection & rentabilité** — win rate d'équilibre + projection sur 30 trades.
4. ✅ **Auth + données par membre (Supabase)** — lien magique, RLS, rôle mentor *(à activer avec les clés)*.
5. **Dashboard mentor** — vue consolidée sur tous les membres (plans, assiduité, perfs).
