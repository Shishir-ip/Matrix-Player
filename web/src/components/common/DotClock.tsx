import React, { useState, useEffect } from 'react';

export const DotClock: React.FC<{ showSeconds?: boolean; className?: string }> = ({
  showSeconds = true,
  className = '',
}) => {
  const [time, setTime] = useState({ hours: '00', minutes: '00', seconds: '00' });
  const [colonBlink, setColonBlink] = useState(true);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime({
        hours: String(now.getHours()).padStart(2, '0'),
        minutes: String(now.getMinutes()).padStart(2, '0'),
        seconds: String(now.getSeconds()).padStart(2, '0'),
      });
      setColonBlink((b) => !b);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className={`font-doto font-bold text-white tracking-widest inline-flex items-center select-none ${className}`}
    >
      <span>{time.hours}</span>
      <span className={`mx-0.5 text-nothing-red transition-opacity duration-200 ${colonBlink ? 'opacity-100' : 'opacity-20'}`}>
        :
      </span>
      <span>{time.minutes}</span>
      {showSeconds && (
        <>
          <span className={`mx-0.5 text-nothing-red transition-opacity duration-200 ${colonBlink ? 'opacity-100' : 'opacity-20'}`}>
            :
          </span>
          <span className="text-zinc-400">{time.seconds}</span>
        </>
      )}
    </div>
  );
};
