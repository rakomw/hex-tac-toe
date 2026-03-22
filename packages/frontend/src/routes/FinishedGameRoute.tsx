import { Navigate, useParams } from 'react-router'
import FinishedGameReviewScreen from '../components/FinishedGameReviewScreen'
import { useQueryFinishedGame } from '../queryHooks'

function FinishedGameRoute() {
  const { gameId } = useParams<{ gameId: string }>()
  const finishedGameQuery = useQueryFinishedGame(gameId ?? null, {
    enabled: Boolean(gameId)
  })

  if (!gameId) {
    return <Navigate to="/" replace />
  }

  return (
    <FinishedGameReviewScreen
      game={finishedGameQuery.data ?? null}
      isLoading={finishedGameQuery.isLoading}
      errorMessage={finishedGameQuery.error instanceof Error ? finishedGameQuery.error.message : null}
      onRetry={() => void finishedGameQuery.refetch()}
    />
  )
}

export default FinishedGameRoute
