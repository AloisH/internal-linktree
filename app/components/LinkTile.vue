<script setup lang="ts">
// Smartphone-style tile: a big icon and the title. Description and file
// details live in the tooltip so the grid stays dense.
const props = defineProps<{ link: Link }>();

const isUrl = computed(() => props.link.kind === "url");
const href = computed(() =>
  isUrl.value ? (props.link.url ?? "#") : `/api/files/${props.link.id}`,
);
const icon = computed(() => (isUrl.value ? "i-lucide-app-window" : fileIcon(props.link.file_mime)));
// The link's own icon (favicon or upload), unless the image fails to load.
const broken = ref(false);
const image = computed(() => (broken.value ? null : linkIconUrl(props.link)));
const ext = computed(() => (isUrl.value ? "" : fileExtension(props.link.file_name)));
const tooltip = computed(() => {
  const meta = isUrl.value
    ? hostOf(props.link.url)
    : [ext.value, formatSize(props.link.file_size)].filter(Boolean).join(" · ");
  return [props.link.title, props.link.description, meta].filter(Boolean).join("\n");
});
</script>

<template>
  <a
    :href="href"
    target="_blank"
    rel="noopener"
    :title="tooltip"
    class="group flex flex-col items-center gap-2 rounded-xl p-3 text-center transition-colors hover:bg-default focus-visible:outline-2 focus-visible:outline-primary"
  >
    <span
      class="relative flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15 transition-transform group-hover:-translate-y-0.5 group-hover:shadow-lg group-hover:shadow-primary/10 sm:size-16"
    >
      <img
        v-if="image"
        :src="image"
        alt=""
        class="size-8 rounded-md object-contain sm:size-9"
        @error="broken = true"
      />
      <UIcon v-else :name="icon" class="size-7 sm:size-8" />
      <span
        v-if="ext"
        class="absolute -right-1 -bottom-1 rounded-md bg-default px-1 font-mono text-[10px] leading-4 font-medium text-muted ring-1 ring-default"
      >
        {{ ext }}
      </span>
    </span>
    <span class="line-clamp-2 w-full text-xs leading-tight font-medium text-highlighted">
      {{ link.title }}
    </span>
  </a>
</template>
