import { getFlag } from './utils'
import { CORS_HEADERS } from './config'

export default {
  async fetch(request) {
    // 获取各种IP地址信息
    const ipv6 = request.headers.get('cf-connecting-ipv6')
    const ipv4 = request.headers.get('cf-connecting-ip') || request.headers.get('x-real-ip')
    const ip = ipv6 || ipv4
    const localip = request.headers.get('x-forwarded-for')?.split(',')[0] || ip
    
    // 尝试获取主机名
    let hostname = null
    try {
      hostname = request.headers.get('host') || new URL(request.url).hostname
    } catch (e) {
      console.error('Failed to get hostname', e)
    }

    const { pathname } = new URL(request.url)
    console.log(ip, pathname)
    
    // 获取地理位置信息（供多个路径使用）
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
    
    // 处理不同的路径请求
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
    } else if (pathname === '/all') {
      // 返回所有可用信息
      return Response.json({
        ipv4,
        ipv6,
        localip,
        hostname,
        geo,
        headers: Object.fromEntries([...request.headers.entries()]),
      }, {
        headers: {
          ...CORS_HEADERS,
          'x-client-ip': ip
        }
      })
    } else if (pathname === '/4') {
      // 仅返回IPv4地址
      return new Response(ipv4 || 'Not available', {
        headers: {
          ...CORS_HEADERS,
          'x-client-ip': ip
        }
      })
    } else if (pathname === '/6') {
      // 仅返回IPv6地址
      return new Response(ipv6 || 'Not available', {
        headers: {
          ...CORS_HEADERS,
          'x-client-ip': ip
        }
      })
    } else if (pathname === '/hostname') {
      // 返回主机名
      return new Response(hostname || 'Not available', {
        headers: {
          ...CORS_HEADERS,
          'x-client-ip': ip
        }
      })
    } else if (pathname === '/localip') {
      // 返回本地IP
      return new Response(localip || 'Not available', {
        headers: {
          ...CORS_HEADERS,
          'x-client-ip': ip
        }
      })
    }
    
    // 默认返回IP地址
    return new Response(ip, {
      headers: {
        ...CORS_HEADERS,
        'x-client-ip': ip
      }
    })
  }
}
