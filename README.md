# internal-linktree

Portail interne pour un établissement de santé : une page publique qui liste,
par catégorie, les applications métier et les documents de référence, et une
administration derrière un mot de passe pour les gérer.

Généré depuis [cabane](https://github.com/AloisH/cabane) : Nuxt 4, Nuxt UI,
SQLite via `node:sqlite`, une image Docker.

## Fonctionnalités

- **Catégories** — nom, description, icône (liste lucide), ordre manuel.
- **Liens** — une application (URL http/https) ou un fichier importé (PDF,
  images, Office, 25 Mo max). Titre, description, ordre manuel, déplacement
  entre catégories.
- **Portail** — recherche instantanée, navigation par catégorie, PDF et images
  ouverts dans le navigateur, autres fichiers téléchargés sous leur nom d'origine.
- **Administration** (`/admin`) — un mot de passe (`NUXT_ADMIN_TOKEN`), cookie
  httpOnly, limitation des tentatives de connexion.

## Développement

```sh
mise install              # node / pnpm / just épinglés
cp .env.example .env      # puis définir NUXT_ADMIN_TOKEN
pnpm install
just dev                  # http://localhost:3000 — admin sur /admin
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
   - Environment : `NUXT_ADMIN_TOKEN`, `NUXT_PUBLIC_SITE_URL=https://<domaine>`
     (et `NUXT_PUBLIC_SITE_NAME` / `NUXT_PUBLIC_SITE_TAGLINE` au besoin) ;
   - Volumes : volume nommé monté sur `/app/data` (base SQLite + fichiers) ;
   - Domains : le domaine, HTTPS Let's Encrypt — Traefik gère le TLS, le
     `docker-compose.yml` + Caddy du dépôt ne servent que hors Dokploy.
4. Dokploy → Deployments → copier l'URL du webhook ; GitHub → Settings →
   Secrets → `DOKPLOY_WEBHOOK_URL`.

Ensuite chaque `just release patch|minor|major` déploie. Retour arrière :
mettre le tag précédent (`0.1.2`) dans Dokploy et redéployer.

## Configuration

| Variable                   | Rôle                                      | Défaut                  |
| -------------------------- | ----------------------------------------- | ----------------------- |
| `NUXT_ADMIN_TOKEN`         | Mot de passe de `/admin` (12+ caractères) | —                       |
| `NUXT_DB_PATH`             | Fichier SQLite                            | `./data/app.db`         |
| `NUXT_UPLOADS_DIR`         | Dossier des fichiers importés             | `./data/uploads`        |
| `NUXT_PUBLIC_SITE_NAME`    | Nom affiché sur le portail                | `Portail interne`       |
| `NUXT_PUBLIC_SITE_TAGLINE` | Sous-titre du portail                     | voir `.env.example`     |
| `NUXT_PUBLIC_SITE_URL`     | URL canonique                             | `http://localhost:3000` |

Le logo de l'établissement s'importe depuis `/admin` (PNG, JPG, WebP ou SVG,
2 Mo max) et s'affiche en tête du portail ; il vit dans le dossier des fichiers.

En Docker, base et fichiers vivent dans le volume `/app/data`.

## Arborescence

```
app/pages/index.vue            portail public (recherche, catégories, cartes)
app/pages/admin/               connexion + tableau de bord
app/components/                LinkCard, CategoryModal, LinkModal
server/api/catalog.get.ts      lecture publique
server/api/files/[id].get.ts   téléchargement public
server/api/admin/              CRUD catégories et liens, guardé par server/middleware/admin.ts
server/utils/catalog.ts        requêtes SQL pures (testées avec openDb(":memory:"))
server/utils/files.ts          stockage disque des imports
shared/utils/schemas.ts        schémas zod partagés formulaire ↔ API
```
