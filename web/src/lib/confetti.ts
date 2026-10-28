import confetti from 'canvas-confetti';

/** basic은 일반 완료, crit은 크리티컬 ×2, jackpot은 ×3(대박)이다. */
export type ConfettiKind = 'basic' | 'crit' | 'jackpot';

const FIREWORKS_MS = 1200;
const FIREWORKS_EVERY_MS = 150;

/** 동전 느낌을 내는 금색 세 가지. 진한 금, 밝은 금, 연한 금. */
const COIN_COLORS = ['#b08430', '#d9a441', '#f0c96a'];

let fireworksTimer: ReturnType<typeof setInterval> | undefined;

/** main.css의 색 이름에서 값을 읽는다. 라이트/다크에 따라 값이 바뀐다. */
function cssColors(names: string[]): string[] {
  const style = getComputedStyle(document.documentElement);
  return names.map((name) => style.getPropertyValue(name).trim()).filter(Boolean);
}

/** 일반 완료: 가운데에서 작게 한 번 터진다. */
function fireBasic(): void {
  void confetti({
    particleCount: 25,
    spread: 50,
    startVelocity: 25,
    scalar: 0.7,
    origin: { y: 0.4 },
    colors: cssColors(['--accent', '--gold', '--emo']),
    disableForReducedMotion: true,
  });
}

/** 크리티컬 ×2: 가운데에서 금색 동그라미가 동전처럼 쏟아진다. */
function fireCoins(): void {
  void confetti({
    particleCount: 45,
    spread: 70,
    startVelocity: 35,
    origin: { y: 0.4 },
    shapes: ['circle'],
    scalar: 1.4,
    colors: COIN_COLORS,
    disableForReducedMotion: true,
  });
}

/** 크리티컬 ×3: 짧은 간격으로 화면 양쪽 위에서 폭죽이 연달아 터진다. */
function fireFireworks(): void {
  const colors = cssColors(['--jackpot', '--gold', '--accent', '--intel']);
  const endAt = Date.now() + FIREWORKS_MS;
  clearInterval(fireworksTimer);
  fireworksTimer = setInterval(() => {
    const timeLeft = endAt - Date.now();
    if (timeLeft <= 0) {
      clearInterval(fireworksTimer);
      return;
    }
    const particleCount = Math.round(50 * (timeLeft / FIREWORKS_MS));
    const base = {
      particleCount,
      spread: 360,
      startVelocity: 30,
      ticks: 60,
      colors,
      disableForReducedMotion: true,
    };
    void confetti({
      ...base,
      origin: { x: 0.1 + Math.random() * 0.2, y: Math.random() * 0.4 },
    });
    void confetti({
      ...base,
      origin: { x: 0.7 + Math.random() * 0.2, y: Math.random() * 0.4 },
    });
  }, FIREWORKS_EVERY_MS);
}

export function fireConfetti(kind: ConfettiKind): void {
  if (kind === 'jackpot') {
    fireFireworks();
  } else if (kind === 'crit') {
    fireCoins();
  } else {
    fireBasic();
  }
}

/** 결과 창을 닫을 때 남은 조각과 폭죽을 멈춘다. */
export function clearConfetti(): void {
  clearInterval(fireworksTimer);
  confetti.reset();
}
