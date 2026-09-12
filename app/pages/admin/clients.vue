<script setup lang="ts">
useSeoMeta({ title: "Applications connectées", robots: "noindex" });
const toast = useToast();
const { siteUrl } = useRuntimeConfig().public;

const { data: clients, refresh } = await useFetch<OAuthClientRow[]>(
  "/api/auth/oauth2/get-clients",
  { headers: useRequestHeaders(["cookie"]), default: () => [] },
);

const issuer = `${siteUrl}/api/auth`;
const endpoints = [
  { label: "Découverte (OIDC)", value: `${issuer}/.well-known/openid-configuration` },
  { label: "Issuer", value: issuer },
  { label: "Autorisation", value: `${issuer}/oauth2/authorize` },
  { label: "Jeton", value: `${issuer}/oauth2/token` },
  { label: "Profil (userinfo)", value: `${issuer}/oauth2/userinfo` },
  { label: "Clés (JWKS)", value: `${issuer}/jwks` },
  { label: "Scopes", value: "openid profile email" },
  { label: "Claim du rôle", value: "role" },
];

const createOpen = ref(false);

async function copy(value: string): Promise<void> {
  await navigator.clipboard.writeText(value);
  toast.add({ title: "Copié" });
}

async function remove(c: OAuthClientRow): Promise<void> {
  const label = c.client_name || c.client_id;
  if (!window.confirm(`Supprimer « ${label} » ? Ses utilisateurs ne pourront plus s’y connecter.`))
    return;
  const { error } = await authClient.oauth2.deleteClient({ client_id: c.client_id });
  if (error) toast.add({ title: "Suppression impossible", color: "error" });
  else toast.add({ title: "Application supprimée" });
  await refresh();
}

function issuedAt(c: OAuthClientRow): string {
  return c.client_id_issued_at
    ? new Date(c.client_id_issued_at * 1000).toLocaleDateString("fr-FR")
    : "";
}
</script>

<template>
  <div class="min-h-screen bg-elevated/40">
    <AdminHeader title="Applications connectées" icon="i-lucide-key-round">
      <UButton icon="i-lucide-plus" @click="createOpen = true">Application</UButton>
    </AdminHeader>

    <UContainer class="space-y-6 py-8">
      <UCard>
        <template #header>
          <h2 class="font-semibold text-highlighted">Ce serveur comme fournisseur d’identité</h2>
          <p class="text-sm text-muted">
            À renseigner dans chaque application (OpenID Connect, flux « authorization code » avec
            PKCE). Le rôle de l’utilisateur arrive dans le jeton d’identité et le profil.
          </p>
        </template>
        <dl class="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
          <template v-for="e in endpoints" :key="e.label">
            <dt class="text-muted">{{ e.label }}</dt>
            <dd class="flex min-w-0 items-center gap-2">
              <code class="truncate font-mono text-xs">{{ e.value }}</code>
              <UButton
                variant="ghost"
                color="neutral"
                size="xs"
                icon="i-lucide-copy"
                aria-label="Copier"
                @click="copy(e.value)"
              />
            </dd>
          </template>
        </dl>
      </UCard>

      <UEmpty
        v-if="clients.length === 0"
        icon="i-lucide-key-round"
        title="Aucune application connectée"
        description="Déclarez une application pour qu’elle puisse connecter les utilisateurs de ce serveur."
      >
        <template #actions>
          <UButton icon="i-lucide-plus" @click="createOpen = true"
            >Déclarer une application</UButton
          >
        </template>
      </UEmpty>

      <UCard v-else :ui="{ body: 'p-0 sm:p-0' }">
        <ul class="divide-y divide-default">
          <li
            v-for="c in clients"
            :key="c.client_id"
            class="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-6"
          >
            <UIcon name="i-lucide-app-window" class="size-5 shrink-0 text-muted" />
            <div class="min-w-0 flex-1">
              <p class="truncate font-medium">{{ c.client_name || "Sans nom" }}</p>
              <p class="flex items-center gap-1 font-mono text-xs text-dimmed">
                <span class="truncate">{{ c.client_id }}</span>
                <UButton
                  variant="link"
                  color="neutral"
                  size="xs"
                  icon="i-lucide-copy"
                  aria-label="Copier l’identifiant"
                  @click="copy(c.client_id)"
                />
              </p>
              <p class="truncate text-xs text-muted">{{ c.redirect_uris.join(" · ") }}</p>
            </div>
            <span class="text-xs text-dimmed">{{ issuedAt(c) }}</span>
            <UButton
              variant="ghost"
              color="error"
              size="xs"
              icon="i-lucide-trash-2"
              aria-label="Supprimer"
              @click="remove(c)"
            />
          </li>
        </ul>
      </UCard>
    </UContainer>

    <OAuthClientModal v-model:open="createOpen" @saved="refresh" />
  </div>
</template>
