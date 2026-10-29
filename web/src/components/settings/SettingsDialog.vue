<script setup lang="ts">
import { Moon, Sun, Volume2, X } from 'lucide-vue-next';
import { onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { Button } from '@/components/ui/button';
import {
  type Theme,
  getSoundOn,
  getTheme,
  getVolume,
  setSoundOn,
  setTheme,
  setVolume,
} from '@/lib/preferences';
import { playSound } from '@/lib/sound';

const emit = defineEmits<{
  close: [];
}>();

const { t } = useI18n();

const theme = ref<Theme>(getTheme());
const soundOn = ref(getSoundOn());
const volume = ref(getVolume());

function selectTheme(next: Theme): void {
  theme.value = next;
  setTheme(next);
}

function toggleSound(): void {
  soundOn.value = !soundOn.value;
  setSoundOn(soundOn.value);
}

function onVolumeInput(event: Event): void {
  volume.value = Number((event.target as HTMLInputElement).value);
  setVolume(volume.value);
}

// 막대를 놓으면 바뀐 음량으로 한 번 들려준다.
function onVolumeChange(): void {
  playSound('normalReward');
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    emit('close');
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown);
});

function themeClass(value: Theme): string {
  return theme.value === value
    ? 'bg-primary text-primary-foreground'
    : 'text-secondary-foreground hover:bg-muted';
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center px-4">
    <button
      type="button"
      class="bg-foreground/40 absolute inset-0"
      :aria-label="t('settings.close')"
      @click="emit('close')"
    />
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
      class="result-pop bg-surface relative z-10 w-full max-w-[380px] rounded-[20px] p-6 shadow-xl"
    >
      <div class="mb-[18px] flex items-center justify-between">
        <h2 id="settings-title" class="text-base font-bold">
          {{ t('settings.title') }}
        </h2>
        <button
          type="button"
          class="text-muted-foreground hover:bg-muted flex size-[30px] items-center justify-center rounded-full"
          :aria-label="t('settings.close')"
          @click="emit('close')"
        >
          <X class="size-4" />
        </button>
      </div>

      <p class="text-muted-foreground mb-2 text-[11px] font-bold">
        {{ t('settings.display') }}
      </p>
      <div
        class="bg-muted mb-[18px] flex items-center justify-between gap-3 rounded-2xl px-3.5 py-3"
      >
        <span class="text-[13px] font-semibold">{{ t('settings.theme') }}</span>
        <div class="bg-surface border-border flex gap-1 rounded-full border p-[3px]">
          <button
            type="button"
            class="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold"
            :class="themeClass('light')"
            :aria-pressed="theme === 'light'"
            @click="selectTheme('light')"
          >
            <Sun class="size-[13px]" />
            {{ t('settings.themeLight') }}
          </button>
          <button
            type="button"
            class="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold"
            :class="themeClass('dark')"
            :aria-pressed="theme === 'dark'"
            @click="selectTheme('dark')"
          >
            <Moon class="size-3" />
            {{ t('settings.themeDark') }}
          </button>
        </div>
      </div>

      <p class="text-muted-foreground mb-2 text-[11px] font-bold">
        {{ t('settings.sound') }}
      </p>
      <div class="bg-muted rounded-2xl px-3.5 py-3">
        <div class="flex items-center justify-between gap-3">
          <span id="settings-sound-label" class="text-[13px] font-semibold">
            {{ t('settings.soundOn') }}
          </span>
          <button
            type="button"
            role="switch"
            :aria-checked="soundOn"
            aria-labelledby="settings-sound-label"
            class="relative h-[22px] w-10 shrink-0 rounded-full transition-colors"
            :class="soundOn ? 'bg-primary' : 'bg-border'"
            @click="toggleSound"
          >
            <span
              class="absolute top-0.5 size-[18px] rounded-full bg-white transition-[left]"
              :class="soundOn ? 'left-5' : 'left-0.5'"
            />
          </button>
        </div>
        <div class="mt-3.5 flex items-center gap-2.5" :class="soundOn ? '' : 'opacity-40'">
          <Volume2 class="text-secondary-foreground size-4 shrink-0" />
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            :value="volume"
            :disabled="!soundOn"
            :aria-label="t('settings.volume')"
            class="accent-primary flex-1"
            @input="onVolumeInput"
            @change="onVolumeChange"
          />
          <span class="text-secondary-foreground w-8 text-right text-xs tabular-nums">
            {{ volume }}
          </span>
        </div>
      </div>

      <p class="text-muted-foreground mt-2.5 text-[11px]">
        {{ t('settings.storedNote') }}
      </p>

      <Button type="button" class="mt-5 w-full" @click="emit('close')">
        {{ t('settings.close') }}
      </Button>
    </div>
  </div>
</template>
