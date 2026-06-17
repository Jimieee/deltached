import { gsap } from "gsap";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(SplitText);

const SELECTOR = '[data-animate="font-weight"]';
const MEDIA_QUERY = "(min-width: 768px)";

type Cleanup = () => void;

let cleanup: Cleanup | null = null;

function getNumberAttribute(
  element: HTMLElement,
  attribute: string,
  fallback: number,
) {
  const value = Number(element.dataset[attribute]);

  return Number.isFinite(value) ? value : fallback;
}

export function initFontWeightProximity() {
  cleanup?.();

  const elements = gsap.utils.toArray<HTMLElement>(SELECTOR);

  if (elements.length === 0) {
    cleanup = null;
    return;
  }

  const media = gsap.matchMedia();

  media.add(MEDIA_QUERY, () => {
    const instances = elements.map((element) => {
      const split = SplitText.create(element, {
        type: "words,chars",
        charsClass: "char",
      });

      const maxDistance = getNumberAttribute(element, "weightDistance", 300);

      const minWeight = getNumberAttribute(element, "weightMin", 300);

      const maxWeight = getNumberAttribute(element, "weightMax", 800);

      const setters = split.chars.map((char) =>
        gsap.quickTo(char, "fontWeight", {
          duration: 0.35,
          ease: "power2.out",
        }),
      );

      return {
        split,
        chars: split.chars,
        setters,
        maxDistance,
        minWeight,
        maxWeight,
      };
    });

    let frameId: number | null = null;
    let pointerX = 0;
    let pointerY = 0;

    const update = () => {
      for (const instance of instances) {
        instance.chars.forEach((char, index) => {
          const rect = char.getBoundingClientRect();

          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;

          const distance = Math.hypot(pointerX - centerX, pointerY - centerY);

          const clampedDistance = Math.min(distance, instance.maxDistance);

          const fontWeight = gsap.utils.mapRange(
            0,
            instance.maxDistance,
            instance.maxWeight,
            instance.minWeight,
            clampedDistance,
          );

          instance.setters[index](fontWeight);
        });
      }

      frameId = null;
    };

    const handlePointerMove = (event: PointerEvent) => {
      pointerX = event.clientX;
      pointerY = event.clientY;

      if (frameId === null) {
        frameId = requestAnimationFrame(update);
      }
    };

    document.addEventListener("pointermove", handlePointerMove, {
      passive: true,
    });

    return () => {
      document.removeEventListener("pointermove", handlePointerMove);

      if (frameId !== null) {
        cancelAnimationFrame(frameId);
      }

      instances.forEach(({ split }) => {
        split.revert();
      });
    };
  });

  cleanup = () => {
    media.revert();
    cleanup = null;
  };
}

export function destroyFontWeightProximity() {
  cleanup?.();
}
