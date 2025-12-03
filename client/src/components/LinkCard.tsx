// client/src/components/LinkCard.tsx

export default function LinkCard({
  href,
  img,
  label,
  alt,
}: {
  href?: string;
  img: string;
  label?: string;
  alt: string;
}) {
  return (
    <button
      type="button"
      onClick={() => href && window.open(href, "_blank", "noopener")}
      className="border rounded-2xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-neutral-50 select-none w-full cursor-pointer"
    >
      <img src={img} alt={alt} className="w-8 h-8 object-contain" />
      {label && <div className="text-sm text-center leading-tight">{label}</div>}
    </button>
  );
}
