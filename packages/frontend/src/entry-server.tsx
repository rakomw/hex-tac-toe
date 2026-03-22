import type { DehydratedState } from '@tanstack/react-query'
import { renderToString } from 'react-dom/server'
import AppProviders from './AppProviders'
import { createQueryClient } from './queryClient'
import { createServerRouter } from './router'

interface RenderAppOptions {
  url: string
  dehydratedState?: DehydratedState
}

export function renderApp({ url, dehydratedState }: Readonly<RenderAppOptions>) {
  const queryClient = createQueryClient()
  const router = createServerRouter(url)

  return renderToString(
    <AppProviders
      router={router}
      queryClient={queryClient}
      dehydratedState={dehydratedState}
    />
  )
}
