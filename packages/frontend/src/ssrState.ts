export function getInitialRenderTimestamp() {
  if (typeof window !== 'undefined' && typeof window.__IH3T_RENDERED_AT__ === 'number') {
    return window.__IH3T_RENDERED_AT__
  }

  return Date.now()
}

export function getDehydratedStateFromWindow() {
  if (typeof window === 'undefined') {
    return undefined
  }

  return window.__IH3T_DEHYDRATED_STATE__
}
