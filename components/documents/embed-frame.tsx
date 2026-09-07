export function EmbedFrame({ src, title }: { src: string; title: string }) {
  return (
    <div className="overflow-hidden rounded-xl border">
      <iframe
        src={src}
        title={title}
        className="h-[80vh] w-full"
        loading="lazy"
      />
    </div>
  )
}
