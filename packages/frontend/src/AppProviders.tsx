import type { DehydratedState, QueryClient } from '@tanstack/react-query'
import { HydrationBoundary, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router'
import AppErrorBoundary from './components/AppErrorBoundary'

interface AppProvidersProps {
  router: Parameters<typeof RouterProvider>[0]['router']
  queryClient: QueryClient
  dehydratedState?: DehydratedState
}

function AppProviders({ router, queryClient, dehydratedState }: Readonly<AppProvidersProps>) {
  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <HydrationBoundary state={dehydratedState}>
          <RouterProvider router={router} />
        </HydrationBoundary>
      </QueryClientProvider>
    </AppErrorBoundary>
  )
}

export default AppProviders
