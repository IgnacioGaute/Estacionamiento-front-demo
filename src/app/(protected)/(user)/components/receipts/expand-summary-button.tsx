'use client';

import { cn } from '@/lib/utils';

interface ExpandSummaryButtonProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function ExpandSummaryButton({ isOpen, onToggle }: ExpandSummaryButtonProps) {
  return (
    <button
      aria-expanded={isOpen}
      className={cn('gm-rc', isOpen && 'open')}
      onClick={onToggle}
    >
      <span className="gm-rc__ico" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" style={{ width: 15, height: 15 }}>
          <rect className="l l1" x="4" y="6"  width="16" height="2.4" rx="1.2" fill="currentColor" />
          <rect className="l l2" x="4" y="11" width="16" height="2.4" rx="1.2" fill="currentColor" />
          <rect className="l l3" x="4" y="16" width="11" height="2.4" rx="1.2" fill="currentColor" />
        </svg>
      </span>
      <span className="gm-rc__lbl">Ver Resumen</span>
      <span
        className="relative z-[1] grid place-items-center w-[13px] transition-transform duration-300"
        style={{ transform: isOpen ? 'rotate(180deg)' : undefined }}
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ width: 13, height: 13 }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </span>
    </button>
  );
}
