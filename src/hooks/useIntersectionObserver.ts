import { useState, useEffect, useRef, MutableRefObject, useMemo } from 'react';

// This interface describes the object returned by the hook.
// It's a RefObject (so it has 'current') and also an 'inView' boolean.
interface IntersectionObserverHookRef<T extends Element> extends MutableRefObject<T | null> {
  inView: boolean;
}

export default function useIntersectionObserver<T extends Element>(
  options?: IntersectionObserverInit
): IntersectionObserverHookRef<T> {
  const [inView, setInView] = useState(false);
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setInView(entry.isIntersecting);
    }, options);

    const currentElement = ref.current;

    if (currentElement) {
      observer.observe(currentElement);
    }

    return () => {
      if (currentElement) {
        observer.unobserve(currentElement);
      }
    };
  }, [options]);

  // Create a stable augmented ref object using useMemo
  // This avoids the "object is not extensible" error
  const augmentedRef = useMemo(() => {
    const newRef = {
      get current() {
        return ref.current;
      },
      set current(value: T | null) {
        ref.current = value;
      },
      inView: inView
    } as IntersectionObserverHookRef<T>;
    
    // Update inView property
    newRef.inView = inView;
    
    return newRef;
  }, [inView]);

  return augmentedRef;
} 