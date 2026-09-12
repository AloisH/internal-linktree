<script setup lang="ts">
import type { FormSubmitEvent } from "@nuxt/ui";

useSeoMeta({ title: "Connexion", robots: "noindex" });
const { siteName } = useRuntimeConfig().public;
const route = useRoute();

const { data: site } = await useFetch<SiteSettings>("/api/site", {
  default: () => ({ logo_version: null }),
});
const logo = computed(() => logoUrl(site.value));

const state = reactive<LoginInput>({ email: "", password: "" });
const error = ref<string>();
const pending = ref(false);

function message(err: { status?: number; code?: string }): string {
  if (err.status === 429) return "Trop de tentatives, réessayez dans quelques minutes.";
  if (err.code === "BANNED_USER") return "Ce compte est désactivé.";
  return "Adresse ou mot de passe incorrect.";
}

async function onSubmit(event: FormSubmitEvent<LoginInput>): Promise<void> {
  pending.value = true;
  error.value = undefined;
  const { data, error: err } = await authClient.signIn.email(event.data);
  if (err) {
    error.value = message(err);
    pending.value = false;
    return;
  }
  // A login started by another app (OIDC) answers with the URL that resumes
  // its authorization; a plain login goes back where the user was heading.
  const url = (data as { url?: string | null } | null)?.url;
  await navigateTo(url || safeRedirect(route.query.redirect), { external: true });
}
</script>

<template>
  <UContainer class="flex min-h-screen items-center justify-center py-10">
    <UCard class="w-full max-w-sm">
      <template #header>
        <img v-if="logo" :src="logo" :alt="siteName" class="mb-3 h-10 w-auto object-contain" />
        <h1 class="text-lg font-semibold">{{ siteName }}</h1>
        <p class="text-sm text-muted">Connectez-vous avec votre compte professionnel.</p>
      </template>
      <UForm :schema="loginSchema" :state="state" class="space-y-4" @submit="onSubmit">
        <UFormField label="Adresse e-mail" name="email">
          <UInput
            v-model="state.email"
            type="email"
            class="w-full"
            autofocus
            autocomplete="username"
          />
        </UFormField>
        <UFormField label="Mot de passe" name="password">
          <UInput
            v-model="state.password"
            type="password"
            class="w-full"
            autocomplete="current-password"
          />
        </UFormField>
        <UAlert v-if="error" color="error" variant="subtle" :title="error" />
        <UButton type="submit" block :loading="pending">Se connecter</UButton>
      </UForm>
    </UCard>
  </UContainer>
</template>
