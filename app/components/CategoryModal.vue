<script setup lang="ts">
import type { FormSubmitEvent } from "@nuxt/ui";

const props = defineProps<{ category?: Category | null }>();
const emit = defineEmits<{ saved: [] }>();
const open = defineModel<boolean>("open", { default: false });

const state = reactive<{ name: string; description: string; icon: CategoryInput["icon"] }>({
  name: "",
  description: "",
  icon: "i-lucide-folder",
});
const pending = ref(false);
const toast = useToast();

const iconItems = CATEGORY_ICONS.map((icon) => ({
  label: icon.replace("i-lucide-", "").replaceAll("-", " "),
  value: icon,
  icon,
}));

watch(open, (isOpen) => {
  if (!isOpen) return;
  state.name = props.category?.name ?? "";
  state.description = props.category?.description ?? "";
  state.icon = (props.category?.icon as CategoryInput["icon"]) ?? "i-lucide-folder";
});

async function onSubmit(event: FormSubmitEvent<CategoryInput>): Promise<void> {
  pending.value = true;
  try {
    if (props.category) {
      await $fetch(`/api/admin/categories/${props.category.id}`, {
        method: "PATCH",
        body: event.data,
      });
    } else {
      await $fetch("/api/admin/categories", { method: "POST", body: event.data });
    }
    toast.add({
      title: props.category ? "Catégorie modifiée" : "Catégorie créée",
      color: "success",
    });
    open.value = false;
    emit("saved");
  } catch {
    toast.add({ title: "Enregistrement impossible", color: "error" });
  } finally {
    pending.value = false;
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="category ? 'Modifier la catégorie' : 'Nouvelle catégorie'"
    description="Une catégorie regroupe des applications et des documents."
  >
    <template #body>
      <UForm
        id="category-form"
        :schema="categorySchema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField label="Nom" name="name" required>
          <UInput v-model="state.name" class="w-full" autofocus placeholder="Ex. Dossier patient" />
        </UFormField>
        <UFormField label="Description" name="description" hint="Optionnel">
          <UTextarea v-model="state.description" class="w-full" :rows="2" />
        </UFormField>
        <UFormField label="Icône" name="icon">
          <USelect v-model="state.icon" :items="iconItems" :icon="state.icon" class="w-full" />
        </UFormField>
      </UForm>
    </template>
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton color="neutral" variant="ghost" @click="open = false">Annuler</UButton>
        <UButton type="submit" form="category-form" :loading="pending">Enregistrer</UButton>
      </div>
    </template>
  </UModal>
</template>
