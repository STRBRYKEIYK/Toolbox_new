// Service Worker for Offline PWA Capability
// Optimized for warehouse inventory management

const CACHE_NAME = 'toolbox-inventory-v1.2.0'
const API_CACHE_NAME = 'toolbox-api-v1.2.0'
const STATIC_CACHE_NAME = 'toolbox-static-v1.2.0'

// Cache durations (in milliseconds)
const CACHE_DURATIONS = {
  PRODUCTS: 30 * 60 * 1000, // 30 minutes for products
  EMPLOYEES: 60 * 60 * 1000, // 1 hour for employees
  STATIC: 24 * 60 * 60 * 1000, // 24 hours for static assets
}

// Critical resources to cache for offline functionality
const STATIC_ASSETS = [
  '/',
  '/favicon.ico',
  '/_next/static/css/',
  '/_next/static/js/',
  '/placeholder-logo.svg',
  '/placeholder-user.jpg',
]

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/items',
  '/api/employees',
  '/api/employee-logs',
]

// Install event - cache critical resources
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker for warehouse offline mode...')
  
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE_NAME).then((cache) => {
        console.log('[SW] Caching static assets')
        return cache.addAll(STATIC_ASSETS.filter(asset => asset))
      }),
      
      // Initialize API cache
      caches.open(API_CACHE_NAME).then((cache) => {
        console.log('[SW] Initialized API cache')
        return cache
      }),
      
      // Initialize main cache
      caches.open(CACHE_NAME).then((cache) => {
        console.log('[SW] Initialized main cache')
        return cache
      })
    ]).then(() => {
      console.log('[SW] Service worker installed successfully')
      // Skip waiting to activate immediately
      return self.skipWaiting()
    }).catch((error) => {
      console.error('[SW] Installation failed:', error)
    })
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...')
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && 
                cacheName !== API_CACHE_NAME && 
                cacheName !== STATIC_CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      }),
      
      // Claim all clients
      self.clients.claim()
    ]).then(() => {
      console.log('[SW] Service worker activated successfully')
      
      // Notify all clients about activation
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'SW_ACTIVATED',
            timestamp: Date.now()
          })
        })
      })
    })
  )
})

// Fetch event - implement cache-first strategy with network fallback
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  
  // Skip non-HTTP requests and chrome-extension requests
  if (!request.url.startsWith('http') || request.url.includes('chrome-extension')) {
    return
  }
  
  // Handle API requests
  if (url.pathname.includes('/api/')) {
    event.respondWith(handleApiRequest(request))
    return
  }
  
  // Handle static assets and pages
  event.respondWith(handleStaticRequest(request))
})

// Handle API requests with cache-first strategy and offline support
async function handleApiRequest(request) {
  const url = new URL(request.url)
  const cacheKey = url.pathname + url.search
  
  try {
    // Try cache first for GET requests
    if (request.method === 'GET') {
      const cachedResponse = await getCachedApiResponse(cacheKey)
      
      if (cachedResponse && await isCacheValid(cacheKey)) {
        console.log('[SW] Serving from cache:', cacheKey)
        
        // Try to update cache in background
        updateCacheInBackground(request, cacheKey)
        
        return cachedResponse
      }
    }
    
    // Try network request
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok && request.method === 'GET') {
      // Cache successful GET responses
      await cacheApiResponse(cacheKey, networkResponse.clone())
      console.log('[SW] Cached API response:', cacheKey)
    }
    
    return networkResponse
    
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', error.message)
    
    // Network failed, try cache as fallback
    const cachedResponse = await getCachedApiResponse(cacheKey)
    
    if (cachedResponse) {
      console.log('[SW] Serving stale cache due to network failure:', cacheKey)
      
      // Add offline indicator header
      const offlineResponse = new Response(cachedResponse.body, {
        status: cachedResponse.status,
        statusText: cachedResponse.statusText,
        headers: {
          ...Object.fromEntries(cachedResponse.headers.entries()),
          'X-Served-By': 'sw-cache',
          'X-Cache-Status': 'offline'
        }
      })
      
      return offlineResponse
    }
    
    // Return offline fallback
    return createOfflineFallback(request)
  }
}

// Handle static requests with cache-first strategy
async function handleStaticRequest(request) {
  try {
    // Try cache first
    const cachedResponse = await caches.match(request)
    
    if (cachedResponse) {
      console.log('[SW] Serving static asset from cache:', request.url)
      return cachedResponse
    }
    
    // Try network
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(STATIC_CACHE_NAME)
      await cache.put(request, networkResponse.clone())
      console.log('[SW] Cached static asset:', request.url)
    }
    
    return networkResponse
    
  } catch (error) {
    console.log('[SW] Static request failed:', error.message)
    
    // Try cache as fallback
    const cachedResponse = await caches.match(request)
    
    if (cachedResponse) {
      return cachedResponse
    }
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/')
    }
    
    // Return empty response for other requests
    return new Response('', { status: 204 })
  }
}

// Cache API response with metadata
async function cacheApiResponse(key, response) {
  const cache = await caches.open(API_CACHE_NAME)
  const metadata = {
    timestamp: Date.now(),
    url: response.url,
    status: response.status
  }
  
  // Store metadata separately
  await cache.put(`${key}:metadata`, new Response(JSON.stringify(metadata)))
  
  // Store actual response
  await cache.put(key, response)
}

// Get cached API response
async function getCachedApiResponse(key) {
  const cache = await caches.open(API_CACHE_NAME)
  return await cache.match(key)
}

// Check if cache is still valid
async function isCacheValid(key) {
  try {
    const cache = await caches.open(API_CACHE_NAME)
    const metadataResponse = await cache.match(`${key}:metadata`)
    
    if (!metadataResponse) {
      return false
    }
    
    const metadata = await metadataResponse.json()
    const age = Date.now() - metadata.timestamp
    
    // Determine cache duration based on endpoint
    let maxAge = CACHE_DURATIONS.PRODUCTS
    
    if (key.includes('employees')) {
      maxAge = CACHE_DURATIONS.EMPLOYEES
    }
    
    return age < maxAge
  } catch (error) {
    console.error('[SW] Error checking cache validity:', error)
    return false
  }
}

// Update cache in background
async function updateCacheInBackground(request, cacheKey) {
  try {
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      await cacheApiResponse(cacheKey, networkResponse.clone())
      console.log('[SW] Background cache update successful:', cacheKey)
    }
  } catch (error) {
    console.log('[SW] Background cache update failed:', error.message)
  }
}

// Create offline fallback response
function createOfflineFallback(request) {
  const url = new URL(request.url)
  
  if (url.pathname.includes('/api/items')) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Offline mode: No cached data available',
      offline: true,
      data: []
    }), {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
        'X-Served-By': 'sw-offline-fallback'
      }
    })
  }
  
  if (url.pathname.includes('/api/employees')) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Offline mode: No cached data available',
      offline: true,
      data: []
    }), {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
        'X-Served-By': 'sw-offline-fallback'
      }
    })
  }
  
  return new Response(JSON.stringify({
    success: false,
    error: 'Service unavailable offline',
    offline: true
  }), {
    status: 503,
    headers: {
      'Content-Type': 'application/json',
      'X-Served-By': 'sw-offline-fallback'
    }
  })
}

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  const { data } = event
  
  switch (data.type) {
    case 'SKIP_WAITING':
      self.skipWaiting()
      break
      
    case 'GET_CACHE_STATUS':
      getCacheStatus().then((status) => {
        event.ports[0].postMessage(status)
      })
      break
      
    case 'CLEAR_CACHE':
      clearAllCaches().then(() => {
        event.ports[0].postMessage({ success: true })
      })
      break
      
    case 'PREFETCH_DATA':
      prefetchCriticalData().then(() => {
        event.ports[0].postMessage({ success: true })
      })
      break
  }
})

// Get cache status for debugging
async function getCacheStatus() {
  try {
    const [apiCache, staticCache, mainCache] = await Promise.all([
      caches.open(API_CACHE_NAME),
      caches.open(STATIC_CACHE_NAME),
      caches.open(CACHE_NAME)
    ])
    
    const [apiKeys, staticKeys, mainKeys] = await Promise.all([
      apiCache.keys(),
      staticCache.keys(),
      mainCache.keys()
    ])
    
    return {
      api: apiKeys.length,
      static: staticKeys.length,
      main: mainKeys.length,
      total: apiKeys.length + staticKeys.length + mainKeys.length
    }
  } catch (error) {
    return { error: error.message }
  }
}

// Clear all caches
async function clearAllCaches() {
  try {
    await Promise.all([
      caches.delete(API_CACHE_NAME),
      caches.delete(STATIC_CACHE_NAME),
      caches.delete(CACHE_NAME)
    ])
    
    console.log('[SW] All caches cleared')
  } catch (error) {
    console.error('[SW] Error clearing caches:', error)
  }
}

// Prefetch critical data
async function prefetchCriticalData() {
  try {
    const baseUrl = self.location.origin
    
    const criticalUrls = [
      `${baseUrl}/api/items`,
      `${baseUrl}/api/employees`
    ]
    
    await Promise.all(
      criticalUrls.map(async (url) => {
        try {
          const response = await fetch(url)
          if (response.ok) {
            await cacheApiResponse(new URL(url).pathname, response.clone())
            console.log('[SW] Prefetched:', url)
          }
        } catch (error) {
          console.log('[SW] Prefetch failed:', url, error.message)
        }
      })
    )
  } catch (error) {
    console.error('[SW] Prefetch error:', error)
  }
}

console.log('[SW] Service worker script loaded successfully')