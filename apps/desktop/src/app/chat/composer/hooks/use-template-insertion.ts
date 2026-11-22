import { type RefObject, useEffect, useRef } from 'react'

import { caretOffsetInEditor, insertComposerContentsAtCaret, placeCaretAtOffset } from '../rich-editor'

import { recordComposerUndoPoint } from './use-composer-undo'

export function useTemplateInsertion(editorRef: RefObject<HTMLDivElement | null>, syncDraft: () => string) {
  const caret = useRef<number | null>(null)

  // eslint-disable-next-line no-restricted-syntax -- observes DOM selection events; no reactive values are mirrored
  useEffect(() => {
    const remember = () => {
      const editor = editorRef.current
      const selection = window.getSelection()

      if (editor && selection?.anchorNode && editor.contains(selection.anchorNode)) {
        caret.current = caretOffsetInEditor(editor)
      }
    }

    document.addEventListener('selectionchange', remember)

    return () => document.removeEventListener('selectionchange', remember)
  }, [editorRef])

  return (text: string) => {
    const editor = editorRef.current

    if (!editor || editor.getAttribute('contenteditable') === 'false') {
      return
    }

    recordComposerUndoPoint(editor)
    editor.focus()
    placeCaretAtOffset(editor, caret.current ?? editor.textContent?.length ?? 0)
    insertComposerContentsAtCaret(editor, text)
    syncDraft()
  }
}
