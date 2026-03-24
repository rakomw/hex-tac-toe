import {
    GameCellPlaceEvent,
    GameStateEvent,
    SessionChatEvent,
    SessionJoinedEvent,
    SessionParticipantRole,
    type GameState,
    type SessionInfo,
} from '@ih3t/shared'
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

type PendingSessionJoinState =
    | { status: 'idle'; sessionId: null; errorMessage: null }
    | { status: 'pending'; sessionId: string; errorMessage: null }
    | { status: 'not-found'; sessionId: string; errorMessage: string }
    | { status: 'failed'; sessionId: string; errorMessage: string }

type ActiveSession = SessionInfo & {
    localParticipantId: string
    localParticipantRole: SessionParticipantRole

    gameState: GameState
};

interface LiveGameStoreState {
    connection: {
        isConnected: boolean
        isInitialized: boolean
    }

    session: ActiveSession | null
    pendingSessionJoin: PendingSessionJoinState

    onSocketConnected: () => void
    onSocketInitialized: () => void
    onSocketDisconnected: () => void

    startJoiningSession: (sessionId: string) => void
    failJoiningSession: (sessionId: string, errorMessage: string) => void

    setupSession: (payload: SessionJoinedEvent) => void
    clearSession: () => void

    handleSessionUpdate: (payload: Partial<SessionInfo> & { id: SessionInfo["id"] }) => void
    handleSessionChatEvent: (payload: SessionChatEvent) => void

    handleGameState: (payload: GameStateEvent) => void
    handleGameCellPlace: (payload: GameCellPlaceEvent) => void
}

export const useLiveGameStore = create<LiveGameStoreState>()(
    immer<LiveGameStoreState>((set) => ({
        connection: {
            isConnected: false,
            isInitialized: false,
            currentPlayerId: ''
        },
        pendingSessionJoin: { status: 'idle', sessionId: null, errorMessage: null },
        session: null,
        game: null,

        onSocketConnected: () => set(state => {
            state.connection.isConnected = true
            state.connection.isInitialized = false
            state.session = null
        }),
        onSocketInitialized: () => set(state => {
            state.connection.isInitialized = true
        }),
        onSocketDisconnected: () => set(state => {
            state.connection.isConnected = false
            state.connection.isInitialized = false
            state.pendingSessionJoin = { status: 'idle', sessionId: null, errorMessage: null }
        }),

        startJoiningSession: (sessionId) => set(state => {
            state.pendingSessionJoin = {
                status: 'pending',
                sessionId,
                errorMessage: null
            }
        }),
        failJoiningSession: (sessionId, errorMessage) => set(state => {
            if (state.pendingSessionJoin.sessionId !== sessionId) {
                return
            }

            state.pendingSessionJoin = {
                status: errorMessage === 'Session not found' ? 'not-found' : 'failed',
                sessionId,
                errorMessage
            }
        }),
        setupSession: (payload) => set(state => {
            state.pendingSessionJoin = { status: 'idle', sessionId: null, errorMessage: null }
            state.session = {
                ...payload.session,
                gameState: payload.gameState,

                localParticipantId: payload.participantId,
                localParticipantRole: payload.participantRole,
            }
        }),
        handleSessionUpdate: (payload) => set(state => {
            if (state.session?.id !== payload.id) {
                /* update is not for the currently active session */
                return;
            }

            Object.assign(state.session, payload);
        }),
        handleSessionChatEvent: event => set(state => {
            if (state.session?.id !== event.sessionId) {
                return;
            }

            const chat = state.session.chat;
            chat.displayNames[event.message.senderId] = event.senderDisplayName;
            chat.messages = [...chat.messages, event.message];
        }),
        handleGameState: event => set(state => {
            if (state.session?.id !== event.sessionId) {
                return;
            }

            Object.assign(state.session.gameState, event.gameState);
        }),
        handleGameCellPlace: event => set(state => {
            if (state.session?.id !== event.sessionId) {
                return;
            }

            Object.assign(state.session.gameState, event.state);
            state.session.gameState.cells = [
                ...state.session.gameState.cells,
                event.cell
            ];
        }),
        clearSession: () => set(state => {
            state.pendingSessionJoin = { status: 'idle', sessionId: null, errorMessage: null }
            state.session = null
        })
    }))
)
