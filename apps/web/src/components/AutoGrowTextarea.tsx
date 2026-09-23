import { useEffect, useRef } from 'react';

interface AutoGrowTextareaProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onPaste?: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  maxLines?: number;
  className?: string;
  rows?: number;
}

export default function AutoGrowTextarea({
  value,
  onChange,
  onKeyDown,
  onPaste,
  placeholder,
  disabled,
  maxLines = 7,
  className = '',
  rows = 1,
}: AutoGrowTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const computed = getComputedStyle(el);
    const lineHeight = parseFloat(computed.lineHeight) || 20;
    const padding = (parseFloat(computed.paddingTop) || 0) + (parseFloat(computed.paddingBottom) || 0);
    const oneLine = Math.round(lineHeight + padding);
    const maxHeight = Math.round(lineHeight * maxLines + padding);
    el.style.height = 'auto';
    const target = Math.min(Math.max(el.scrollHeight, oneLine), maxHeight);
    el.style.height = `${target}px`;
  }, [value, maxLines]);

  return (
    <textarea
      ref={ref}
      rows={rows}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      onPaste={onPaste}
      placeholder={placeholder}
      disabled={disabled}
      className={`flex-1 resize-none bg-transparent px-2 py-2 text-sm text-white placeholder-white/30 outline-none disabled:opacity-40 ${className}`}
    />
  );
}