<script setup lang="ts">
import type { FormSubmitEvent } from "@nuxt/ui";

// Declares an application; the secret is shown once, right after creation.
const emit = defineEmits<{ saved: [] }>();
const open = defineModel<boolean>("open", { default: false });

// The OAuth server only lets "web" clients redirect to https; an app under
// development on http://localhost registers as "native" instead.
const state = reactive({ client_name: "", redirect_uris: "", local: false });
const pending = ref(false);
const created = ref<{ client_id: string; client_secret: string } | null>(null);
const toast = useToast();

watch(open, (isOpen) => {
  if (!isOpen) return;
  state.client_name = "";
  state.redirect_uris = "";
  state.local = false;
  created.value = null;
});

async function onSubmit(event: FormSubmitEvent<OAuthClientInput>): Promise<void> {
  pending.value = true;
  const { data, error } = await authClient.oauth2.createClient({
    client_name: event.data.client_name,
    redirect_uris: event.data.redirect_uris,
    application_type: state.local ? "native" : "web",
    token_endpoint_auth_method: "client_secret_basic",
    grant_types: ["authorization_code", "refresh_token"],
  });
  pending.value = false;
  if (error || !data?.client_secret) {
    const detail = (error as { error_description?: string } | null)?.error_description;
    toast.add({ title: "Création impossible", description: detail, color: "error" });
    return;
  }
  created.value = { client_id: data.client_id, client_secret: data.client_secret };
  emit("saved");
}

async function copy(value: string): Promise<void> {
  await navigator.clipboard.writeText(value);
  toast.add({ title: "Copié" });
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="created ? 'Application déclarée' : 'Nouvelle application'"
    :description="
      created
        ? 'Copiez le secret maintenant : il ne sera plus affiché.'
        : 'Une application qui connectera ses utilisateurs via ce serveur.'
    "
  >
    <template #body>
      <dl v-if="created" class="space-y-3 text-sm">
        <div>
          <dt class="text-muted">Identifiant (client_id)</dt>
          <dd class="flex items-center gap-2">
            <code class="truncate font-mono text-xs">{{ created.client_id }}</code>
            <UButton
              variant="ghost"
              color="neutral"
              size="xs"
              icon="i-lucide-copy"
              aria-label="Copier"
              @click="copy(created.client_id)"
            />
          </dd>
        </div>
        <div>
          <dt class="text-muted">Secret (client_secret)</dt>
          <dd class="flex items-center gap-2">
            <code class="truncate font-mono text-xs">{{ created.client_secret }}</code>
            <UButton
              variant="ghost"
              color="neutral"
              size="xs"
              icon="i-lucide-copy"
              aria-label="Copier"
              @click="copy(created.client_secret)"
            />
          </dd>
        </div>
      </dl>
      <UForm
        v-else
        id="client-form"
        :schema="oauthClientSchema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField label="Nom" name="client_name" required>
          <UInput
            v-model="state.client_name"
            class="w-full"
            autofocus
            placeholder="Ex. Planning des examens"
          />
        </UFormField>
        <UFormField
          label="URL de retour"
          name="redirect_uris"
          required
          hint="Une par ligne"
          description="Là où l’application reçoit le code après la connexion (callback)."
        >
          <UTextarea
            v-model="state.redirect_uris"
            class="w-full font-mono text-xs"
            :rows="3"
            placeholder="https://app.example.com/auth/callback"
          />
        </UFormField>
        <UCheckbox
          v-model="state.local"
          label="Application en développement"
          description="Autorise des URL de retour en http://localhost. Sinon, https obligatoire."
        />
      </UForm>
    </template>
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <template v-if="created">
          <UButton @click="open = false">Fermer</UButton>
        </template>
        <template v-else>
          <UButton color="neutral" variant="ghost" @click="open = false">Annuler</UButton>
          <UButton type="submit" form="client-form" :loading="pending">Déclarer</UButton>
        </template>
      </div>
    </template>
  </UModal>
</template>
