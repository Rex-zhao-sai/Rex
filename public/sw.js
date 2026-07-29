/**
 * Service Worker - 离线优先架构
 * 拦截网络请求，返回缓存响应，后台同步数据
 */

const CACHE_NAME = 'maintenance-cache-v1';
const API_CACHE_TTL = 5 * 60 * 1000; // 5 分钟缓存

// 需要缓存的 API 路径
const API_PATTERNS = [
  '/api/equipment',
  '/api/records',
];

// 安装事件 - 预缓存关键资源
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/_next/static/css/main.css',
      ]);
    })
  );
  self.skipWaiting();
});

// 激活事件 - 清理旧缓存
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// 拦截 fetch 请求
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 只处理 GET 请求和 API 请求
  if (event.request.method !== 'GET') return;

  // 检查是否是 API 请求
  const isApiRequest = API_PATTERNS.some(pattern =>
    url.pathname.startsWith(pattern)
  );

  if (!isApiRequest) return;

  // 缓存优先策略
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // 检查缓存是否过期
        const cachedTime = cachedResponse.headers.get('x-cache-time');
        if (cachedTime) {
          const age = Date.now() - parseInt(cachedTime);
          if (age < API_CACHE_TTL) {
            console.log('[SW] Cache hit:', url.pathname);
            return cachedResponse;
          }
        }
      }

      // 缓存未命中或过期，发起网络请求
      console.log('[SW] Fetching from network:', url.pathname);
      return fetch(event.request).then((response) => {
        if (response.ok) {
          // 克隆响应并缓存
          const responseToCache = response.clone();
          const headers = new Headers(response.headers);
          headers.set('x-cache-time', Date.now().toString());

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, new Response(responseToCache.body, {
              headers,
            }));
          });
        }
        return response;
      }).catch((error) => {
        console.error('[SW] Fetch failed:', error);
        // 网络失败时返回缓存（即使过期）
        return cachedResponse || new Response(JSON.stringify({
          error: 'Network error',
          cached: true,
        }), {
          headers: { 'Content-Type': 'application/json' },
        });
      });
    })
  );
});

// 后台同步
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);

  if (event.tag === 'sync-maintenance-data') {
    event.waitUntil(syncMaintenanceData());
  }
});

// 同步保养数据
async function syncMaintenanceData() {
  console.log('[SW] Syncing maintenance data...');

  try {
    // 获取所有客户端
    const clients = await self.clients.matchAll();

    // 通知客户端开始同步
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_START',
      });
    });

    // 这里可以添加实际的同步逻辑
    // 例如：从服务器获取最新数据，更新 IndexedDB

    // 通知客户端同步完成
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
      });
    });
  } catch (error) {
    console.error('[SW] Sync failed:', error);

    // 通知客户端同步失败
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_ERROR',
        error: error.message,
      });
    });
  }
}

// 监听来自客户端的消息
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data.type === 'CLEAR_CACHE') {
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => caches.delete(name))
      );
    });
  }

  if (event.data.type === 'TRIGGER_SYNC') {
    event.waitUntil(syncMaintenanceData());
  }
});
