// CountUp — from reactbits.dev (JavaScript + CSS variant), copied in
// unmodified per pass 45's "copy-paste, not an npm package" convention (see
// docs/pass-45-plan.md). `motion` is its one real dependency.
import { useInView, useMotionValue, useSpring } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef } from 'react';

export default function CountUp({
  to,
  from = 0,
  direction = 'up',
  delay = 0,
  duration = 2,
  className = '',
  startWhen = true,
  separator = '',
  onStart,
  onEnd
}) {
  const ref = useRef(null);
  const motionValue = useMotionValue(direction === 'down' ? to : from);

  const damping = 20 + 40 * (1 / duration);
  const stiffness = 100 * (1 / duration);

  const springValue = useSpring(motionValue, {
    damping,
    stiffness
  });

  const isInView = useInView(ref, { once: true, margin: '0px' });

  const getDecimalPlaces = num => {
    const str = num.toString();

    if (str.includes('.')) {
      const decimals = str.split('.')[1];

      if (parseInt(decimals) !== 0) {
        return decimals.length;
      }
    }

    return 0;
  };

  const maxDecimals = Math.max(getDecimalPlaces(from), getDecimalPlaces(to));

  // The Intl.NumberFormat *constructor* — not .format() — is the expensive
  // part (locale-data lookup), and the un-memoized original built a fresh one
  // on every single spring tick. At a high refresh rate that's a lot of
  // avoidable per-frame cost, and if the main thread ever falls slightly
  // behind, Motion's spring runs extra catch-up sub-steps per frame to stay
  // time-accurate — meaning more of these constructions crammed into one
  // frame, not fewer. Memoizing it on the same deps as before removes that
  // feedback loop entirely.
  const formatter = useMemo(() => {
    const hasDecimals = maxDecimals > 0;
    return new Intl.NumberFormat('en-US', {
      useGrouping: !!separator,
      minimumFractionDigits: hasDecimals ? maxDecimals : 0,
      maximumFractionDigits: hasDecimals ? maxDecimals : 0
    });
  }, [maxDecimals, separator]);

  const formatValue = useCallback(
    latest => {
      const formattedNumber = formatter.format(latest);
      return separator ? formattedNumber.replace(/,/g, separator) : formattedNumber;
    },
    [formatter, separator]
  );

  useEffect(() => {
    if (ref.current) {
      ref.current.textContent = formatValue(direction === 'down' ? to : from);
    }
  }, [from, to, direction, formatValue]);

  useEffect(() => {
    if (isInView && startWhen) {
      if (typeof onStart === 'function') onStart();

      const timeoutId = setTimeout(() => {
        motionValue.set(direction === 'down' ? from : to);
      }, delay * 1000);

      const durationTimeoutId = setTimeout(
        () => {
          if (typeof onEnd === 'function') onEnd();
        },
        delay * 1000 + duration * 1000
      );

      return () => {
        clearTimeout(timeoutId);
        clearTimeout(durationTimeoutId);
      };
    }
  }, [isInView, startWhen, motionValue, direction, from, to, delay, onStart, onEnd, duration]);

  useEffect(() => {
    const unsubscribe = springValue.on('change', latest => {
      if (!ref.current) return;
      const next = formatValue(latest);
      // The spring ticks continuously, but the displayed string only
      // changes on whole-unit steps (or decimal steps, for a fractional
      // count) — most ticks land on a value that rounds to the same text
      // as the last one. Skipping the write when nothing visible changed
      // avoids a DOM mutation + reflow on every one of those frames.
      if (next === ref.current.textContent) return;
      ref.current.textContent = next;
    });

    return () => unsubscribe();
  }, [springValue, formatValue]);

  return <span className={className} ref={ref} />;
}
