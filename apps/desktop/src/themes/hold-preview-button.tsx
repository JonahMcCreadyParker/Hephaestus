import { type ComponentProps, useCallback, useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'

type HoldPreviewButtonProps = Pick<ComponentProps<typeof Button>, 'aria-label' | 'className' | 'disabled'> & {
  onHold: () => void
  onRelease?: () => void
}

export function HoldPreviewButton({ onHold, onRelease, ...props }: HoldPreviewButtonProps) {
  const [held, setHeld] = useState(false)
  const holding = useRef(false)
  const releaseRef = useRef(onRelease)

  const release = useCallback(() => {
    if (!holding.current) {
      return
    }

    holding.current = false
    setHeld(false)
    releaseRef.current?.()
  }, [])

  const hold = () => {
    if (holding.current) {
      return
    }

    holding.current = true
    releaseRef.current = onRelease
    onHold()
    setHeld(true)
  }

  useEffect(() => {
    window.addEventListener('blur', release)

    return () => {
      window.removeEventListener('blur', release)

      release()
    }
  }, [release])

  return (
    <Button
      {...props}
      data-theme-preview-held={held ? '' : undefined}
      onBlur={release}
      onKeyDown={event => {
        if (event.key !== ' ' && event.key !== 'Enter') {
          return
        }

        event.preventDefault()
        event.stopPropagation()
        hold()
      }}
      onKeyUp={event => {
        if (event.key !== ' ' && event.key !== 'Enter') {
          return
        }

        event.preventDefault()
        event.stopPropagation()
        release()
      }}
      onLostPointerCapture={release}
      onPointerCancel={release}
      onPointerDown={event => {
        if (event.button !== 0 || !event.isPrimary) {
          return
        }

        event.preventDefault()
        event.currentTarget.setPointerCapture(event.pointerId)
        hold()
      }}
      onPointerUp={release}
      size="sm"
      type="button"
      variant="secondary"
    >
      Hold to preview
    </Button>
  )
}
