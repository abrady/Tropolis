export function startTowerOfHanoi(
  container: HTMLElement,
  count = 4,
  onComplete?: () => void
) {
  container.innerHTML = '';
  container.style.display = 'flex';
  container.style.position = 'relative';

  const pegs: number[][] = [[], [], []];
  for (let i = count; i >= 1; i--) pegs[0].push(i);

  const selected: { disk: number | null; from: number | null } = { disk: null, from: null };

  const pegEls: HTMLDivElement[] = [];

  function render() {
    pegEls.forEach((pegEl, idx) => {
      pegEl.innerHTML = '';
      const disks = pegs[idx];
      disks.forEach(d => {
        const disk = document.createElement('div');
        disk.className = 'disk';
        disk.style.width = 20 + d * 20 + 'px';
        disk.dataset.size = String(d);
        pegEl.appendChild(disk);
      });
    });
  }

  function onPegClick(idx: number) {
    const peg = pegs[idx];
    if (selected.disk === null) {
      if (peg.length === 0) return;
      selected.disk = peg.pop()!;
      selected.from = idx;
    } else {
      const top = peg[peg.length - 1] ?? Infinity;
      if (selected.disk < top) {
        peg.push(selected.disk);
        selected.disk = null;
        selected.from = null;
        if (pegs[2].length === count) {
          if (onComplete) {
            onComplete();
          } else {
            alert('Puzzle complete!');
          }
        }
      } else if (selected.from !== null) {
        pegs[selected.from].push(selected.disk);
        selected.disk = null;
        selected.from = null;
      }
    }
    render();
  }

  for (let i = 0; i < 3; i++) {
    const peg = document.createElement('div');
    peg.className = 'peg';
    peg.onclick = () => onPegClick(i);
    pegEls.push(peg);
    container.appendChild(peg);
  }

  // Add skip button
  const skipButton = document.createElement('button');
  skipButton.textContent = 'Skip Puzzle';
  skipButton.className = 'skip-puzzle-button';
  skipButton.onclick = () => {
    if (onComplete) {
      onComplete();
    }
  };
  container.appendChild(skipButton);

  render();
}
