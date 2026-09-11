<script setup lang="ts">
import type { LinkModalMode } from "~/components/LinkModal.vue";

definePageMeta({ middleware: "admin" });
useSeoMeta({ title: "Administration", robots: "noindex" });

const { data: catalog, refresh } = await useFetch<CategoryWithLinks[]>("/api/catalog", {
  default: () => [],
});
const { data: site, refresh: refreshSite } = await useFetch<SiteSettings>("/api/site", {
  default: () => ({ logo_version: null }),
});
const toast = useToast();

// ── Category modal ─────────────────────────────────────────────
const categoryOpen = ref(false);
const editingCategory = ref<Category | null>(null);
function newCategory(): void {
  editingCategory.value = null;
  categoryOpen.value = true;
}
function editCategory(c: Category): void {
  editingCategory.value = c;
  categoryOpen.value = true;
}

// ── Link modal ─────────────────────────────────────────────────
const linkOpen = ref(false);
const linkMode = ref<LinkModalMode>("url");
const linkCategoryId = ref<number>();
const editingLink = ref<Link | null>(null);
function newLink(mode: LinkModalMode, categoryId: number): void {
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

// ── Mutations ──────────────────────────────────────────────────
async function run(
  method: "DELETE" | "POST",
  url: string,
  done: string,
  body?: Record<string, unknown>,
): Promise<void> {
  try {
    await $fetch(url, { method, body });
    toast.add({ title: done, color: "neutral" });
  } catch {
    toast.add({ title: "Action impossible", color: "error" });
  }
  await refresh();
}

function removeCategory(c: CategoryWithLinks): void {
  const n = c.links.length;
  const detail = n ? ` et ses ${n} lien${n > 1 ? "s" : ""}` : "";
  if (!window.confirm(`Supprimer « ${c.name} »${detail} ?`)) return;
  void run("DELETE", `/api/admin/categories/${c.id}`, "Catégorie supprimée");
}

function removeLink(l: Link): void {
  if (!window.confirm(`Supprimer « ${l.title} » ?`)) return;
  void run("DELETE", `/api/admin/links/${l.id}`, "Lien supprimé");
}

function swap<T>(list: T[], from: number, to: number): T[] {
  const copy = [...list];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item as T);
  return copy;
}

function moveCategoryTo(from: number, to: number): void {
  const ids = swap(catalog.value, from, to).map((c) => c.id);
  void run("POST", "/api/admin/categories/reorder", "Ordre mis à jour", { ids });
}
function moveCategory(index: number, delta: number): void {
  moveCategoryTo(index, index + delta);
}

function moveLinkTo(c: CategoryWithLinks, from: number, to: number): void {
  const ids = swap(c.links, from, to).map((l) => l.id);
  void run("POST", "/api/admin/links/reorder", "Ordre mis à jour", { ids });
}
function moveLink(c: CategoryWithLinks, index: number, delta: number): void {
  moveLinkTo(c, index, index + delta);
}

// Drag and drop: categories form group 0, the links of category N group N.
const CATEGORIES = 0;
const dnd = useDragReorder<number>((group, from, to) => {
  if (group === CATEGORIES) return moveCategoryTo(from, to);
  const c = catalog.value.find((x) => x.id === group);
  if (c) moveLinkTo(c, from, to);
});

async function logout(): Promise<void> {
  await $fetch("/api/admin/logout", { method: "POST" });
  await navigateTo("/admin/login");
}

function linkMeta(l: Link): string {
  return l.kind === "url" ? hostOf(l.url) : `${l.file_name ?? ""} · ${formatSize(l.file_size)}`;
}
</script>

<template>
  <div class="min-h-screen bg-elevated/40">
    <header class="sticky top-0 z-10 border-b border-default bg-default/90 backdrop-blur">
      <UContainer class="flex h-16 items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <UIcon name="i-lucide-settings-2" class="size-5 text-primary" />
          <h1 class="text-lg font-semibold tracking-tight">Administration</h1>
        </div>
        <div class="flex items-center gap-2">
          <UButton
            to="/"
            target="_blank"
            variant="ghost"
            color="neutral"
            icon="i-lucide-external-link"
            class="hidden sm:inline-flex"
          >
            Voir le portail
          </UButton>
          <UButton icon="i-lucide-plus" @click="newCategory">Catégorie</UButton>
          <UButton
            variant="ghost"
            color="neutral"
            icon="i-lucide-log-out"
            aria-label="Déconnexion"
            @click="logout"
          />
        </div>
      </UContainer>
    </header>

    <UContainer class="space-y-6 py-8">
      <LogoCard :site="site" @saved="refreshSite" />

      <UEmpty
        v-if="catalog.length === 0"
        icon="i-lucide-folder-plus"
        title="Aucune catégorie"
        description="Commencez par créer une catégorie, puis ajoutez-y des applications ou des fichiers."
      >
        <template #actions>
          <UButton icon="i-lucide-plus" @click="newCategory">Créer une catégorie</UButton>
        </template>
      </UEmpty>

      <UCard
        v-for="(c, ci) in catalog"
        :key="c.id"
        :ui="{ body: 'p-0 sm:p-0' }"
        class="transition-[box-shadow,opacity]"
        :class="{
          'ring-2 ring-primary': dnd.isTarget(CATEGORIES, ci),
          'opacity-50': dnd.isDragging(CATEGORIES, ci),
        }"
        @dragover="dnd.onOver(CATEGORIES, ci, $event)"
        @drop.prevent="dnd.onDrop(CATEGORIES, ci)"
      >
        <template #header>
          <div class="flex flex-wrap items-center gap-3">
            <span
              draggable="true"
              class="cursor-grab touch-none text-dimmed hover:text-muted active:cursor-grabbing"
              title="Glisser pour réordonner"
              @dragstart="dnd.onStart(CATEGORIES, ci, $event)"
              @dragend="dnd.onEnd"
            >
              <UIcon name="i-lucide-grip-vertical" class="size-5" />
            </span>
            <span
              class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
            >
              <UIcon :name="c.icon" class="size-5" />
            </span>
            <div class="min-w-0 flex-1">
              <h2 class="truncate font-semibold text-highlighted">{{ c.name }}</h2>
              <p v-if="c.description" class="truncate text-sm text-muted">{{ c.description }}</p>
            </div>
            <div class="flex items-center gap-1">
              <UButton
                variant="ghost"
                color="neutral"
                size="sm"
                icon="i-lucide-chevron-up"
                aria-label="Monter"
                :disabled="ci === 0"
                @click="moveCategory(ci, -1)"
              />
              <UButton
                variant="ghost"
                color="neutral"
                size="sm"
                icon="i-lucide-chevron-down"
                aria-label="Descendre"
                :disabled="ci === catalog.length - 1"
                @click="moveCategory(ci, 1)"
              />
              <UButton
                variant="ghost"
                color="neutral"
                size="sm"
                icon="i-lucide-pencil"
                aria-label="Modifier"
                @click="editCategory(c)"
              />
              <UButton
                variant="ghost"
                color="error"
                size="sm"
                icon="i-lucide-trash-2"
                aria-label="Supprimer"
                @click="removeCategory(c)"
              />
            </div>
          </div>
        </template>

        <ul v-if="c.links.length" class="divide-y divide-default">
          <li
            v-for="(l, li) in c.links"
            :key="l.id"
            class="flex items-center gap-3 px-4 py-3 transition-[box-shadow,opacity] sm:px-6"
            :class="{
              'ring-2 ring-primary ring-inset': dnd.isTarget(c.id, li),
              'opacity-50': dnd.isDragging(c.id, li),
            }"
            @dragover="dnd.onOver(c.id, li, $event)"
            @drop.prevent="dnd.onDrop(c.id, li)"
          >
            <span
              draggable="true"
              class="cursor-grab touch-none text-dimmed hover:text-muted active:cursor-grabbing"
              title="Glisser pour réordonner"
              @dragstart="dnd.onStart(c.id, li, $event)"
              @dragend="dnd.onEnd"
            >
              <UIcon name="i-lucide-grip-vertical" class="size-4" />
            </span>
            <UIcon
              :name="l.kind === 'url' ? 'i-lucide-app-window' : fileIcon(l.file_mime)"
              class="size-5 shrink-0 text-muted"
            />
            <div class="min-w-0 flex-1">
              <p class="truncate font-medium">{{ l.title }}</p>
              <p class="truncate font-mono text-xs text-dimmed">{{ linkMeta(l) }}</p>
            </div>
            <UBadge :color="l.kind === 'url' ? 'primary' : 'neutral'" variant="subtle" size="sm">
              {{ l.kind === "url" ? "Application" : "Fichier" }}
            </UBadge>
            <div class="flex items-center gap-1">
              <UButton
                variant="ghost"
                color="neutral"
                size="xs"
                icon="i-lucide-chevron-up"
                aria-label="Monter"
                :disabled="li === 0"
                @click="moveLink(c, li, -1)"
              />
              <UButton
                variant="ghost"
                color="neutral"
                size="xs"
                icon="i-lucide-chevron-down"
                aria-label="Descendre"
                :disabled="li === c.links.length - 1"
                @click="moveLink(c, li, 1)"
              />
              <UButton
                :to="l.kind === 'url' ? (l.url ?? undefined) : `/api/files/${l.id}`"
                target="_blank"
                variant="ghost"
                color="neutral"
                size="xs"
                icon="i-lucide-external-link"
                aria-label="Ouvrir"
              />
              <UButton
                variant="ghost"
                color="neutral"
                size="xs"
                icon="i-lucide-pencil"
                aria-label="Modifier"
                @click="editLink(l)"
              />
              <UButton
                variant="ghost"
                color="error"
                size="xs"
                icon="i-lucide-trash-2"
                aria-label="Supprimer"
                @click="removeLink(l)"
              />
            </div>
          </li>
        </ul>
        <p v-else class="px-4 py-4 text-sm text-muted sm:px-6">Aucun lien dans cette catégorie.</p>

        <template #footer>
          <div class="flex flex-wrap gap-2">
            <UButton
              size="sm"
              variant="soft"
              icon="i-lucide-app-window"
              @click="newLink('url', c.id)"
            >
              Ajouter une application
            </UButton>
            <UButton
              size="sm"
              variant="soft"
              color="neutral"
              icon="i-lucide-upload"
              @click="newLink('file', c.id)"
            >
              Importer un fichier
            </UButton>
          </div>
        </template>
      </UCard>
    </UContainer>

    <CategoryModal v-model:open="categoryOpen" :category="editingCategory" @saved="refresh" />
    <LinkModal
      v-model:open="linkOpen"
      :mode="linkMode"
      :categories="catalog"
      :category-id="linkCategoryId"
      :link="editingLink"
      @saved="refresh"
    />
  </div>
</template>
