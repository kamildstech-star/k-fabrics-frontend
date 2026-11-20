export interface TrackProduct {
  id: number | string
  name: string
  price: number
  category?: string
  fabric_type?: string
}

export interface TrackCartItem {
  id?: number | string
  productId?: number | string
  name: string
  price: number
  quantity: number
  size?: string
}

export interface TrackOrder {
  orderNumber: string
  totalAmount: number
  items: Array<{
    id?: number | string
    name: string
    price: number
    quantity: number
  }>
  currency?: string
}

declare global {
  interface Window {
    fbq?: (...args: any[]) => void
    _fbq?: any
    ttq?: any
  }
}

export const useTracking = () => {
  const config = useRuntimeConfig()
  const metaPixelId = config.public.metaPixelId as string
  const tiktokPixelId = config.public.tiktokPixelId as string

  const isClient = import.meta.client

  const initPixels = () => {
    if (!isClient) return

    // Initialize Meta Pixel if ID provided and not yet loaded
    if (metaPixelId && !window.fbq) {
      /* eslint-disable */
      (function (f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
        if (f.fbq) return; n = f.fbq = function () {
          n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments)
        };
        if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0';
        n.queue = []; t = b.createElement(e); t.async = !0;
        t.src = v; s = b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t, s)
      })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
      window.fbq?.('init', metaPixelId);
      window.fbq?.('track', 'PageView');
    }

    // Initialize TikTok Pixel if ID provided and not yet loaded
    if (tiktokPixelId && !window.ttq) {
      /* eslint-disable */
      (function (w: any, d: any, t: any) {
        w.TiktokAnalyticsObject = t; var ttq = w[t] = w[t] || [];
        ttq.methods = ["page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias", "group", "enableCookie", "disableCookie"];
        ttq.setAndDefer = function (t: any, e: any) { t[e] = function () { t.push([e].concat(Array.prototype.slice.call(arguments, 0))) } };
        for (var i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]);
        ttq.instance = function (t: any) { for (var e = ttq._i[t] || [], n = 0; n < ttq.methods.length; n++) ttq.setAndDefer(e, ttq.methods[n]); return e };
        ttq.load = function (e: any, n: any) {
          var i = "https://analytics.tiktok.com/i18n/pixel/events.js";
          ttq._i = ttq._i || {}, ttq._i[e] = [], ttq._i[e]._u = i;
          var s = d.createElement("script"); s.type = "text/javascript", s.async = !0, s.src = i + "?sdkid=" + e + "&lib=" + t;
          var c = d.getElementsByTagName("script")[0]; c.parentNode.insertBefore(s, c)
        };
        ttq.load(tiktokPixelId);
        ttq.page();
      })(window, document, 'ttq');
    }
  }

  const trackPageView = (pageName?: string) => {
    if (!isClient) return
    initPixels()

    if (window.fbq) {
      window.fbq('track', 'PageView')
    }
    if (window.ttq) {
      window.ttq.page()
    }
  }

  const trackViewContent = (product: TrackProduct) => {
    if (!isClient || !product) return
    initPixels()

    const payload = {
      content_name: product.name,
      content_ids: [String(product.id)],
      content_type: 'product',
      value: product.price,
      currency: 'PKR',
      content_category: product.category || product.fabric_type || 'Luxury Pret',
    }

    if (window.fbq) {
      window.fbq('track', 'ViewContent', payload)
    }
    if (window.ttq) {
      window.ttq.track('ViewContent', {
        content_id: String(product.id),
        content_name: product.name,
        price: product.price,
        value: product.price,
        currency: 'PKR',
      })
    }
  }

  const trackAddToCart = (item: TrackCartItem) => {
    if (!isClient || !item) return
    initPixels()

    const payload = {
      content_name: item.name,
      content_ids: [String(item.productId || item.id || '')],
      content_type: 'product',
      value: item.price * (item.quantity || 1),
      currency: 'PKR',
    }

    if (window.fbq) {
      window.fbq('track', 'AddToCart', payload)
    }
    if (window.ttq) {
      window.ttq.track('AddToCart', {
        content_id: String(item.productId || item.id || ''),
        content_name: item.name,
        quantity: item.quantity,
        price: item.price,
        value: item.price * (item.quantity || 1),
        currency: 'PKR',
      })
    }
  }

  const trackInitiateCheckout = (items: TrackCartItem[], totalValue: number) => {
    if (!isClient) return
    initPixels()

    const contentIds = items.map(i => String(i.productId || i.id || ''))
    const payload = {
      content_ids: contentIds,
      content_type: 'product',
      num_items: items.reduce((acc, i) => acc + (i.quantity || 1), 0),
      value: totalValue,
      currency: 'PKR',
    }

    if (window.fbq) {
      window.fbq('track', 'InitiateCheckout', payload)
    }
    if (window.ttq) {
      window.ttq.track('InitiateCheckout', {
        contents: items.map(i => ({
          content_id: String(i.productId || i.id || ''),
          content_name: i.name,
          quantity: i.quantity,
          price: i.price,
        })),
        value: totalValue,
        currency: 'PKR',
      })
    }
  }

  const trackPurchase = (order: TrackOrder) => {
    if (!isClient || !order) return
    initPixels()

    const payload = {
      content_ids: order.items.map(i => String(i.id || '')),
      content_type: 'product',
      value: order.totalAmount,
      currency: order.currency || 'PKR',
      num_items: order.items.reduce((acc, i) => acc + (i.quantity || 1), 0),
      order_id: order.orderNumber,
    }

    if (window.fbq) {
      window.fbq('track', 'Purchase', payload)
    }
    if (window.ttq) {
      window.ttq.track('CompletePayment', {
        contents: order.items.map(i => ({
          content_id: String(i.id || ''),
          content_name: i.name,
          quantity: i.quantity,
          price: i.price,
        })),
        value: order.totalAmount,
        currency: order.currency || 'PKR',
      })
    }
  }

  return {
    initPixels,
    trackPageView,
    trackViewContent,
    trackAddToCart,
    trackInitiateCheckout,
    trackPurchase,
  }
}
