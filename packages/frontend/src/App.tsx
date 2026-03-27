import { DehydratedState, HydrationBoundary, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import AppErrorBoundary from './components/AppErrorBoundary'
import { useEffect } from 'react'
import { clearHydrationRenderPassFlag, useIsSsrRender } from './ssrState'

export { createClientRouter, createServerRouter } from './router'

interface AppProps {
    router: Parameters<typeof RouterProvider>[0]['router']
    queryClient: QueryClient
    dehydratedState?: DehydratedState
}

function App({ router, queryClient, dehydratedState }: Readonly<AppProps>) {
    useEffect(() => clearHydrationRenderPassFlag());
    const isSsrRender = useIsSsrRender();

    return (
        <AppErrorBoundary>
            <QueryClientProvider client={queryClient}>
                {!isSsrRender && <ReactQueryDevtools />}
                <HydrationBoundary state={dehydratedState}>
                    <RouterProvider router={router} />
                </HydrationBoundary>
            </QueryClientProvider>
        </AppErrorBoundary>
    )
}

export default App
