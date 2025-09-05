const EMOJI_FLAG_UNICODE_STARTING_POSITION = 127397
export function getFlag(countryCode) {
  const regex = new RegExp('^[A-Z]{2}$').test(countryCode)
  if (!countryCode || !regex) return void 0
  try {
    return String.fromCodePoint(
      ...countryCode
        .split('')
        .map((char) => EMOJI_FLAG_UNICODE_STARTING_POSITION + char.charCodeAt(0))
    )
  } catch (error) {
    return void 0
  }
}

// Simple IP helpers
export function isIPv6(ip) {
  return typeof ip === 'string' && ip.includes(':')
}

export function isIPv4(ip) {
  return typeof ip === 'string' && ip.split('.').length === 4 && !ip.includes(':')
}

// Extract IPv4 / IPv6 from common headers (best-effort)
export function extractClientIPs(request) {
  const ipv6 = request.headers.get('cf-connecting-ipv6')
  const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-real-ip') || ipv6
  let v4 = null
  let v6 = null

  if (ip) {
    if (isIPv6(ip)) v6 = ip
    else if (isIPv4(ip)) v4 = ip
  }

  // Try X-Forwarded-For in case it includes alternatives
  const xff = request.headers.get('x-forwarded-for')
  if (xff) {
    const parts = xff.split(',').map(p => p.trim()).filter(Boolean)
    for (const p of parts) {
      if (!v4 && isIPv4(p)) v4 = p
      if (!v6 && isIPv6(p)) v6 = p
      if (v4 && v6) break
    }
  }

  return { ip: ip || v4 || v6, ipv4: v4, ipv6: v6 }
}

// Minimal UA parsing (best-effort, no deps)
export function parseUserAgent(uaRaw = '') {
  const ua = uaRaw || ''
  const isBot = /(bot|crawler|spider|crawling)/i.test(ua)

  let os = 'Unknown'
  if (/Windows NT 10/.test(ua)) os = 'Windows 10'
  else if (/Windows NT 11/.test(ua)) os = 'Windows 11'
  else if (/Windows NT/.test(ua)) os = 'Windows'
  else if (/Mac OS X 10[._]\d+/.test(ua)) os = 'macOS'
  else if (/Macintosh/.test(ua)) os = 'macOS'
  else if (/iPhone|iPad|iPod/.test(ua)) os = 'iOS'
  else if (/Android/.test(ua)) os = 'Android'
  else if (/Linux/.test(ua)) os = 'Linux'

  let browser = 'Unknown'
  if (/Edg\//.test(ua)) browser = 'Edge'
  else if (/OPR\//.test(ua)) browser = 'Opera'
  else if (/Chrome\//.test(ua)) browser = 'Chrome'
  else if (/Safari\//.test(ua) && /Version\//.test(ua)) browser = 'Safari'
  else if (/Firefox\//.test(ua)) browser = 'Firefox'
  else if (/MSIE |Trident\//.test(ua)) browser = 'IE'

  const deviceType = /Mobile|iPhone|Android/.test(ua) ? 'mobile' : (/iPad|Tablet/.test(ua) ? 'tablet' : 'desktop')

  return { raw: ua, os, browser, deviceType, isBot }
}

export function parseAcceptLanguage(header = '') {
  return header
    .split(',')
    .map(x => x.trim())
    .filter(Boolean)
}

// Cookie helpers
export function parseCookies(cookieHeader = '') {
  const map = new Map()
  cookieHeader.split(';').forEach(part => {
    const idx = part.indexOf('=')
    if (idx > -1) {
      const k = part.slice(0, idx).trim()
      const v = part.slice(idx + 1).trim()
      if (k) map.set(k, v)
    }
  })
  return map
}

export function randomIdHex(byteLength = 16) {
  const buf = new Uint8Array(byteLength)
  crypto.getRandomValues(buf)
  return Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function sha256Hex(input) {
  const data = new TextEncoder().encode(String(input))
  const digest = await crypto.subtle.digest('SHA-256', data)
  const bytes = new Uint8Array(digest)
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

export function getPrimaryLanguage(acceptLanguage = '') {
  const first = (acceptLanguage || '').split(',')[0]?.trim() || ''
  return first.split(';')[0]?.trim().toLowerCase() || ''
}

// Cross-browser (same PC) oriented ID: rely on IP + primary language + platform only
// Notes: This is not a perfect machine identifier; it may collide for different devices behind the same public IP.
export async function buildClientId({ ip, acceptLanguage, secChUaPlatform }) {
  const lang = getPrimaryLanguage(acceptLanguage)
  const basis = [ip || '', lang || '', (secChUaPlatform || '').toLowerCase()].join('|')
  return sha256Hex(basis)
}

//diff explorer diff id
// export async function buildClientId({ ip, uaRaw, acceptLanguage, secChUa, secChUaMobile, secChUaPlatform }) {
//   const basis = [ip || '', uaRaw || '', acceptLanguage || '', secChUa || '', secChUaMobile || '', secChUaPlatform || ''].join('|')
//   return sha256Hex(basis)
// }

