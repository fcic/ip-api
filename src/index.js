import { getFlag, extractClientIPs, parseUserAgent, parseAcceptLanguage, parseCookies, randomIdHex, buildClientId, buildClientId2 } from './utils'
import { CORS_HEADERS } from './config'

export default {
  async fetch(request) {
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
      const uaRaw = request.headers.get('user-agent') || ''
      const ua = parseUserAgent(uaRaw)
      const acceptLangRaw = request.headers.get('accept-language') || ''
      const acceptLang = parseAcceptLanguage(acceptLangRaw)
      const hostname = request.headers.get('x-forwarded-host') || request.headers.get('host')
      const localIp = request.headers.get('cf-pseudo-ipv4') || null
      const tlsVersion = request.cf?.tlsVersion
      const coloId = request.cf?.colo || geo.region
      const url = new URL(request.url)
      const protocol = url.protocol.replace(':','')

      const secChUa = request.headers.get('sec-ch-ua') || ''
      const secChUaMobile = request.headers.get('sec-ch-ua-mobile') || ''
      const secChUaPlatform = request.headers.get('sec-ch-ua-platform') || ''


      // Deterministic client id based on stable request signals
      const clientId = await buildClientId({ ip, uaRaw, acceptLanguage: acceptLangRaw, secChUa, secChUaMobile, secChUaPlatform })
      const clientId2 = await buildClientId2({ ip, acceptLanguage: acceptLangRaw, secChUaPlatform })

      // Cookie-based ephemeral id
      const cookies = parseCookies(request.headers.get('cookie') || '')
      let cookieId = cookies.get('cid')
      let setCookieHeader
      if (!cookieId) {
        cookieId = randomIdHex(16)
        // 30 days expiry
        const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString()
        setCookieHeader = `cid=${cookieId}; Path=/; Expires=${expires}; SameSite=Lax`
        if (protocol === 'https') setCookieHeader += '; Secure'
      }

      const data = {
        ip,
        ipv4,
        ipv6,
        geo,
        host: hostname,
        url: url.href,
        protocol,
        tlsVersion,
        colo: coloId,
        headers: Object.fromEntries(request.headers.entries()),
        userAgent: ua,
        acceptLanguage: acceptLang,
        localIp, // best-effort; true LAN IP is not available via HTTP
        clientId,
        clientId2,
        cookieId,
      }
      const headers = {
        ...CORS_HEADERS,
        'x-client-ip': ip,
        'content-type': 'application/json; charset=utf-8',
      }
      if (setCookieHeader) headers['set-cookie'] = setCookieHeader
      return new Response(JSON.stringify(data, null, 2), { headers })
    }

    if (pathname === '/id') {
      const uaRaw = request.headers.get('user-agent') || ''
      const acceptLangRaw = request.headers.get('accept-language') || ''
      const secChUa = request.headers.get('sec-ch-ua') || ''
      const secChUaMobile = request.headers.get('sec-ch-ua-mobile') || ''
      const secChUaPlatform = request.headers.get('sec-ch-ua-platform') || ''
      const clientId = await buildClientId({ ip, uaRaw, acceptLanguage: acceptLangRaw, secChUa, secChUaMobile, secChUaPlatform })
      return new Response(clientId, { headers: { ...CORS_HEADERS, 'content-type': 'text/plain; charset=utf-8', 'x-client-ip': ip } })
    }


    if (pathname === '/id2') {
      const acceptLangRaw = request.headers.get('accept-language') || ''
      const secChUaPlatform = request.headers.get('sec-ch-ua-platform') || ''
      const clientId = await buildClientId2({ ip, acceptLanguage: acceptLangRaw, secChUaPlatform })
      return new Response(clientId, { headers: { ...CORS_HEADERS, 'content-type': 'text/plain; charset=utf-8', 'x-client-ip': ip } })
    }

  

  return new Response(ip || '', {
      headers: {
        ...CORS_HEADERS,
    'x-client-ip': ip,
    'content-type': 'text/plain; charset=utf-8'
      }
    })
  }
}
