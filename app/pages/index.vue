<script setup lang="ts">
import type { DropdownMenuItem } from "@nuxt/ui";
import type { LinkModalMode } from "~/components/LinkModal.vue";

const { siteName, siteTagline } = useRuntimeConfig().public;

useSeoMeta({
  title: "Accueil",
  description: siteTagline,
  ogTitle: siteName,
  ogDescription: siteTagline,
});

const { data: catalog, refresh } = await useFetch<CategoryWithLinks[]>("/api/catalog", {
  headers: useRequestHeaders(["cookie"]),
  default: () => [],
});
const { data: site } = await useFetch<SiteSettings>("/api/site", {
  default: () => ({ logo_version: null }),
});
const logo = computed(() => logoUrl(site.value));
const { data: session } = await useSessionUser();
const user = computed(() => session.value?.user ?? null);
const toast = useToast();

const query = ref("");

function matches(link: Link, q: string): boolean {
  return [link.title, link.description, link.file_name, link.url].some((s) =>
    s?.toLowerCase().includes(q),
  );
}

/** Categories holding at least one link this user sees. */
const populated = computed(() => catalog.value.filter((c) => c.links.length > 0));

const sections = computed(() => {
  const q = query.value.trim().toLowerCase();
  return populated.value
    .map((c) => {
      const keepAll = !q || c.name.toLowerCase().includes(q);
      const links = keepAll ? c.links : c.links.filter((l) => matches(l, q));
      return { category: c, links };
    })
    .filter((s) => s.links.length > 0);
});

const total = computed(() => catalog.value.reduce((n, c) => n + c.links.length, 0));

// ── Add, edit, delete ──────────────────────────────────────────
const linkOpen = ref(false);
const linkMode = ref<LinkModalMode>("url");
const linkCategoryId = ref<number>();
const editingLink = ref<Link | null>(null);
function newLink(mode: LinkModalMode, categoryId?: number): void {
  linkMode.value = mode;
  linkCategoryId.value = categoryId;
  editingLink.value = null;
  linkOpen.value = true;
}
function editLink(l: Link): void {
  linkMode.value = "edit";
  editingLink.value = l;
  linkOpen.value = true;
}
function addItems(categoryId?: number): DropdownMenuItem[][] {
  return [
    [
      {
        label: "Une application",
        icon: "i-lucide-app-window",
        onSelect: () => newLink("url", categoryId),
      },
      { label: "Un fichier", icon: "i-lucide-upload", onSelect: () => newLink("file", categoryId) },
    ],
  ];
}

function canManage(l: Link): boolean {
  return user.value !== null && canManageLink(l, user.value);
}

async function removeLink(l: Link): Promise<void> {
  if (!window.confirm(`Supprimer « ${l.title} » ?`)) return;
  try {
    await $fetch(`/api/links/${l.id}`, { method: "DELETE" });
    toast.add({ title: "Lien supprimé", color: "neutral" });
  } catch {
    toast.add({ title: "Suppression impossible", color: "error" });
  }
  await refresh();
}

// ── Drag and drop: each user orders their own tiles, per category ─
const canDrag = computed(() => query.value.trim() === "");
const dnd = useDragReorder<number>(async (categoryId, from, to) => {
  const c = catalog.value.find((x) => x.id === categoryId);
  if (!c) return;
  const links = [...c.links];
  const [item] = links.splice(from, 1);
  links.splice(to, 0, item as Link);
  c.links = links;
  try {
    await $fetch("/api/links/reorder", { method: "POST", body: { ids: links.map((l) => l.id) } });
  } catch {
    toast.add({ title: "Ordre non enregistré", color: "error" });
  }
  await refresh();
});
</script>

<template>
  <div class="min-h-screen bg-elevated/40">
    <header class="border-b border-default bg-default/80 backdrop-blur">
      <UContainer class="py-10 sm:py-14">
        <div class="mb-6 flex items-center justify-end gap-2 text-sm">
          <span v-if="user" class="flex min-w-0 items-center gap-2 text-muted">
            <UIcon name="i-lucide-circle-user-round" class="size-5 shrink-0" />
            <span class="truncate">{{ user.name }}</span>
            <UBadge v-if="user.role" color="neutral" variant="subtle" size="sm">
              {{ roleLabel(user.role) }}
            </UBadge>
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
          <div class="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
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
            <UDropdownMenu :items="addItems()" :content="{ align: 'end' }">
              <UButton
                icon="i-lucide-plus"
                size="xl"
                class="shrink-0 justify-center"
                :disabled="catalog.length === 0"
              >
                Ajouter
              </UButton>
            </UDropdownMenu>
          </div>
        </div>

        <nav v-if="populated.length > 1" class="mt-8 flex flex-wrap gap-2" aria-label="Catégories">
          <UButton
            v-for="c in populated"
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
          title="Votre portail est vide"
          :description="
            catalog.length
              ? 'Ajoutez vos applications et vos documents : pour vous seul, pour un métier ou pour tout le monde.'
              : 'Un administrateur doit d’abord créer une catégorie.'
          "
        >
          <template v-if="catalog.length" #actions>
            <UDropdownMenu :items="addItems()">
              <UButton icon="i-lucide-plus">Ajouter</UButton>
            </UDropdownMenu>
          </template>
        </UEmpty>
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
            <div class="min-w-0 flex-1">
              <h2
                :id="`cat-${c.id}-title`"
                class="text-xl font-semibold tracking-tight text-highlighted"
              >
                {{ c.name }}
              </h2>
              <p v-if="c.description" class="text-sm text-muted">{{ c.description }}</p>
            </div>
            <UDropdownMenu :items="addItems(c.id)" :content="{ align: 'end' }">
              <UButton
                variant="ghost"
                color="neutral"
                size="sm"
                icon="i-lucide-plus"
                :aria-label="`Ajouter dans ${c.name}`"
              />
            </UDropdownMenu>
          </div>
          <div class="grid grid-cols-3 gap-1 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
            <LinkTile
              v-for="(l, li) in links"
              :key="l.id"
              :link="l"
              :editable="canManage(l)"
              :draggable="canDrag"
              class="rounded-xl transition-[box-shadow,opacity]"
              :class="{
                'cursor-grab active:cursor-grabbing': canDrag,
                'ring-2 ring-primary': dnd.isTarget(c.id, li),
                'opacity-40': dnd.isDragging(c.id, li),
              }"
              @dragstart="dnd.onStart(c.id, li, $event)"
              @dragover="dnd.onOver(c.id, li, $event)"
              @drop.prevent="dnd.onDrop(c.id, li)"
              @dragend="dnd.onEnd"
              @edit="editLink(l)"
              @remove="removeLink(l)"
            />
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

    <LinkModal
      v-model:open="linkOpen"
      :mode="linkMode"
      :categories="catalog"
      :category-id="linkCategoryId"
      audience="perso"
      :link="editingLink"
      @saved="refresh"
    />
  </div>
</template>
