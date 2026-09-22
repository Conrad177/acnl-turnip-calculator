export function CreditFooter() {
  return (
    <footer className="mt-1 flex items-end justify-center gap-2.5 px-2 pt-2 pb-5">
      <img
        src={`${import.meta.env.BASE_URL}conrad.png`}
        alt=""
        width={64}
        height={64}
        className="h-16 w-16 shrink-0 object-contain object-bottom"
      />
      <span className="pb-1.5 text-[13px] font-medium text-white/95">app by Conrad</span>
    </footer>
  );
}
