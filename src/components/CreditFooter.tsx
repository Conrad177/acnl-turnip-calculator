export function CreditFooter() {
  return (
    <footer className="mt-1 flex items-center justify-center gap-2 px-2 pt-1 pb-5">
      <img
        src={`${import.meta.env.BASE_URL}conrad.png`}
        alt=""
        width={32}
        height={32}
        className="size-8 rounded-full object-cover"
      />
      <span className="text-[13px] font-medium text-white/95">app by Conrad</span>
    </footer>
  );
}
