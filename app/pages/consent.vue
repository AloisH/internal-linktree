<script setup lang="ts">
// Shown by the OIDC flow the first time an application asks to sign this
// user in. Accepting sends the browser back to the application with a code.
useSeoMeta({ title: "Autorisation", robots: "noindex" });
const route = useRoute();
const toast = useToast();

const clientId = computed(() => String(route.query.client_id ?? ""));
const scopes = computed(() =>
  String(route.query.scope ?? "")
    .split(" ")
    .filter(Boolean),
);

const SCOPE_LABELS: Record<string, string> = {
  openid: "Votre identifiant",
  profile: "Votre nom",
  email: "Votre adresse e-mail",
  offline_access: "Rester connecté sans ressaisir le mot de passe",
};

const { data: client } = await useFetch<{ client_name?: string | null }>(
  "/api/auth/oauth2/public-client",
  { query: { client_id: clientId }, headers: useRequestHeaders(["cookie"]) },
);
const clientName = computed(() => client.value?.client_name || "Une application");

const pending = ref(false);
async function answer(accept: boolean): Promise<void> {
  pending.value = true;
  const { data, error } = await authClient.oauth2.consent({ accept });
  const reply = data as { url?: string; redirect_uri?: string } | null;
  const url = reply?.url ?? reply?.redirect_uri;
  if (error || !url) {
    pending.value = false;
    toast.add({ title: "Demande expirée, recommencez depuis l’application.", color: "error" });
    return;
  }
  await navigateTo(url, { external: true });
}
</script>

<template>
  <UContainer class="flex min-h-screen items-center justify-center py-10">
    <UCard class="w-full max-w-md">
      <template #header>
        <h1 class="text-lg font-semibold">{{ clientName }}</h1>
        <p class="text-sm text-muted">souhaite vous connecter avec votre compte.</p>
      </template>
      <p class="mb-3 text-sm font-medium">L’application recevra :</p>
      <ul class="space-y-2 text-sm">
        <li v-for="s in scopes" :key="s" class="flex items-center gap-2">
          <UIcon name="i-lucide-check" class="size-4 text-primary" />
          {{ SCOPE_LABELS[s] ?? s }}
        </li>
        <li class="flex items-center gap-2">
          <UIcon name="i-lucide-check" class="size-4 text-primary" />
          Votre rôle dans l’établissement
        </li>
      </ul>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" :disabled="pending" @click="answer(false)">
            Refuser
          </UButton>
          <UButton :loading="pending" @click="answer(true)">Autoriser</UButton>
        </div>
      </template>
    </UCard>
  </UContainer>
</template>
