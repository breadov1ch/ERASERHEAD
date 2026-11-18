import React, { useRef, useEffect } from 'react';

export default function VerificationCodeInput({
  length = 6,
  value = '',
  onChange,
  onComplete,
  disabled = false,
  hasError = false
}) {
  const inputRefs = useRef([]);

  // Преобразуем строковое значение в массив символов длиной length
  const digits = Array.from({ length }, (_, i) => value[i] || '');

  useEffect(() => {
    // Фокус на первую пустую ячейку при монтировании
    const firstEmptyIndex = digits.findIndex(d => !d);
    const targetIndex = firstEmptyIndex === -1 ? length - 1 : firstEmptyIndex;
    if (inputRefs.current[targetIndex] && !disabled) {
      inputRefs.current[targetIndex].focus();
    }
  }, []);

  const handleChange = (e, index) => {
    const rawVal = e.target.value;
    // Берем только последнюю введенную цифру
    const char = rawVal.replace(/\D/g, '').slice(-1);

    const newDigits = [...digits];
    newDigits[index] = char;
    const combined = newDigits.join('');
    onChange(combined);

    if (char && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    if (combined.length === length && !combined.includes('')) {
      if (onComplete) onComplete(combined);
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        // Если текущая пустая, удаляем предыдущую и переводим фокус
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        onChange(newDigits.join(''));
        inputRefs.current[index - 1]?.focus();
      } else {
        // Удаляем текущую
        const newDigits = [...digits];
        newDigits[index] = '';
        onChange(newDigits.join(''));
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text');
    const cleaned = pasteData.replace(/\D/g, '').slice(0, length);
    if (!cleaned) return;

    onChange(cleaned);

    const focusIdx = Math.min(cleaned.length, length - 1);
    inputRefs.current[focusIdx]?.focus();

    if (cleaned.length === length && onComplete) {
      onComplete(cleaned);
    }
  };

  return (
    <div className={`flex items-center justify-center gap-2 sm:gap-3 my-4 select-none ${hasError ? 'animate-shake' : ''}`}>
      {digits.map((digit, idx) => {
        const isFilled = Boolean(digit);

        return (
          <div key={idx} className="relative">
            <input
              ref={(el) => (inputRefs.current[idx] = el)}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={digit}
              disabled={disabled}
              onChange={(e) => handleChange(e, idx)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              onPaste={handlePaste}
              className={`w-11 h-14 sm:w-14 sm:h-16 text-center font-mono text-2xl sm:text-3xl font-black rounded-none outline-none transition-all duration-200 cursor-pointer ${
                disabled ? 'opacity-40 cursor-not-allowed bg-[#111111]' : 'bg-[#141414]'
              } ${
                hasError
                  ? 'border-2 border-red-500 text-red-400 bg-red-950/20 shadow-[0_0_15px_rgba(239,68,68,0.25)]'
                  : isFilled
                  ? 'border-2 border-white text-white shadow-[0_0_15px_rgba(255,255,255,0.12)]'
                  : 'border border-zinc-700 text-zinc-300 hover:border-zinc-400 focus:border-white focus:ring-1 focus:ring-white/40'
              }`}
            />

            {/* Декоративная точка при пустом поле */}
            {!digit && (
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-zinc-700 text-lg">
                ·
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
