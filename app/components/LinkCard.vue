<script setup lang="ts">
const props = defineProps<{ link: Link }>();

const isUrl = computed(() => props.link.kind === "url");
const href = computed(() =>
  isUrl.value ? (props.link.url ?? "#") : `/api/files/${props.link.id}`,
);
const icon = computed(() => (isUrl.value ? "i-lucide-app-window" : fileIcon(props.link.file_mime)));
const meta = computed(() =>
  isUrl.value
    ? hostOf(props.link.url)
    : [fileExtension(props.link.file_name), formatSize(props.link.file_size)]
        .filter(Boolean)
        .join(" · "),
);
</script>

<template>
  <a
    :href="href"
    target="_blank"
    rel="noopener"
    class="group flex gap-4 rounded-xl border border-default bg-default p-4 transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-lg hover:shadow-primary/5 focus-visible:outline-2 focus-visible:outline-primary"
  >
    <span
      class="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
    >
      <UIcon :name="icon" class="size-6" />
    </span>
    <span class="min-w-0 flex-1">
      <span class="flex items-center gap-1.5 font-medium text-highlighted">
        <span class="truncate">{{ link.title }}</span>
        <UIcon
          :name="isUrl ? 'i-lucide-arrow-up-right' : 'i-lucide-download'"
          class="size-4 shrink-0 text-muted opacity-0 transition-opacity group-hover:opacity-100"
        />
      </span>
      <!-- Always one line so every card has the same height, with or without a description. -->
      <span class="mt-1 block truncate text-sm text-muted" :title="link.description ?? undefined">
        {{ link.description || "\u00a0" }}
      </span>
      <span v-if="meta" class="mt-2 block truncate font-mono text-xs text-dimmed">{{ meta }}</span>
    </span>
  </a>
</template>
