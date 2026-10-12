import type SicBo from '../../../module/LifeSimulation/Casino/SicBo';
import { cardReady } from './PlayingCards';

/** Displays settled dice only; the passage owns rolling and settlement. */
export function sicBoView(game: SicBo): HTMLElement {
  const stage = document.createElement('div');
  stage.className = 'sic-bo-stage';
  stage.setAttribute('role', 'img');
  const dice = [...game.state.dice];
  stage.setAttribute('aria-label', lanSwitch(dice.length ? `Dice: ${dice.join(', ')}` : 'Dice cup: waiting for bets', dice.length ? `骰子：${dice.join('、')}` : '骰盅：等待下注'));
  const animate = game.animateNext && dice.length === 3;
  game.animateNext = false;
  stage.dataset.reveal = animate ? 'pending' : 'ready';
  stage.dataset.empty = String(!dice.length);
  const loads: Promise<unknown>[] = [];
  const picture = (path: string, size: number, fallback: string): HTMLElement => {
    const holder = document.createElement('span');
    holder.className = 'sic-bo-piece';
    const img = document.createElement('img');
    img.width = img.height = size;
    img.alt = '';
    img.draggable = false;
    const text = document.createElement('span');
    text.className = 'sic-bo-fallback';
    text.textContent = fallback;
    holder.append(img, text);
    loads.push(
      Promise.resolve(loadImage(path))
        .then(
          src =>
            new Promise<void>(resolve => {
              img.onload = () => resolve();
              img.onerror = () => {
                holder.classList.add('missing');
                resolve();
              };
              if (!src) {
                holder.classList.add('missing');
                resolve();
                return;
              }
              img.src = src;
              if (img.complete) {
                if (!img.naturalWidth) holder.classList.add('missing');
                resolve();
              }
            })
        )
        .catch(() => {
          holder.classList.add('missing');
        })
    );
    return holder;
  };
  const cup = picture('img/misc/icon/casino/dice/cup.png', 48, lanSwitch('Cup', '骰盅'));
  cup.classList.add('sic-bo-cup');
  const tray = document.createElement('div');
  tray.className = 'sic-bo-tray';
  dice.forEach(value => tray.append(picture(`img/misc/icon/casino/dice/${value}.png`, 30, String(value))));
  stage.append(cup, tray);
  void (async () => {
    // The macro appends this node after the current synchronous call returns.
    await Promise.resolve();
    const controls = stage.closest<HTMLElement>('#deadwood-sic-bo');
    if (!controls) {
      stage.dataset.reveal = 'ready';
      return;
    }
    const motion = animate && !matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!motion) stage.dataset.reveal = 'ready';
    try {
      await cardReady(
        controls,
        loads,
        motion
          ? () => {
              const shake = cup.animate(
                [
                  { transform: 'translateX(0)' },
                  { transform: 'translateX(-5px) rotate(-5deg)' },
                  { transform: 'translateX(5px) rotate(5deg)' },
                  { transform: 'translateX(-4px) rotate(-3deg)' },
                  { transform: 'translateX(0)' }
                ],
                { duration: 500 }
              );
              const reveal = tray.animate([{ opacity: 0 }, { opacity: 1 }], { delay: 500, duration: 160, fill: 'backwards' });
              stage.dataset.reveal = 'ready';
              const settle = Array.from(tray.children).map((die, i) =>
                die.animate([{ transform: 'translateY(-12px) rotate(-8deg)' }, { transform: 'translateY(2px) rotate(3deg)' }, { transform: 'none' }], {
                  delay: 500 + i * 70,
                  duration: 280,
                  fill: 'backwards'
                })
              );
              return [shake, reveal, ...settle];
            }
          : undefined
      );
    } finally {
      stage.dataset.reveal = 'ready';
    }
  })();
  return stage;
}
