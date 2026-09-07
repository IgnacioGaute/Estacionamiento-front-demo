export function SidebarWatermark() {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex select-none items-end justify-center pb-4 [@media(max-height:850px)]:pb-2 group-data-[collapsible=icon]:hidden"
      >
        <svg
          width={220}
          height={(220 * 72) / 84}
          viewBox="0 0 84 72"
          fill="none"
          className="text-gm-yellow/[0.06] [@media(max-height:850px)]:w-[120px] [@media(max-height:850px)]:h-[103px]"
        >
          <path
            d="M4 68 V10 L26 40 L42 8 L58 40 L80 10 V68"
            stroke="currentColor"
            strokeWidth={10}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 hidden select-none items-end justify-center pb-6 [@media(max-height:850px)]:pb-3 group-data-[collapsible=icon]:flex"
      >
        <span
          className="gm-display text-gm-yellow/[0.06] leading-none text-[22px] tracking-[0.55em] [@media(max-height:850px)]:text-[13px] [@media(max-height:850px)]:tracking-[0.32em]"
          style={{ writingMode: 'vertical-rl' }}
        >
          Estacionamiento
        </span>
      </div>
    </>
  );
}
