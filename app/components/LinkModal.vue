<script setup lang="ts">
import type { FormSubmitEvent } from "@nuxt/ui";

export type LinkModalMode = "url" | "file" | "edit";

const props = defineProps<{
  mode: LinkModalMode;
  categories: Category[];
  categoryId?: number;
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

const state = reactive<{ category_id: number; title: string; description: string; url: string }>({
  category_id: 0,
  title: "",
  description: "",
  url: "",
});
const file = ref<File | null>(null);
const fileError = ref<string>();
const pending = ref(false);
const toast = useToast();

const categoryItems = computed(() =>
  props.categories.map((c) => ({ label: c.name, value: c.id, icon: c.icon })),
);

watch(open, (isOpen) => {
  if (!isOpen) return;
  state.category_id = props.link?.category_id ?? props.categoryId ?? props.categories[0]?.id ?? 0;
  state.title = props.link?.title ?? "";
  state.description = props.link?.description ?? "";
  state.url = props.link?.url ?? "";
  file.value = null;
  fileError.value = undefined;
});

// Fill the title from the file name when the admin has not typed one yet.
watch(file, (f) => {
  fileError.value = undefined;
  if (f && !state.title.trim()) state.title = f.name.replace(/\.[^.]+$/, "");
});

async function onSubmit(event: FormSubmitEvent<UrlLinkInput | FileLinkInput>): Promise<void> {
  pending.value = true;
  try {
    if (props.link) {
      await $fetch(`/api/admin/links/${props.link.id}`, { method: "PATCH", body: event.data });
    } else if (isFile.value) {
      if (!file.value) {
        fileError.value = "Choisissez un fichier";
        return;
      }
      const body = new FormData();
      body.set("category_id", String(event.data.category_id));
      body.set("title", event.data.title);
      body.set("description", event.data.description ?? "");
      body.set("file", file.value, file.value.name);
      await $fetch("/api/admin/links", { method: "POST", body });
    } else {
      await $fetch("/api/admin/links", { method: "POST", body: event.data });
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
