export function Drawer({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}) {
  if (!open) return null
  return (
    <div className="fin-drawer-backdrop" onClick={onClose}>
      <div className="fin-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="fin-drawer-header">
          <h3>{title}</h3>
          <button className="fin-drawer-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="fin-drawer-body">{children}</div>
      </div>
    </div>
  )
}
