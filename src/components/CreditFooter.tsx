export function CreditFooter() {
  return (
    <footer className="mt-1 flex w-full items-center justify-center gap-1.5 px-2 pt-1 pb-4">
      <img
        src={`${import.meta.env.BASE_URL}conrad.png`}
        alt=""
        width={32}
        height={32}
        className="size-8 shrink-0 object-contain"
      />
      <span className="text-[13px] font-medium leading-none text-white/95">app by Conrad</span>
    </footer>
  );
}
