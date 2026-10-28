import { Howl } from 'howler';

import { getSoundOn, getVolume } from '@/lib/preferences';

export type SoundKind = 'normalReward' | 'criticalX2' | 'criticalX3' | 'levelUp';

/** web/public/sounds 안의 파일. 배포 경로가 바뀌어도 맞도록 BASE_URL을 앞에 붙인다. */
const FILES: Record<SoundKind, string> = {
  normalReward: 'sounds/normal-reward.mp3',
  criticalX2: 'sounds/critical-x2.mp3',
  criticalX3: 'sounds/critical-x3.mp3',
  levelUp: 'sounds/level-up.mp3',
};

const sounds = new Map<SoundKind, Howl>();

function soundOf(kind: SoundKind): Howl {
  let howl = sounds.get(kind);
  if (!howl) {
    howl = new Howl({
      src: [`${import.meta.env.BASE_URL}${FILES[kind]}`],
      preload: true,
    });
    sounds.set(kind, howl);
  }
  return howl;
}

/** 완료 창을 열 때 미리 불러 두면 결과 창에서 바로 소리가 난다. */
export function preloadSounds(): void {
  for (const kind of Object.keys(FILES) as SoundKind[]) {
    soundOf(kind);
  }
}

/** 효과음을 끈 상태면 틀지 않는다. 음량은 설정에서 고른 값을 매번 다시 읽는다. */
export function playSound(kind: SoundKind): void {
  if (!getSoundOn()) {
    return;
  }
  const howl = soundOf(kind);
  howl.volume(getVolume() / 100);
  howl.play();
}
