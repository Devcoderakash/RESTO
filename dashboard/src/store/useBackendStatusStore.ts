import { create } from 'zustand'

export type BackendConnectionStatus =
  | 'Connecting'
  | 'Server Waking Up'
  | 'Connected'
  | 'Temporarily Unavailable'

export interface BackendTelemetry {
  lastLatencyMs?: number
  lastCheckedAt?: string
  lastError?: string | null
  databaseConnected?: boolean
  databaseVendor?: string
  consecutiveFailures: number
}

interface BackendStatusState {
  status: BackendConnectionStatus
  isReady: boolean
  telemetry: BackendTelemetry
  setStatus: (status: BackendConnectionStatus, details?: Partial<BackendTelemetry>) => void
  recordSuccess: (latencyMs?: number, details?: Partial<BackendTelemetry>) => void
  recordFailure: (error: string, isColdStart: boolean) => void
  resumeListeners: Set<() => void>
  registerResumeListener: (fn: () => void) => () => void
}

export const useBackendStatusStore = create<BackendStatusState>((set, get) => ({
  status: 'Connecting',
  isReady: false,
  telemetry: {
    consecutiveFailures: 0,
    lastError: null,
  },
  resumeListeners: new Set(),
  registerResumeListener: (fn: () => void) => {
    get().resumeListeners.add(fn)
    return () => {
      get().resumeListeners.delete(fn)
    }
  },
  setStatus: (newStatus: BackendConnectionStatus, details?: Partial<BackendTelemetry>) => {
    const prevStatus = get().status
    set((state) => ({
      status: newStatus,
      isReady: newStatus === 'Connected',
      telemetry: {
        ...state.telemetry,
        ...details,
        lastCheckedAt: new Date().toISOString(),
      },
    }))

    // Requirement 11: Once backend becomes ready, automatically resume pending safe data-fetch requests
    if (
      newStatus === 'Connected' &&
      (prevStatus === 'Server Waking Up' || prevStatus === 'Temporarily Unavailable' || prevStatus === 'Connecting')
    ) {
      get().resumeListeners.forEach((listener) => {
        try {
          listener()
        } catch (err) {
          console.warn('[BackendStatus] Resume listener error:', err)
        }
      })
    }
  },
  recordSuccess: (latencyMs?: number, details?: Partial<BackendTelemetry>) => {
    get().setStatus('Connected', {
      lastLatencyMs: latencyMs,
      consecutiveFailures: 0,
      lastError: null,
      ...details,
    })
  },
  recordFailure: (errorMsg: string, isColdStart: boolean) => {
    const current = get()
    const nextFailures = current.telemetry.consecutiveFailures + 1

    let nextStatus: BackendConnectionStatus
    if (isColdStart && nextFailures <= 3) {
      nextStatus = 'Server Waking Up'
    } else if (nextFailures > 4) {
      nextStatus = 'Temporarily Unavailable'
    } else {
      nextStatus = isColdStart ? 'Server Waking Up' : 'Temporarily Unavailable'
    }

    set({
      status: nextStatus,
      isReady: false,
      telemetry: {
        ...current.telemetry,
        lastError: errorMsg,
        consecutiveFailures: nextFailures,
        lastCheckedAt: new Date().toISOString(),
      },
    })
  },
}))
