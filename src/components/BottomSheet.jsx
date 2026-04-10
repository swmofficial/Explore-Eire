// BottomSheet.jsx — Reusable bottom sheet component
// Props: isOpen, onClose, children, minHeight, maxHeight
// TODO: spring animation, drag handle, backdrop, safe-area-inset-bottom
export default function BottomSheet({ isOpen, onClose, children }) {
  if (!isOpen) return null
  return (
    <div className="bottom-sheet">
      <div className="bottom-sheet__handle" />
      {children}
    </div>
  )
}
