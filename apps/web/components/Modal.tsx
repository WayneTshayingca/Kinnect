'use client'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  onSubmit: (e: React.FormEvent) => void
  loading: boolean
  submitLabel: string
  cancelLabel?: string
  children: React.ReactNode
}

// Shared form-modal chrome (overlay, card, header/close button, footer
// Cancel/Submit buttons) — previously duplicated verbatim across
// CreateTaskModal, CreateEventModal, and AddMemberModal.
export default function Modal({
  isOpen,
  onClose,
  title,
  onSubmit,
  loading,
  submitLabel,
  cancelLabel = 'Cancel',
  children,
}: ModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {children}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              {cancelLabel}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 disabled:opacity-50"
            >
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
