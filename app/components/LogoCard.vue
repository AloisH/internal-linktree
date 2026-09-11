<script setup lang="ts">
// Admin card: shows the current organisation logo, replaces or removes it.
const props = defineProps<{ site: SiteSettings }>();
const emit = defineEmits<{ saved: [] }>();

const input = useTemplateRef<HTMLInputElement>("input");
const pending = ref(false);
const toast = useToast();
const current = computed(() => logoUrl(props.site));

function onPick(event: Event): void {
  const el = event.target as HTMLInputElement;
  const f = el.files?.[0];
  el.value = "";
  if (f) void upload(f);
}

async function upload(f: File): Promise<void> {
  pending.value = true;
  try {
    const body = new FormData();
    body.set("file", f, f.name);
    await $fetch("/api/admin/logo", { method: "POST", body });
    toast.add({ title: "Logo mis à jour", color: "success" });
    emit("saved");
  } catch (err) {
    const e = err as { data?: { message?: string } };
    toast.add({
      title: "Import impossible",
      description: e.data?.message ?? "Réessayez dans un instant.",
      color: "error",
    });
  } finally {
    pending.value = false;
  }
}

async function remove(): Promise<void> {
  if (!window.confirm("Retirer le logo ?")) return;
  pending.value = true;
  try {
    await $fetch("/api/admin/logo", { method: "DELETE" });
    toast.add({ title: "Logo retiré", color: "neutral" });
    emit("saved");
  } catch {
    toast.add({ title: "Action impossible", color: "error" });
  } finally {
    pending.value = false;
  }
}
</script>

<template>
  <UCard>
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div
        class="flex h-24 w-full shrink-0 items-center justify-center rounded-lg bg-elevated p-3 sm:w-48"
      >
        <img
          v-if="current"
          :src="current"
          alt="Logo actuel"
          class="max-h-full max-w-full object-contain"
        />
        <span v-else class="flex items-center gap-2 text-sm text-muted">
          <UIcon name="i-lucide-image-off" class="size-4" />
          Aucun logo
        </span>
      </div>
      <div class="min-w-0 flex-1">
        <h2 class="font-semibold text-highlighted">Logo de l’établissement</h2>
        <p class="text-sm text-muted">
          Affiché en tête du portail. PNG, JPG, WebP ou SVG —
          {{ formatSize(MAX_LOGO_SIZE) }} maximum.
        </p>
        <div class="mt-3 flex flex-wrap items-center gap-2">
          <input ref="input" type="file" :accept="LOGO_ACCEPT" class="hidden" @change="onPick" />
          <UButton
            size="sm"
            variant="soft"
            icon="i-lucide-upload"
            :loading="pending"
            @click="input?.click()"
          >
            {{ current ? "Remplacer" : "Importer un logo" }}
          </UButton>
          <UButton
            v-if="current"
            variant="ghost"
            color="error"
            size="sm"
            icon="i-lucide-trash-2"
            :disabled="pending"
            @click="remove"
          >
            Retirer
          </UButton>
        </div>
      </div>
    </div>
  </UCard>
</template>
