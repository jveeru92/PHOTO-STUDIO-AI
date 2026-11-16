import { cn } from '@/lib/utils';

interface SliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  disabled?: boolean;
}

export function Slider({ value, onChange, min = 0, max = 100, step = 1, className, disabled }: SliderProps) {
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onInput={(e) => onChange(Number((e.target as HTMLInputElement).value))}
      disabled={disabled}
      className={cn(
        'w-full h-2 bg-[var(--color-neutral-300)] rounded-lg appearance-none cursor-pointer',
        'accent-[var(--color-accent)] focus:outline-none',
        disabled && 'opacity-50 cursor-not-allowed',
        className,
      )}
    />
  );
}
