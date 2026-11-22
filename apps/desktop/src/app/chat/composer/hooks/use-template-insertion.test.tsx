import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useRef } from 'react'
import { afterEach, expect, it, vi } from 'vitest'

import { recordComposerUndoPoint } from './use-composer-undo'
import { useTemplateInsertion } from './use-template-insertion'

vi.mock('./use-composer-undo', () => ({ recordComposerUndoPoint: vi.fn() }))
afterEach(cleanup)

it('inserts at the remembered caret without discarding a draft and records an undo point', () => {
  const sync = vi.fn(() => '')

  function Composer() {
    const editor = useRef<HTMLDivElement>(null)
    const insert = useTemplateInsertion(editor, sync)

    return (
      <>
        <div aria-label="Draft" contentEditable ref={editor} suppressContentEditableWarning>
          before after
        </div>
        <button onClick={() => insert('TEMPLATE')}>Insert</button>
      </>
    )
  }

  render(<Composer />)
  const editor = screen.getByLabelText('Draft')
  const range = window.document.createRange()

  range.setStart(editor.firstChild!, 7)
  range.collapse(true)
  window.getSelection()!.removeAllRanges()
  window.getSelection()!.addRange(range)
  fireEvent(window.document, new Event('selectionchange'))
  fireEvent.click(screen.getByRole('button', { name: 'Insert' }))
  expect(editor.textContent).toBe('before TEMPLATEafter')
  expect(recordComposerUndoPoint).toHaveBeenCalledWith(editor)
  expect(sync).toHaveBeenCalledOnce()
})
