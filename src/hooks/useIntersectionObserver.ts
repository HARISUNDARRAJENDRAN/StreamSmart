import { useState, useEffect, useRef, MutableRefObject } from 'react';

// This interface describes the object returned by the hook.
// It's a RefObject (so it has 'current') and also an 'inView' boolean.
interface IntersectionObserverHookRef<T extends Element> extends MutableRefObject<T | null> {
  inView: boolean;
}

export default function useIntersectionObserver<T extends Element>(
  options?: IntersectionObserverInit
): IntersectionObserverHookRef<T> {
  const [inView, setInView] = useState(false);
  const ref = useRef<T | null>(null); // This is the actual ref object

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setInView(entry.isIntersecting);
    }, options);

    const currentElement = ref.current; // Capture current ref value for cleanup

    if (currentElement) {
      observer.observe(currentElement);
    }

    return () => {
      if (currentElement) {
        observer.unobserve(currentElement);
      }
    };
  }, [options]); // Re-run effect if options change

  // To match the existing usage pattern (e.g., aboutRef.inView),
  // we are augmenting the ref object with the 'inView' state.
  // This is a bit unconventional but will make the existing code work.
  const augmentedRef = ref as IntersectionObserverHookRef<T>;
  augmentedRef.inView = inView;

  return augmentedRef;
} 