<script setup lang="ts">
import type { FormSubmitEvent } from "@nuxt/ui";

const props = defineProps<{ user: AdminUser | null }>();
const open = defineModel<boolean>("open", { default: false });

const state = reactive<PasswordInput>({ password: "" });
const pending = ref(false);
const toast = useToast();

watch(open, (isOpen) => {
  if (isOpen) state.password = "";
});

async function onSubmit(event: FormSubmitEvent<PasswordInput>): Promise<void> {
  if (!props.user) return;
  pending.value = true;
  const { error } = await authClient.admin.setUserPassword({
    userId: props.user.id,
    newPassword: event.data.password,
  });
  pending.value = false;
  if (error) {
    toast.add({ title: "Changement impossible", color: "error" });
    return;
  }
  toast.add({ title: "Mot de passe changé", color: "success" });
  open.value = false;
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Nouveau mot de passe"
    :description="user ? `Pour ${user.name} (${user.email}).` : ''"
  >
    <template #body>
      <UForm
        id="password-form"
        :schema="passwordSchema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField label="Mot de passe" name="password" required hint="12 caractères minimum">
          <UInput
            v-model="state.password"
            type="text"
            class="w-full"
            autofocus
            autocomplete="off"
          />
        </UFormField>
      </UForm>
    </template>
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton color="neutral" variant="ghost" @click="open = false">Annuler</UButton>
        <UButton type="submit" form="password-form" :loading="pending">Enregistrer</UButton>
      </div>
    </template>
  </UModal>
</template>
