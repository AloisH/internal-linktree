<script setup lang="ts">
// Sticky bar shared by the admin pages: section links, page actions, logout.
defineProps<{ title: string; icon: string }>();
const route = useRoute();

const sections = [
  { to: "/admin", label: "Liens", icon: "i-lucide-layout-grid" },
  { to: "/admin/users", label: "Utilisateurs", icon: "i-lucide-users" },
  { to: "/admin/clients", label: "Applications", icon: "i-lucide-key-round" },
];
</script>

<template>
  <header class="sticky top-0 z-10 border-b border-default bg-default/90 backdrop-blur">
    <UContainer class="flex h-16 items-center justify-between gap-4">
      <div class="flex min-w-0 items-center gap-3">
        <UIcon :name="icon" class="size-5 shrink-0 text-primary" />
        <h1 class="truncate text-lg font-semibold tracking-tight">{{ title }}</h1>
      </div>
      <nav class="hidden items-center gap-1 md:flex" aria-label="Sections">
        <UButton
          v-for="s in sections"
          :key="s.to"
          :to="s.to"
          :icon="s.icon"
          size="sm"
          :variant="route.path === s.to ? 'soft' : 'ghost'"
          :color="route.path === s.to ? 'primary' : 'neutral'"
        >
          {{ s.label }}
        </UButton>
      </nav>
      <div class="flex items-center gap-2">
        <slot />
        <UButton
          to="/"
          variant="ghost"
          color="neutral"
          icon="i-lucide-external-link"
          aria-label="Voir le portail"
          class="hidden sm:inline-flex"
        />
        <UButton
          variant="ghost"
          color="neutral"
          icon="i-lucide-log-out"
          aria-label="Déconnexion"
          @click="signOut"
        />
      </div>
    </UContainer>
    <UContainer class="flex gap-1 pb-2 md:hidden">
      <UButton
        v-for="s in sections"
        :key="s.to"
        :to="s.to"
        :icon="s.icon"
        size="xs"
        :variant="route.path === s.to ? 'soft' : 'ghost'"
        :color="route.path === s.to ? 'primary' : 'neutral'"
      >
        {{ s.label }}
      </UButton>
    </UContainer>
  </header>
</template>
