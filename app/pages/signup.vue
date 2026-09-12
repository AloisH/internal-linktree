<script setup lang="ts">
import type { FormSubmitEvent } from "@nuxt/ui";

// Self-registration, limited to the organisation's e-mail domain. The account
// gets the base role; an admin promotes it from /admin/users.
useSeoMeta({ title: "Créer un compte", robots: "noindex" });
const { siteName, signupEmailDomain } = useRuntimeConfig().public;
const domain = normalizeEmailDomain(signupEmailDomain);
const schema = signupSchema(domain);
const route = useRoute();

const state = reactive<SignupInput>({ name: "", email: "", password: "" });
const error = ref<string>();
const pending = ref(false);

function message(err: { status?: number; code?: string }): string {
  if (err.status === 429) return "Trop de tentatives, réessayez dans quelques minutes.";
  if (err.code === "USER_ALREADY_EXISTS") return "Cette adresse a déjà un compte.";
  if (err.code === "EMAIL_DOMAIN_NOT_ALLOWED") return `Utilisez votre adresse @${domain}.`;
  return "Création impossible, réessayez dans un instant.";
}

async function onSubmit(event: FormSubmitEvent<SignupInput>): Promise<void> {
  pending.value = true;
  error.value = undefined;
  const { data, error: err } = await authClient.signUp.email(event.data);
  if (err) {
    error.value = message(err);
    pending.value = false;
    return;
  }
  const url = (data as { url?: string | null } | null)?.url;
  await navigateTo(url || safeRedirect(route.query.redirect), { external: true });
}
</script>

<template>
  <UContainer class="flex min-h-screen items-center justify-center py-10">
    <UCard class="w-full max-w-sm">
      <template #header>
        <h1 class="text-lg font-semibold">{{ siteName }}</h1>
        <p class="text-sm text-muted">
          <template v-if="domain">Créez votre compte avec votre adresse @{{ domain }}.</template>
          <template v-else>La création de compte n’est pas ouverte.</template>
        </p>
      </template>
      <UForm v-if="domain" :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
        <UFormField label="Nom" name="name">
          <UInput
            v-model="state.name"
            class="w-full"
            autofocus
            autocomplete="name"
            placeholder="Prénom Nom"
          />
        </UFormField>
        <UFormField label="Adresse e-mail" name="email">
          <UInput
            v-model="state.email"
            type="email"
            class="w-full"
            autocomplete="username"
            :placeholder="`prenom.nom@${domain}`"
          />
        </UFormField>
        <UFormField label="Mot de passe" name="password" hint="12 caractères minimum">
          <UInput
            v-model="state.password"
            type="password"
            class="w-full"
            autocomplete="new-password"
          />
        </UFormField>
        <UAlert v-if="error" color="error" variant="subtle" :title="error" />
        <UButton type="submit" block :loading="pending">Créer mon compte</UButton>
      </UForm>
      <p v-else class="text-sm text-muted">Demandez un compte à un administrateur.</p>
      <template #footer>
        <p class="text-center text-sm text-muted">
          Déjà un compte ?
          <NuxtLink to="/login" class="font-medium text-primary hover:underline">
            Se connecter
          </NuxtLink>
        </p>
      </template>
    </UCard>
  </UContainer>
</template>
