import { createBackendRouteHandlers } from '@/lib/backend-proxy'

export const { GET, POST, PATCH, PUT, DELETE } = createBackendRouteHandlers('/api/admin')
