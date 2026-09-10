<script setup lang="ts">
import type { FormSubmitEvent } from "@nuxt/ui";
import { z } from "zod";

useSeoMeta({ title: "Connexion", robots: "noindex" });

const schema = z.object({ password: z.string().min(1, "Requis") });
type Login = z.infer<typeof schema>;

const state = reactive<Login>({ password: "" });
const error = ref<string>();
const pending = ref(false);

async function onSubmit(event: FormSubmitEvent<Login>): Promise<void> {
  pending.value = true;
  error.value = undefined;
  try {
    await $fetch("/api/admin/login", { method: "POST", body: event.data });
    await navigateTo("/admin");
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode;
    error.value =
      status === 429 ? "Trop de tentatives, réessayez plus tard." : "Mot de passe incorrect.";
  } finally {
    pending.value = false;
  }
}
</script>

<template>
  <UContainer class="flex min-h-screen items-center justify-center">
    <UCard class="w-full max-w-sm">
      <template #header>
        <h1 class="text-lg font-semibold">Administration</h1>
      </template>
      <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
        <UFormField label="Mot de passe" name="password">
          <UInput
            v-model="state.password"
            type="password"
            class="w-full"
            autofocus
            autocomplete="current-password"
          />
        </UFormField>
        <UAlert v-if="error" color="error" variant="subtle" :title="error" />
        <UButton type="submit" block :loading="pending">Se connecter</UButton>
      </UForm>
    </UCard>
  </UContainer>
</template>
