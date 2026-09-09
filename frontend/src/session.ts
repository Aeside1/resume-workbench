import type { AuthResponse } from './api'

export type Session = AuthResponse & { selectedWorkspaceId: number }
