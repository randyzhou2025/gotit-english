export interface ProgressSnapshot {
  masteredWordIds: string[]
  savedWeakWordIds: string[]
  selectedUnitId: string
  courseSetupCompleted: boolean
  updatedAt: string
}

export interface UserProfile {
  nickname: string
  avatarUrl: string
  createdAt: string
}

export interface DashboardSnapshot {
  todayWords: number
  todayMinutes: number
  streakDays: number
  totalMastered: number
  totalStudyDays: number
}

export interface PublicAppConfig {
  customerServiceQrUrl: string
  icpNumber: string
}

export type FeedbackCategory = 'bug' | 'malfunction' | 'experience' | 'feature' | 'other'

const TOKEN_KEY = 'gotit:auth:token'
const USER_KEY = 'gotit:auth:user'
const PROGRESS_UPDATED_AT_KEY = 'gotit:progress:updatedAt'

function getApiBaseUrl(): string {
  const base = import.meta.env.VITE_API_BASE_URL
  return typeof base === 'string' ? base.replace(/\/$/, '') : ''
}

export function isApiEnabled(): boolean {
  return getApiBaseUrl().length > 0
}

function readStorage<T>(key: string): T | null {
  try {
    return uni.getStorageSync(key) as T
  } catch {
    return null
  }
}

function writeStorage(key: string, value: unknown) {
  try {
    uni.setStorageSync(key, value)
  } catch {
    // Storage can be unavailable in restricted preview contexts.
  }
}

export function getAuthToken(): string {
  const token = readStorage<string>(TOKEN_KEY)
  return typeof token === 'string' ? token : ''
}

export function getCachedUser(): UserProfile | null {
  const user = readStorage<UserProfile>(USER_KEY)
  if (!user || typeof user.nickname !== 'string') return null
  return user
}

export function clearAuthSession() {
  try {
    uni.removeStorageSync(TOKEN_KEY)
    uni.removeStorageSync(USER_KEY)
  } catch {
    // ignore
  }
}

function saveAuthSession(token: string, user: UserProfile) {
  writeStorage(TOKEN_KEY, token)
  writeStorage(USER_KEY, user)
}

async function apiRequest<T>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH'
    body?: unknown
    auth?: boolean
  } = {}
): Promise<T> {
  const baseUrl = getApiBaseUrl()
  if (!baseUrl) {
    throw new Error('API base URL is not configured')
  }

  const headers: Record<string, string> = {}
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }
  if (options.auth !== false) {
    const token = getAuthToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  const response = await uni.request({
    url: `${baseUrl}${path}`,
    method: (options.method ?? 'GET') as UniApp.RequestOptions['method'],
    data: options.body as UniApp.RequestOptions['data'],
    header: headers
  })

  const statusCode = response.statusCode ?? 0
  const data = response.data as T & { error?: string }
  if (statusCode < 200 || statusCode >= 300) {
    throw new Error(typeof data?.error === 'string' ? data.error : `Request failed (${statusCode})`)
  }

  return data
}

export interface SessionPayload {
  token: string
  user: UserProfile
  progress: ProgressSnapshot
  dashboard: DashboardSnapshot
}

let cachedSession: SessionPayload | null = null
let sessionPromise: Promise<SessionPayload | null> | null = null

export function ensureUserSession(): Promise<SessionPayload | null> {
  if (!isApiEnabled()) return Promise.resolve(null)
  if (cachedSession && getAuthToken()) return Promise.resolve(cachedSession)
  if (!sessionPromise) {
    sessionPromise = bootstrapSession()
      .then((payload) => {
        cachedSession = payload
        return payload
      })
      .finally(() => {
        sessionPromise = null
      })
  }
  return sessionPromise
}

async function resolveLoginCode(): Promise<string | null> {
  const apiBase = getApiBaseUrl()
  const isLocalApi = /localhost|127\.0\.0\.1/.test(apiBase)

  try {
    const loginResult = await new Promise<UniApp.LoginRes>((resolve, reject) => {
      uni.login({
        provider: 'weixin',
        success: resolve,
        fail: reject
      })
    })
    if (loginResult.code) return loginResult.code
  } catch {
    // H5 preview has no wx.login; fall through to local mock code.
  }

  if (import.meta.env.DEV && isLocalApi) {
    return 'dev-local-code'
  }

  return null
}

async function bootstrapSession(): Promise<SessionPayload | null> {
  try {
    const code = await resolveLoginCode()
    if (!code) return null

    const payload = await apiRequest<SessionPayload>('/api/weapp/session', {
      method: 'POST',
      body: { code },
      auth: false
    })

    saveAuthSession(payload.token, payload.user)
    return payload
  } catch (error) {
    console.warn('[userSession] bootstrap failed', error)
    return null
  }
}

export async function fetchCurrentUser(): Promise<UserProfile | null> {
  if (!isApiEnabled() || !getAuthToken()) return getCachedUser()

  try {
    const payload = await apiRequest<{ user: UserProfile }>('/api/user/me')
    writeStorage(USER_KEY, payload.user)
    return payload.user
  } catch {
    return getCachedUser()
  }
}

export async function updateUserProfile(input: {
  nickname?: string
  avatarUrl?: string
}): Promise<UserProfile | null> {
  if (!isApiEnabled() || !getAuthToken()) return null

  const payload = await apiRequest<{ user: UserProfile }>('/api/user/me', {
    method: 'PATCH',
    body: input
  })
  writeStorage(USER_KEY, payload.user)
  return payload.user
}

export async function uploadAvatar(filePath: string): Promise<string | null> {
  const baseUrl = getApiBaseUrl()
  const token = getAuthToken()
  if (!baseUrl || !token) return null

  const uploadResult = await new Promise<UniApp.UploadFileSuccessCallbackResult>((resolve, reject) => {
    uni.uploadFile({
      url: `${baseUrl}/api/upload/avatar`,
      filePath,
      name: 'file',
      header: { Authorization: `Bearer ${token}` },
      success: resolve,
      fail: reject
    })
  })

  if (uploadResult.statusCode < 200 || uploadResult.statusCode >= 300) {
    throw new Error('头像上传失败')
  }

  const raw = uploadResult.data as string | { url?: string }
  const data = typeof raw === 'string' ? JSON.parse(raw) as { url?: string } : raw
  return typeof data.url === 'string' ? data.url : null
}

export async function fetchPublicConfig(): Promise<PublicAppConfig> {
  if (!isApiEnabled()) {
    return { customerServiceQrUrl: '', icpNumber: '' }
  }

  try {
    return await apiRequest<PublicAppConfig>('/api/config/public', { auth: false })
  } catch {
    return { customerServiceQrUrl: '', icpNumber: '' }
  }
}

export async function submitFeedback(input: {
  category: FeedbackCategory
  content: string
}): Promise<boolean> {
  if (!isApiEnabled() || !getAuthToken()) return false

  await apiRequest('/api/feedback', {
    method: 'POST',
    body: input
  })
  return true
}

export function markProgressUpdatedAt(updatedAt: string) {
  writeStorage(PROGRESS_UPDATED_AT_KEY, updatedAt)
}

export function readProgressUpdatedAt(): string {
  const value = readStorage<string>(PROGRESS_UPDATED_AT_KEY)
  return typeof value === 'string' ? value : ''
}

export { getApiBaseUrl }
