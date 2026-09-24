import { useState } from 'react'

// Shows the event image, or a placeholder when the URL is empty or fails to load.
export function EventImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) return <div className="image-placeholder">Image not found</div>
  return <img src={src} alt={alt} width={320} height={240} onError={() => setFailed(true)} />
}
