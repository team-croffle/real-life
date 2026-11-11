<script setup lang="ts">
import { List } from '@lucide/vue';
import { StarterKit } from '@tiptap/starter-kit';
import { EditorContent, useEditor } from '@tiptap/vue-3';
import { computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps<{
  modelValue: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
  empty: [value: boolean];
}>();

const { t } = useI18n();

const editor = useEditor({
  content: props.modelValue,
  extensions: [
    StarterKit.configure({
      heading: { levels: [3] },
      blockquote: false,
      codeBlock: false,
      horizontalRule: false,
      orderedList: false,
      italic: false,
      strike: false,
      code: false,
      link: false,
      underline: false,
    }),
  ],
  editorProps: {
    attributes: {
      class:
        'min-h-[140px] px-3.5 py-2.5 text-[13px] leading-[1.55] outline-none [&_h3]:mb-1 [&_h3]:mt-3 [&_h3]:text-[15px] [&_h3]:font-bold [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_p]:my-1',
    },
  },
  onCreate: ({ editor: instance }) => {
    emit('empty', instance.isEmpty);
  },
  onUpdate: ({ editor: instance }) => {
    emit('update:modelValue', instance.getHTML());
    emit('empty', instance.isEmpty);
  },
});

watch(
  () => props.modelValue,
  (next) => {
    const instance = editor.value;
    if (!instance || instance.getHTML() === next) {
      return;
    }
    instance.commands.setContent(next, { emitUpdate: false });
    emit('empty', instance.isEmpty);
  },
);

const headingOn = computed(() => editor.value?.isActive('heading', { level: 3 }) ?? false);
const boldOn = computed(() => editor.value?.isActive('bold') ?? false);
const listOn = computed(() => editor.value?.isActive('bulletList') ?? false);
</script>

<template>
  <div class="border-border bg-muted overflow-hidden rounded-[10px] border">
    <div class="border-border bg-surface flex items-center gap-1 border-b px-2 py-1.5">
      <button
        type="button"
        class="h-7 rounded-md px-2.5 text-[12.5px] font-bold"
        :class="headingOn ? 'bg-accent text-accent-foreground' : 'text-secondary-foreground'"
        :title="t('admin.notice.heading')"
        @click="editor?.chain().focus().toggleHeading({ level: 3 }).run()"
      >
        {{ t('admin.notice.heading') }}
      </button>
      <button
        type="button"
        class="size-7 rounded-md text-[13px] font-extrabold"
        :class="boldOn ? 'bg-accent text-accent-foreground' : 'text-secondary-foreground'"
        :title="t('admin.notice.bold')"
        @click="editor?.chain().focus().toggleBold().run()"
      >
        B
      </button>
      <button
        type="button"
        class="flex size-7 items-center justify-center rounded-md"
        :class="listOn ? 'bg-accent text-accent-foreground' : 'text-secondary-foreground'"
        :title="t('admin.notice.list')"
        @click="editor?.chain().focus().toggleBulletList().run()"
      >
        <List class="size-[15px]" />
      </button>
    </div>
    <EditorContent :editor="editor" />
  </div>
  <p class="text-muted-foreground mt-1.5 text-[11px]">
    {{ t('admin.notice.formatHint') }}
  </p>
</template>
