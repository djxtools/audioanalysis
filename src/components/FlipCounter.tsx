import { useEffect, useState, useRef } from 'react';

interface FlipCounterProps {
  value: number;
}

function FlipDigit({ digit, prevDigit }: { digit: number; prevDigit: number }) {
  const [flipping, setFlipping] = useState(false);
  const prevRef = useRef(prevDigit);

  useEffect(() => {
    if (digit !== prevRef.current) {
      setFlipping(true);
      const timer = setTimeout(() => setFlipping(false), 400);
      prevRef.current = digit;
      return () => clearTimeout(timer);
    }
  }, [digit]);

  return (
    <span className="flip-digit">
      <span className="flip-digit-inner" data-flipping={flipping ? 'true' : 'false'}>
        <span className="flip-digit-current">{digit}</span>
        {flipping && <span className="flip-digit-prev">{prevDigit}</span>}
      </span>
    </span>
  );
}

export default function FlipCounter({ value }: FlipCounterProps) {
  const digits = String(value).split('').map(Number);

  return (
    <div className="flip-counter">
      {digits.map((d, i) => (
        <FlipDigit key={i} digit={d} prevDigit={d} />
      ))}
    </div>
  );
}
