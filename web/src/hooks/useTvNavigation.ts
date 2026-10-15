import { useEffect } from 'react';
import { triggerHaptic } from '../lib/haptics';

export function useTvNavigation(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null;

      // Handle D-pad directional navigation if no specific input has focus
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
          return;
        }

        const focusables = Array.from(
          document.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [tabindex="0"]:not([disabled]), a[href], input:not([disabled]), [role="button"]:not([disabled])'
          )
        ).filter((el) => {
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).visibility !== 'hidden';
        });

        if (focusables.length === 0) return;

        if (!activeEl || !focusables.includes(activeEl)) {
          focusables[0].focus();
          triggerHaptic('tick');
          e.preventDefault();
          return;
        }

        const currentRect = activeEl.getBoundingClientRect();
        let closestEl: HTMLElement | null = null;
        let minDistance = Infinity;

        focusables.forEach((el) => {
          if (el === activeEl) return;
          const rect = el.getBoundingClientRect();

          let isValidDirection = false;
          let dx = rect.left + rect.width / 2 - (currentRect.left + currentRect.width / 2);
          let dy = rect.top + rect.height / 2 - (currentRect.top + currentRect.height / 2);

          if (e.key === 'ArrowRight' && dx > 10) isValidDirection = true;
          if (e.key === 'ArrowLeft' && dx < -10) isValidDirection = true;
          if (e.key === 'ArrowDown' && dy > 10) isValidDirection = true;
          if (e.key === 'ArrowUp' && dy < -10) isValidDirection = true;

          if (isValidDirection) {
            // Favor items aligned along the axis of movement
            const primaryDist = e.key === 'ArrowRight' || e.key === 'ArrowLeft' ? Math.abs(dx) : Math.abs(dy);
            const secondaryDist = e.key === 'ArrowRight' || e.key === 'ArrowLeft' ? Math.abs(dy) : Math.abs(dx);
            const distance = primaryDist + secondaryDist * 2.2;

            if (distance < minDistance) {
              minDistance = distance;
              closestEl = el;
            }
          }
        });

        if (closestEl) {
          (closestEl as HTMLElement).focus();
          (closestEl as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
          triggerHaptic('tick');
          e.preventDefault();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled]);
}
