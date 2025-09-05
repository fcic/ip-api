import { getFlag, extractClientIPs, parseUserAgent, parseAcceptLanguage } from './utils'
import { CORS_HEADERS } from './config'

export default {
  fetch(request) {
    const { ip, ipv4, ipv6 } = extractClientIPs(request)
    const { pathname } = new URL(request.url)
    console.log(ip, pathname)

    // Common geo extraction
    const country = request.cf?.country || request.headers.get('cf-ipcountry')
    const colo = request.headers.get('cf-ray')?.split('-')[1]
    const geo = {
      flag: country && getFlag(country),
      country: country,
      countryRegion: request.cf?.region || request.headers.get('cf-region'),
      city: request.cf?.city || request.headers.get('cf-ipcity'),
      region: request.cf?.colo || colo,
      latitude: request.cf?.latitude || request.headers.get('cf-iplatitude'),
      longitude: request.cf?.longitude || request.headers.get('cf-iplongitude'),
      asOrganization: request.cf?.asOrganization || request.headers.get('x-asn'),
    }

    if (pathname === '/geo') {
      console.log(geo)
      return Response.json({
        ip,
        ...geo
      }, {
        headers: {
          ...CORS_HEADERS,
          'x-client-ip': ip
        }
      })
    }

    if (pathname === '/all') {
      const ua = parseUserAgent(request.headers.get('user-agent') || '')
      const acceptLang = parseAcceptLanguage(request.headers.get('accept-language') || '')
      const hostname = request.headers.get('x-forwarded-host') || request.headers.get('host')
      const localIp = request.headers.get('cf-pseudo-ipv4') || null
      const tlsVersion = request.cf?.tlsVersion
      const coloId = request.cf?.colo || geo.region
      const protocol = new URL(request.url).protocol.replace(':','')

      const data = {
        ip,
        ipv4,
        ipv6,
        geo,
        host: hostname,
        protocol,
        tlsVersion,
        colo: coloId,
        headers: Object.fromEntries(request.headers.entries()),
        userAgent: ua,
        acceptLanguage: acceptLang,
        localIp, // best-effort; true LAN IP is not available via HTTP
      }
      return Response.json(data, {
        headers: {
          ...CORS_HEADERS,
          'x-client-ip': ip
        }
      })
    }

    if (pathname === '/4') {
      return new Response(ipv4 || '', { headers: { ...CORS_HEADERS, 'content-type': 'text/plain; charset=utf-8', 'x-client-ip': ip } })
    }

    if (pathname === '/6') {
      return new Response(ipv6 || '', { headers: { ...CORS_HEADERS, 'content-type': 'text/plain; charset=utf-8', 'x-client-ip': ip } })
    }

    if (pathname === '/hostname') {
      // HTTP cannot determine the client's device hostname. Expose any forwarded hostname header if present.
      const hostname = request.headers.get('x-client-hostname') || ''
      return new Response(hostname, { headers: { ...CORS_HEADERS, 'content-type': 'text/plain; charset=utf-8', 'x-client-ip': ip } })
    }

    if (pathname === '/localip') {
      // Not truly the client's LAN IP; best-effort via proxies (e.g., Cloudflare Pseudo-IPv4 if enabled)
      const localIp = request.headers.get('cf-pseudo-ipv4') || ''
      return new Response(localIp, { headers: { ...CORS_HEADERS, 'content-type': 'text/plain; charset=utf-8', 'x-client-ip': ip } })
    }

    return new Response(ip, {
      headers: {
        ...CORS_HEADERS,
        'x-client-ip': ip
      }
    })
  }
}
