# internal-linktree

Portail interne pour une clinique de radiologie : une page, derrière une
connexion, qui liste par catégorie les applications métier et les documents de
référence ; une administration pour les gérer ; et le serveur d'identité de
l'établissement (Better Auth), auquel les autres applications se connectent en
OpenID Connect.

Généré depuis [cabane](https://github.com/AloisH/cabane) : Nuxt 4, Nuxt UI,
SQLite via `node:sqlite`, une image Docker.

## Fonctionnalités

- **Catégories** — nom, description, icône (liste lucide), ordre manuel.
- **Liens** — une application (URL http/https) ou un fichier importé (PDF,
  images, Office, 25 Mo max). Titre, description, déplacement entre
  catégories. Chacun ajoute les siens depuis le portail (bouton +) en
  choisissant qui les voit : soi-même, un métier (radiologues, manipulateurs,
  secrétaires…) ou tout le monde. Un lien se modifie ou se supprime par celui
  qui l'a créé ou par un admin.
- **Portail** — tuiles façon smartphone, glissées pour composer son propre
  ordre (l'admin fixe l'ordre par défaut), recherche instantanée, navigation
  par catégorie, PDF et images ouverts dans le navigateur, autres fichiers
  téléchargés sous leur nom d'origine.
- **Comptes et rôles** — connexion par e-mail et mot de passe. Chaque
  utilisateur a un rôle : administrateur, radiologue, manipulateur, secrétaire
  ou utilisateur. Les administrateurs gèrent le portail, les comptes
  (`/admin/users`) et les applications connectées (`/admin/clients`).
- **Inscription** (`/signup`) — ouverte aux adresses de l'établissement
  (`NUXT_PUBLIC_SIGNUP_EMAIL_DOMAIN`, ex. `clinique.fr`), avec le rôle
  utilisateur ; un admin promeut ensuite. Sans domaine configuré, seuls les
  admins créent des comptes.
- **Fournisseur d'identité** — les autres applications de la clinique se
  connectent via OpenID Connect (authorization code + PKCE) et reçoivent le
  rôle dans le jeton d'identité et le `userinfo` (claim `role`). Les URLs à
  renseigner sont affichées sur `/admin/clients` ; découverte :
  `<site>/api/auth/.well-known/openid-configuration`.

## Développement

```sh
mise install              # node / pnpm / just épinglés
cp .env.example .env      # NUXT_AUTH_SECRET + le premier admin
pnpm install
just dev                  # http://localhost:3000 — connexion avec NUXT_ADMIN_EMAIL
```

## Commandes

```sh
just lint       # oxfmt + oxlint + nuxt typecheck + knip
just test       # vitest
just build      # nuxt build
just release patch   # tag → CI publie ghcr.io/aloish/internal-linktree et déploie
just deploy     # hors Dokploy : compose pull && up -d sur le serveur
```

## Déploiement (Dokploy)

Le VPS ne construit rien : GitHub Actions construit l'image, la pousse sur
GHCR, puis appelle le webhook de déploiement Dokploy qui tire `:latest`.

Mise en place, une seule fois :

1. `just release patch` — publie la première image sur GHCR.
2. GitHub → Settings → Developer settings → token avec le seul scope
   `read:packages` ; Dokploy → Settings → Registry → `ghcr.io` avec ce token.
3. Dokploy → Application, provider **Docker**, image
   `ghcr.io/aloish/internal-linktree:latest`, port 3000 :
   - Environment : `NUXT_AUTH_SECRET`, `NUXT_ADMIN_EMAIL`, `NUXT_ADMIN_PASSWORD`
     (premier admin, ignorés ensuite), `NUXT_PUBLIC_SITE_URL=https://<domaine>`
     (et `NUXT_PUBLIC_SITE_NAME` / `NUXT_PUBLIC_SITE_TAGLINE` au besoin) ;
   - Volumes : volume nommé monté sur `/app/data` (base SQLite + fichiers) ;
   - Domains : le domaine, HTTPS Let's Encrypt — Traefik gère le TLS, le
     `docker-compose.yml` + Caddy du dépôt ne servent que hors Dokploy.
4. Dokploy → Deployments → copier l'URL du webhook ; GitHub → Settings →
   Secrets → `DOKPLOY_WEBHOOK_URL`.

Ensuite chaque `just release patch|minor|major` déploie. Retour arrière :
mettre le tag précédent (`0.1.2`) dans Dokploy et redéployer.

## Configuration

| Variable                          | Rôle                                                   | Défaut                  |
| --------------------------------- | ------------------------------------------------------ | ----------------------- |
| `NUXT_AUTH_SECRET`                | Signe les sessions et les jetons (32+ caractères)      | —                       |
| `NUXT_ADMIN_EMAIL`                | Premier admin, créé au démarrage si aucun compte       | —                       |
| `NUXT_ADMIN_PASSWORD`             | Son mot de passe (12+ caractères), ignoré ensuite      | —                       |
| `NUXT_DB_PATH`                    | Fichier SQLite                                         | `./data/app.db`         |
| `NUXT_UPLOADS_DIR`                | Dossier des fichiers importés                          | `./data/uploads`        |
| `NUXT_PUBLIC_SIGNUP_EMAIL_DOMAIN` | Domaine d'e-mail admis à l'inscription (vide = fermée) | —                       |
| `NUXT_PUBLIC_SITE_NAME`           | Nom affiché sur le portail                             | `Portail interne`       |
| `NUXT_PUBLIC_SITE_TAGLINE`        | Sous-titre du portail                                  | voir `.env.example`     |
| `NUXT_PUBLIC_SITE_URL`            | URL canonique, base des URLs OpenID Connect (issuer)   | `http://localhost:3000` |

Une application reçoit l'icône de son site (favicon) à la création : le
serveur va la chercher, uniquement sur des adresses publiques. Pour un site
interne injoignable depuis le VPS, l'admin importe l'icône à la main depuis
la fenêtre de modification du lien.

Le logo de l'établissement s'importe depuis `/admin` (PNG, JPG, WebP ou SVG,
2 Mo max) et s'affiche en tête du portail ; il vit dans le dossier des fichiers.

En Docker, base et fichiers vivent dans le volume `/app/data`.

## Arborescence

```
app/pages/index.vue            portail (recherche, catégories, tuiles, ajout et ordre personnel)
app/pages/admin/               catégories, liens partagés, comptes, applications OIDC
app/components/                LinkTile, CategoryModal, LinkModal, UserModal…
server/api/catalog.get.ts      ce que l'utilisateur connecté peut voir, dans son ordre
server/api/links*              ajout, modification, suppression (propriétaire ou admin), ordre personnel
server/api/files/[id].get.ts   téléchargement (session requise)
server/api/admin/              catégories, ordre par défaut, logo — rôle admin (server/middleware/auth.ts)
server/utils/catalog.ts        requêtes SQL pures (testées avec openDb(":memory:"))
server/utils/files.ts          stockage disque des imports
shared/utils/schemas.ts        schémas zod partagés formulaire ↔ API
```
