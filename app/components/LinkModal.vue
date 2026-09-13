<script setup lang="ts">
import type { FormSubmitEvent } from "@nuxt/ui";

export type LinkModalMode = "url" | "file" | "edit";

const props = defineProps<{
  mode: LinkModalMode;
  categories: Category[];
  categoryId?: number;
  /** Audience proposed for a new link. */
  audience?: Audience;
  link?: Link | null;
}>();
const emit = defineEmits<{ saved: [] }>();
const open = defineModel<boolean>("open", { default: false });

const isFile = computed(() => props.mode === "file" || props.link?.kind === "file");
const schema = computed(() => (isFile.value ? fileLinkSchema : urlLinkSchema));
const title = computed(() => {
  if (props.mode === "edit") return "Modifier le lien";
  return props.mode === "file" ? "Importer un fichier" : "Ajouter une application";
});

const state = reactive<{
  category_id: number;
  title: string;
  description: string;
  url: string;
  audience: Audience;
}>({
  category_id: 0,
  title: "",
  description: "",
  url: "",
  audience: "perso",
});
const file = ref<File | null>(null);
const fileError = ref<string>();
const pending = ref(false);
const toast = useToast();

const categoryItems = computed(() =>
  props.categories.map((c) => ({ label: c.name, value: c.id, icon: c.icon })),
);
const audienceItems = AUDIENCES.map((a) => ({
  label: AUDIENCE_LABELS[a],
  value: a,
  icon: audienceIcon(a),
}));

watch(open, (isOpen) => {
  if (!isOpen) return;
  state.category_id = props.link?.category_id ?? props.categoryId ?? props.categories[0]?.id ?? 0;
  state.title = props.link?.title ?? "";
  state.description = props.link?.description ?? "";
  state.url = props.link?.url ?? "";
  state.audience = props.link?.audience ?? props.audience ?? "perso";
  file.value = null;
  fileError.value = undefined;
});

// Fill the title from the file name when the admin has not typed one yet.
watch(file, (f) => {
  fileError.value = undefined;
  if (f && !state.title.trim()) state.title = f.name.replace(/\.[^.]+$/, "");
});

// ── Icon of a url link (edit mode only, acts immediately) ─────
const iconInput = useTemplateRef<HTMLInputElement>("iconInput");
const iconPending = ref(false);
const iconVersion = ref<string | null>(null);
watch(open, (isOpen) => {
  if (isOpen) iconVersion.value = props.link?.icon_version ?? null;
});
const iconUrl = computed(() =>
  props.link ? linkIconUrl({ id: props.link.id, icon_version: iconVersion.value }) : null,
);

async function iconAction(work: () => Promise<Link | null>, done: string): Promise<void> {
  iconPending.value = true;
  try {
    const link = await work();
    iconVersion.value = link?.icon_version ?? null;
    toast.add({ title: done, color: link ? "success" : "neutral" });
    emit("saved");
  } catch (err) {
    const e = err as { data?: { message?: string } };
    toast.add({
      title: "Action impossible",
      description: e.data?.message ?? "Réessayez dans un instant.",
      color: "error",
    });
  } finally {
    iconPending.value = false;
  }
}

function fetchIcon(): void {
  if (!props.link) return;
  const id = props.link.id;
  void iconAction(async () => {
    const r = await $fetch<{ found: boolean; link: Link }>(`/api/links/${id}/icon/refresh`, {
      method: "POST",
    });
    if (!r.found) toast.add({ title: "Aucune icône trouvée sur le site", color: "warning" });
    return r.link;
  }, "Icône mise à jour");
}

function onPickIcon(event: Event): void {
  const el = event.target as HTMLInputElement;
  const f = el.files?.[0];
  el.value = "";
  if (!f || !props.link) return;
  const id = props.link.id;
  void iconAction(() => {
    const body = new FormData();
    body.set("file", f, f.name);
    return $fetch<Link>(`/api/links/${id}/icon`, { method: "POST", body });
  }, "Icône importée");
}

function removeIcon(): void {
  if (!props.link) return;
  const id = props.link.id;
  void iconAction(async () => {
    await $fetch(`/api/links/${id}/icon`, { method: "DELETE" });
    return null;
  }, "Icône retirée");
}

async function onSubmit(event: FormSubmitEvent<UrlLinkInput | FileLinkInput>): Promise<void> {
  pending.value = true;
  try {
    if (props.link) {
      await $fetch(`/api/links/${props.link.id}`, { method: "PATCH", body: event.data });
    } else if (isFile.value) {
      if (!file.value) {
        fileError.value = "Choisissez un fichier";
        return;
      }
      const body = new FormData();
      body.set("category_id", String(event.data.category_id));
      body.set("title", event.data.title);
      body.set("description", event.data.description ?? "");
      body.set("audience", event.data.audience);
      body.set("file", file.value, file.value.name);
      await $fetch("/api/links", { method: "POST", body });
    } else {
      await $fetch("/api/links", { method: "POST", body: event.data });
    }
    toast.add({ title: props.link ? "Lien modifié" : "Lien ajouté", color: "success" });
    open.value = false;
    emit("saved");
  } catch (err) {
    const e = err as { data?: { message?: string } };
    const message = e.data?.message ?? "Réessayez dans un instant.";
    toast.add({ title: "Enregistrement impossible", description: message, color: "error" });
  } finally {
    pending.value = false;
  }
}
</script>

<template>
  <UModal v-model:open="open" :title="title">
    <template #body>
      <UForm id="link-form" :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
        <UFormField label="Catégorie" name="category_id" required>
          <USelect v-model="state.category_id" :items="categoryItems" class="w-full" />
        </UFormField>

        <UFormField v-if="isFile && !link" label="Fichier" name="file" required :error="fileError">
          <UFileUpload
            v-model="file"
            :accept="FILE_ACCEPT"
            label="Déposez un fichier ou cliquez pour parcourir"
            :description="`PDF, images, Office — ${formatSize(MAX_FILE_SIZE)} maximum`"
            class="min-h-40 w-full"
          />
        </UFormField>
        <div
          v-else-if="isFile && link"
          class="flex items-center gap-3 rounded-lg bg-elevated p-3 text-sm"
        >
          <UIcon :name="fileIcon(link.file_mime)" class="size-5 shrink-0 text-primary" />
          <span class="min-w-0 truncate">{{ link.file_name }}</span>
          <span class="ml-auto shrink-0 text-xs text-muted">{{ formatSize(link.file_size) }}</span>
        </div>

        <UFormField label="Titre" name="title" required>
          <UInput
            v-model="state.title"
            class="w-full"
            placeholder="Ex. Dossier patient informatisé"
          />
        </UFormField>

        <UFormField v-if="!isFile" label="Adresse" name="url" required>
          <UInput
            v-model="state.url"
            type="url"
            class="w-full"
            icon="i-lucide-link"
            placeholder="https://"
          />
        </UFormField>

        <UFormField label="Description" name="description" hint="Optionnel">
          <UTextarea v-model="state.description" class="w-full" :rows="2" />
        </UFormField>

        <UFormField
          label="Visible par"
          name="audience"
          required
          hint="Vous et les administrateurs pourrez le modifier"
        >
          <USelect v-model="state.audience" :items="audienceItems" class="w-full" />
        </UFormField>

        <UFormField v-if="link && !isFile" label="Icône" hint="Récupérée sur le site, ou importée">
          <div class="flex items-center gap-3">
            <span
              class="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
            >
              <img v-if="iconUrl" :src="iconUrl" alt="" class="size-7 rounded object-contain" />
              <UIcon v-else name="i-lucide-app-window" class="size-6" />
            </span>
            <input
              ref="iconInput"
              type="file"
              :accept="ICON_ACCEPT"
              class="hidden"
              @change="onPickIcon"
            />
            <div class="flex flex-wrap gap-1">
              <UButton
                size="xs"
                variant="soft"
                icon="i-lucide-refresh-cw"
                :loading="iconPending"
                @click="fetchIcon"
              >
                Depuis le site
              </UButton>
              <UButton
                size="xs"
                variant="soft"
                color="neutral"
                icon="i-lucide-upload"
                :disabled="iconPending"
                @click="iconInput?.click()"
              >
                Importer
              </UButton>
              <UButton
                v-if="iconUrl"
                size="xs"
                variant="ghost"
                color="error"
                icon="i-lucide-trash-2"
                :disabled="iconPending"
                @click="removeIcon"
              >
                Retirer
              </UButton>
            </div>
          </div>
        </UFormField>
      </UForm>
    </template>
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton color="neutral" variant="ghost" @click="open = false">Annuler</UButton>
        <UButton type="submit" form="link-form" :loading="pending">
          {{ link ? "Enregistrer" : isFile ? "Importer" : "Ajouter" }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
