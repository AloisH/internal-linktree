<script setup lang="ts">
import type { FormSubmitEvent } from "@nuxt/ui";

useSeoMeta({
  title: "Accueil",
  description: "internal-linktree — une page, un formulaire, une base SQLite.",
  ogTitle: "internal-linktree",
  ogDescription: "Une page, un formulaire, une base SQLite.",
});

const state = reactive<Partial<MessageInput>>({});
const sending = ref(false);
const toast = useToast();

async function onSubmit(event: FormSubmitEvent<MessageInput>): Promise<void> {
  sending.value = true;
  try {
    await $fetch("/api/messages", { method: "POST", body: event.data });
    toast.add({
      title: "Message envoyé",
      description: "Merci, nous revenons vers vous vite.",
      color: "success",
    });
    Object.assign(state, { name: undefined, email: undefined, body: undefined });
  } catch {
    toast.add({
      title: "Envoi impossible",
      description: "Réessayez dans un instant.",
      color: "error",
    });
  } finally {
    sending.value = false;
  }
}
</script>

<template>
  <UContainer class="flex min-h-screen flex-col justify-center gap-16 py-16">
    <section class="max-w-2xl">
      <p class="font-mono text-sm text-muted">internal-linktree</p>
      <h1 class="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
        Une page. Une base. Rien de plus.
      </h1>
      <p class="mt-6 text-lg text-muted">
        Le petit frère de charpente : Nuxt 4, Nuxt UI, SQLite embarqué et un tableau de bord
        derrière un mot de passe. Remplacez ce texte par le vôtre.
      </p>
    </section>

    <UCard class="max-w-xl">
      <template #header>
        <h2 class="text-lg font-semibold">Nous écrire</h2>
      </template>
      <UForm :schema="messageSchema" :state="state" class="space-y-4" @submit="onSubmit">
        <UFormField label="Nom" name="name">
          <UInput v-model="state.name" class="w-full" autocomplete="name" />
        </UFormField>
        <UFormField label="E-mail" name="email">
          <UInput v-model="state.email" type="email" class="w-full" autocomplete="email" />
        </UFormField>
        <UFormField label="Message" name="body">
          <UTextarea v-model="state.body" class="w-full" :rows="5" />
        </UFormField>
        <UButton type="submit" :loading="sending">Envoyer</UButton>
      </UForm>
    </UCard>
  </UContainer>
</template>
