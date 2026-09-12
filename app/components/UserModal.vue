<script setup lang="ts">
import type { FormSubmitEvent } from "@nuxt/ui";

const emit = defineEmits<{ saved: [] }>();
const open = defineModel<boolean>("open", { default: false });

const state = reactive<UserCreateInput>({ name: "", email: "", password: "", role: DEFAULT_ROLE });
const pending = ref(false);
const toast = useToast();
const roleItems = ROLES.map((r) => ({ label: ROLE_LABELS[r], value: r }));

watch(open, (isOpen) => {
  if (!isOpen) return;
  Object.assign(state, { name: "", email: "", password: "", role: DEFAULT_ROLE });
});

async function onSubmit(event: FormSubmitEvent<UserCreateInput>): Promise<void> {
  pending.value = true;
  const { error } = await authClient.admin.createUser(event.data);
  pending.value = false;
  if (error) {
    const taken = error.code === "USER_ALREADY_EXISTS";
    toast.add({
      title: taken ? "Cette adresse a déjà un compte" : "Création impossible",
      color: "error",
    });
    return;
  }
  toast.add({ title: "Compte créé", color: "success" });
  open.value = false;
  emit("saved");
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Nouvel utilisateur"
    description="Communiquez-lui le mot de passe ; il pourra être changé ici ensuite."
  >
    <template #body>
      <UForm
        id="user-form"
        :schema="userCreateSchema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField label="Nom" name="name" required>
          <UInput v-model="state.name" class="w-full" autofocus placeholder="Prénom Nom" />
        </UFormField>
        <UFormField label="Adresse e-mail" name="email" required>
          <UInput v-model="state.email" type="email" class="w-full" autocomplete="off" />
        </UFormField>
        <UFormField label="Mot de passe" name="password" required hint="12 caractères minimum">
          <UInput v-model="state.password" type="text" class="w-full" autocomplete="off" />
        </UFormField>
        <UFormField label="Rôle" name="role" required>
          <USelect v-model="state.role" :items="roleItems" class="w-full" />
        </UFormField>
      </UForm>
    </template>
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton color="neutral" variant="ghost" @click="open = false">Annuler</UButton>
        <UButton type="submit" form="user-form" :loading="pending">Créer le compte</UButton>
      </div>
    </template>
  </UModal>
</template>
