<script setup lang="ts">
import type { FormSubmitEvent } from "@nuxt/ui";

// Declares an application; the secret is shown once, right after creation.
const emit = defineEmits<{ saved: [] }>();
const open = defineModel<boolean>("open", { default: false });

const hosts = parseInsecureHosts(useRuntimeConfig().public.insecureRedirectHosts);
const kinds = [
  { value: "web", label: "https", description: "Application déployée derrière TLS." },
  {
    value: "native",
    label: "http sur localhost",
    description: "Application en développement sur le poste.",
  },
  ...(hosts.length
    ? [
        {
          value: "insecure",
          label: "http sur le réseau interne",
          description: `Sans chiffrement, sur : ${hosts.join(", ")}.`,
        },
      ]
    : []),
];
const state = reactive<{ client_name: string; redirect_uris: string; kind: RedirectKind }>({
  client_name: "",
  redirect_uris: "",
  kind: "web",
});
const pending = ref(false);
const created = ref<{ client_id: string; client_secret: string } | null>(null);
const toast = useToast();

watch(open, (isOpen) => {
  if (!isOpen) return;
  state.client_name = "";
  state.redirect_uris = "";
  state.kind = "web";
  created.value = null;
});

async function onSubmit(event: FormSubmitEvent<OAuthClientInput>): Promise<void> {
  pending.value = true;
  try {
    created.value = await $fetch<CreatedClient>("/api/admin/oauth-clients", {
      method: "POST",
      body: event.data,
    });
    emit("saved");
  } catch (err) {
    const e = err as { data?: { message?: string; error_description?: string } };
    toast.add({
      title: "Création impossible",
      description: e.data?.error_description ?? e.data?.message,
      color: "error",
    });
  } finally {
    pending.value = false;
  }
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
        <UFormField label="Type d’adresse de retour" name="kind">
          <URadioGroup v-model="state.kind" :items="kinds" />
        </UFormField>
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
