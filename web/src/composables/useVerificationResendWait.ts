import { onMounted, onUnmounted, ref, watch, type Ref } from 'vue';

const WAIT_MS = 60_000;

let waitEmail: string | null = null;
let availableAt = 0;

export function startVerificationResendWait(email: string, now = Date.now()): void {
  waitEmail = email;
  availableAt = now + WAIT_MS;
}

export function remainingVerificationResendSeconds(email: string | null, now = Date.now()): number {
  if (!email || waitEmail !== email) {
    return 0;
  }
  return Math.max(0, Math.ceil((availableAt - now) / 1000));
}

export function useVerificationResendWait(email: Ref<string | null>) {
  const remainingSeconds = ref(remainingVerificationResendSeconds(email.value));
  let timer: ReturnType<typeof setInterval> | null = null;

  function sync(): void {
    remainingSeconds.value = remainingVerificationResendSeconds(email.value);
  }

  onMounted(() => {
    sync();
    timer = setInterval(sync, 1000);
  });

  onUnmounted(() => {
    if (timer !== null) {
      clearInterval(timer);
    }
  });

  watch(email, sync);

  return { remainingSeconds, sync };
}
