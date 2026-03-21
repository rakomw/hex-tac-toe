import { useEffect } from 'react'
import type { CreateSessionRequest } from '@ih3t/shared'
import { Navigate, useNavigate, useSearchParams } from 'react-router'
import LobbyScreen from '../components/LobbyScreen'
import { hostGame, joinGame } from '../liveGameClient'
import { useLiveGameStore } from '../liveGameStore'
import { useQueryAccount, useQueryAvailableSessions } from '../queryHooks'
import { buildFinishedGamesPath, buildSessionPath } from './archiveRouteState'

function LobbyRoute() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const inviteSessionId = searchParams.get('join')
  const connection = useLiveGameStore(state => state.connection)
  const shutdown = useLiveGameStore(state => state.shutdown)
  const accountQuery = useQueryAccount({ enabled: true })
  const availableSessionsQuery = useQueryAvailableSessions({ enabled: true })

  useEffect(() => {
    if (!inviteSessionId) {
      return
    }

    void navigate(buildSessionPath(inviteSessionId), { replace: true })
  }, [inviteSessionId, navigate])

  const createLobby = (request: CreateSessionRequest) => {
    void (async () => {
      const sessionId = await hostGame(request)
      if (!sessionId) {
        return
      }

      /* join the game and the join method will update the screen to the lobby screen */
      joinGame(sessionId)
    })()
  }

  const joinLiveGame = (sessionId: string) => {
    void navigate(buildSessionPath(sessionId))
  }

  return (
    <LobbyScreen
      isConnected={connection.isConnected}
      shutdown={shutdown}
      account={accountQuery.data?.user ?? null}
      isAccountLoading={accountQuery.isLoading}
      liveSessions={availableSessionsQuery.data ?? []}
      onHostGame={createLobby}
      onJoinGame={joinLiveGame}
      onViewFinishedGames={() => void navigate(buildFinishedGamesPath(1, Date.now()))}
      onViewLeaderboard={() => void navigate('/leaderboard')}
      onViewOwnFinishedGames={() => void navigate(buildFinishedGamesPath(1, Date.now(), 'mine'))}
      onViewAdmin={() => void navigate('/admin')}
    />
  )
}

export default LobbyRoute
