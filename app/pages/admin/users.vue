<script setup lang="ts">
useSeoMeta({ title: "Utilisateurs", robots: "noindex" });
const toast = useToast();

const { data: session } = await useSessionUser();
const me = computed(() => session.value?.user.id);

const { data: page, refresh } = await useFetch<{ users: AdminUser[] }>(
  "/api/auth/admin/list-users",
  {
    query: { limit: 500, sortBy: "name", sortDirection: "asc" },
    headers: useRequestHeaders(["cookie"]),
    default: () => ({ users: [] }),
  },
);
const users = computed(() => page.value.users);

const roleItems = ROLES.map((r) => ({ label: ROLE_LABELS[r], value: r }));

const createOpen = ref(false);
const passwordOpen = ref(false);
const passwordFor = ref<AdminUser | null>(null);
function resetPassword(u: AdminUser): void {
  passwordFor.value = u;
  passwordOpen.value = true;
}

async function setRole(u: AdminUser, role: unknown): Promise<void> {
  if (!isRole(role)) return;
  const { error } = await authClient.admin.setRole({ userId: u.id, role });
  if (error) toast.add({ title: "Changement de rôle impossible", color: "error" });
  else toast.add({ title: `${u.name} est maintenant ${roleLabel(role).toLowerCase()}` });
  await refresh();
}

async function toggleBan(u: AdminUser): Promise<void> {
  const { error } = u.banned
    ? await authClient.admin.unbanUser({ userId: u.id })
    : await authClient.admin.banUser({
        userId: u.id,
        banReason: "Désactivé par un administrateur",
      });
  if (error) toast.add({ title: "Action impossible", color: "error" });
  else toast.add({ title: u.banned ? "Compte réactivé" : "Compte désactivé" });
  await refresh();
}

async function remove(u: AdminUser): Promise<void> {
  if (!window.confirm(`Supprimer le compte de ${u.name} (${u.email}) ?`)) return;
  const { error } = await authClient.admin.removeUser({ userId: u.id });
  if (error) toast.add({ title: "Suppression impossible", color: "error" });
  else toast.add({ title: "Compte supprimé" });
  await refresh();
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}
</script>

<template>
  <div class="min-h-screen bg-elevated/40">
    <AdminHeader title="Utilisateurs" icon="i-lucide-users">
      <UButton icon="i-lucide-user-plus" @click="createOpen = true">Utilisateur</UButton>
    </AdminHeader>

    <UContainer class="space-y-6 py-8">
      <p class="text-sm text-muted">
        Chaque personne a un compte et un rôle. Les administrateurs gèrent le portail, les comptes
        et les applications connectées ; les autres rôles sont transmis aux applications qui se
        connectent via ce serveur.
      </p>

      <UCard :ui="{ body: 'p-0 sm:p-0' }">
        <ul class="divide-y divide-default">
          <li
            v-for="u in users"
            :key="u.id"
            class="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-6"
            :class="{ 'opacity-60': u.banned }"
          >
            <span
              class="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-xs font-semibold text-primary"
            >
              {{ initials(u.name) }}
            </span>
            <div class="min-w-0 flex-1">
              <p class="truncate font-medium">
                {{ u.name }}
                <span v-if="u.id === me" class="text-xs text-dimmed">(vous)</span>
              </p>
              <p class="truncate text-sm text-muted">{{ u.email }}</p>
            </div>
            <UBadge v-if="u.banned" color="error" variant="subtle" size="sm">Désactivé</UBadge>
            <USelect
              :model-value="isRole(u.role) ? u.role : DEFAULT_ROLE"
              :items="roleItems"
              :disabled="u.id === me"
              size="sm"
              class="w-40"
              aria-label="Rôle"
              @update:model-value="setRole(u, $event)"
            />
            <div class="flex items-center gap-1">
              <UButton
                variant="ghost"
                color="neutral"
                size="xs"
                icon="i-lucide-key-round"
                aria-label="Changer le mot de passe"
                @click="resetPassword(u)"
              />
              <UButton
                variant="ghost"
                color="neutral"
                size="xs"
                :icon="u.banned ? 'i-lucide-user-check' : 'i-lucide-user-x'"
                :aria-label="u.banned ? 'Réactiver' : 'Désactiver'"
                :disabled="u.id === me"
                @click="toggleBan(u)"
              />
              <UButton
                variant="ghost"
                color="error"
                size="xs"
                icon="i-lucide-trash-2"
                aria-label="Supprimer"
                :disabled="u.id === me"
                @click="remove(u)"
              />
            </div>
          </li>
        </ul>
      </UCard>
    </UContainer>

    <UserModal v-model:open="createOpen" @saved="refresh" />
    <PasswordModal v-model:open="passwordOpen" :user="passwordFor" />
  </div>
</template>
