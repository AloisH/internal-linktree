<script setup lang="ts">
const { siteName, siteTagline } = useRuntimeConfig().public;

useSeoMeta({
  title: "Accueil",
  description: siteTagline,
  ogTitle: siteName,
  ogDescription: siteTagline,
});

const { data: catalog } = await useFetch<CategoryWithLinks[]>("/api/catalog", {
  default: () => [],
});
const { data: site } = await useFetch<SiteSettings>("/api/site", {
  default: () => ({ logo_version: null }),
});
const logo = computed(() => logoUrl(site.value));
const { data: session } = await useSessionUser();
const user = computed(() => session.value?.user ?? null);

const query = ref("");

function matches(link: Link, q: string): boolean {
  return [link.title, link.description, link.file_name, link.url].some((s) =>
    s?.toLowerCase().includes(q),
  );
}

const sections = computed(() => {
  const q = query.value.trim().toLowerCase();
  return catalog.value
    .map((c) => {
      const keepAll = !q || c.name.toLowerCase().includes(q);
      const links = keepAll ? c.links : c.links.filter((l) => matches(l, q));
      return { category: c, links };
    })
    .filter((s) => s.links.length > 0);
});

const total = computed(() => catalog.value.reduce((n, c) => n + c.links.length, 0));
</script>

<template>
  <div class="min-h-screen bg-elevated/40">
    <header class="border-b border-default bg-default/80 backdrop-blur">
      <UContainer class="py-10 sm:py-14">
        <div class="mb-6 flex items-center justify-end gap-2 text-sm">
          <span v-if="user" class="flex min-w-0 items-center gap-2 text-muted">
            <UIcon name="i-lucide-circle-user-round" class="size-5 shrink-0" />
            <span class="truncate">{{ user.name }}</span>
          </span>
          <UButton
            v-if="user?.role === 'admin'"
            to="/admin"
            variant="soft"
            size="sm"
            icon="i-lucide-settings-2"
          >
            Administration
          </UButton>
          <UButton
            variant="ghost"
            color="neutral"
            size="sm"
            icon="i-lucide-log-out"
            aria-label="Déconnexion"
            @click="signOut"
          />
        </div>
        <div class="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div class="max-w-2xl">
            <img
              v-if="logo"
              :src="logo"
              :alt="siteName"
              class="mb-5 h-14 w-auto max-w-60 object-contain object-left sm:h-16"
            />
            <p
              class="flex items-center gap-2 font-mono text-xs tracking-wider text-primary uppercase"
            >
              <UIcon name="i-lucide-heart-pulse" class="size-4" />
              Espace professionnel
            </p>
            <h1 class="mt-3 text-3xl font-semibold tracking-tight text-highlighted sm:text-4xl">
              {{ siteName }}
            </h1>
            <p class="mt-3 text-base text-muted sm:text-lg">{{ siteTagline }}</p>
          </div>
          <UInput
            v-model="query"
            icon="i-lucide-search"
            size="xl"
            placeholder="Rechercher une application ou un document…"
            class="w-full lg:w-96"
            :ui="{ trailing: 'pe-1' }"
          >
            <template v-if="query" #trailing>
              <UButton
                color="neutral"
                variant="link"
                size="sm"
                icon="i-lucide-circle-x"
                aria-label="Effacer"
                @click="query = ''"
              />
            </template>
          </UInput>
        </div>

        <nav v-if="catalog.length > 1" class="mt-8 flex flex-wrap gap-2" aria-label="Catégories">
          <UButton
            v-for="c in catalog"
            :key="c.id"
            :to="`#cat-${c.id}`"
            :icon="c.icon"
            color="neutral"
            variant="soft"
            size="sm"
          >
            {{ c.name }}
          </UButton>
        </nav>
      </UContainer>
    </header>

    <main>
      <UContainer class="space-y-12 py-10 sm:py-14">
        <UEmpty
          v-if="total === 0"
          icon="i-lucide-layout-grid"
          title="Le portail est vide"
          description="Ajoutez des catégories et des liens depuis l’administration."
        />
        <UEmpty
          v-else-if="sections.length === 0"
          icon="i-lucide-search-x"
          title="Aucun résultat"
          :description="`Rien ne correspond à « ${query} ».`"
        />

        <section
          v-for="{ category: c, links } in sections"
          :id="`cat-${c.id}`"
          :key="c.id"
          class="scroll-mt-6"
          :aria-labelledby="`cat-${c.id}-title`"
        >
          <div class="mb-4 flex items-center gap-3">
            <span
              class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
            >
              <UIcon :name="c.icon" class="size-5" />
            </span>
            <div>
              <h2
                :id="`cat-${c.id}-title`"
                class="text-xl font-semibold tracking-tight text-highlighted"
              >
                {{ c.name }}
              </h2>
              <p v-if="c.description" class="text-sm text-muted">{{ c.description }}</p>
            </div>
          </div>
          <div class="grid grid-cols-3 gap-1 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
            <LinkTile v-for="l in links" :key="l.id" :link="l" />
          </div>
        </section>
      </UContainer>
    </main>

    <footer class="border-t border-default">
      <UContainer class="flex items-center justify-between py-6 text-xs text-dimmed">
        <span>{{ siteName }}</span>
        <div class="flex items-center gap-3">
          <NuxtLink v-if="user?.role === 'admin'" to="/admin" class="hover:text-muted">
            Administration
          </NuxtLink>
          <UColorModeButton size="xs" aria-label="Changer de thème" />
        </div>
      </UContainer>
    </footer>
  </div>
</template>
