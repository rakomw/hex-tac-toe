import type {
  AdminBroadcastMessageRequest,
  AdminBroadcastMessageResponse,
  AdminServerSettingsResponse,
  AdminTerminateSessionResponse,
  AdminShutdownControlResponse,
  AdminScheduleShutdownRequest,
  AdminUpdateServerSettingsRequest
} from '@ih3t/shared'
import { fetchJson } from './apiClient'

export async function fetchAdminServerSettings() {
  return await fetchJson<AdminServerSettingsResponse>('/api/admin/server-settings')
}

export async function updateAdminServerSettings(maxConcurrentGames: number | null) {
  return await fetchJson<AdminServerSettingsResponse>('/api/admin/server-settings', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      settings: {
        maxConcurrentGames
      }
    } satisfies AdminUpdateServerSettingsRequest)
  })
}

export async function scheduleShutdown(delayMinutes: number) {
  return await fetchJson<AdminShutdownControlResponse>('/api/admin/shutdown', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ delayMinutes } satisfies AdminScheduleShutdownRequest)
  })
}

export async function cancelShutdownSchedule() {
  return await fetchJson<AdminShutdownControlResponse>('/api/admin/shutdown', {
    method: 'DELETE'
  })
}

export async function broadcastAdminMessage(message: string) {
  return await fetchJson<AdminBroadcastMessageResponse>('/api/admin/broadcast', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ message } satisfies AdminBroadcastMessageRequest)
  })
}

export async function terminateAdminGame(sessionId: string) {
  return await fetchJson<AdminTerminateSessionResponse>(`/api/sessions/${encodeURIComponent(sessionId)}/terminate`, {
    method: 'POST'
  })
}
