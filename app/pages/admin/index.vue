<script setup lang="ts">
definePageMeta({ middleware: "admin" });
useSeoMeta({ title: "Administration", robots: "noindex" });

const { data: messages, refresh } = await useFetch<Message[]>("/api/admin/messages");
const toast = useToast();

async function remove(id: number): Promise<void> {
  await $fetch(`/api/admin/messages/${id}`, { method: "DELETE" });
  toast.add({ title: "Message supprimé", color: "neutral" });
  await refresh();
}

async function logout(): Promise<void> {
  await $fetch("/api/admin/logout", { method: "POST" });
  await navigateTo("/admin/login");
}
</script>

<template>
  <UContainer class="space-y-6 py-10">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold tracking-tight">Messages</h1>
      <UButton variant="ghost" color="neutral" icon="i-lucide-log-out" @click="logout"
        >Déconnexion</UButton
      >
    </div>

    <p v-if="!messages?.length" class="text-muted">Aucun message pour l’instant.</p>

    <UCard v-for="m in messages" :key="m.id">
      <div class="flex items-start justify-between gap-4">
        <div class="min-w-0">
          <p class="font-medium">
            {{ m.name }} <span class="text-muted">· {{ m.email }}</span>
          </p>
          <NuxtTime
            :datetime="m.created_at"
            date-style="medium"
            time-style="short"
            locale="fr-FR"
            class="text-sm text-muted"
          />
        </div>
        <UButton
          variant="ghost"
          color="error"
          icon="i-lucide-trash-2"
          aria-label="Supprimer"
          @click="remove(m.id)"
        />
      </div>
      <p class="mt-3 whitespace-pre-wrap">{{ m.body }}</p>
    </UCard>
  </UContainer>
</template>
