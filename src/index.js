import { getFlag } from './utils'
import { CORS_HEADERS } from './config'

export default {
  fetch(request) {
    const ip = request.headers.get('cf-connecting-ipv6') || request.headers.get('cf-connecting-ip') || request.headers.get('x-real-ip')
    const ipv4 = request.headers.get('cf-connecting-ip') || request.headers.get('x-real-ip')
    const ipv6 = request.headers.get('cf-connecting-ipv6')
    const { pathname } = new URL(request.url)
    console.log(ip, pathname)
    
    // 收集地理位置和客户端信息
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
    
    // 客户端信息
    const userAgent = request.headers.get('user-agent')
    const accept = request.headers.get('accept-language')
    
    // 检查请求路径并返回相应信息
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
      // 返回所有可用的客户端信息
      return Response.json({
        ipv4,
        ipv6,
        geo,
        userAgent,
        acceptLanguage: accept,
        headers: Object.fromEntries([...request.headers]),
        cf: request.cf || {},
      }, {
        headers: {
          ...CORS_HEADERS,
          'x-client-ip': ip
        }
      })
    } else if (pathname === '/4') {
      // 只返回IPv4地址
      return new Response(ipv4 || "No IPv4 detected", {
        headers: {
          ...CORS_HEADERS,
          'x-client-ip': ipv4 || ip
        }
      })
    } else if (pathname === '/6') {
      // 只返回IPv6地址
      return new Response(ipv6 || "No IPv6 detected", {
        headers: {
          ...CORS_HEADERS,
          'x-client-ip': ipv6 || ip
        }
      })
    } else if (pathname === '/hostname' || pathname === '/localip') {
      // 这些信息需要客户端JS获取，返回帮助信息
      return Response.json({
        error: "This information requires client-side JavaScript",
        message: "To get " + (pathname === '/hostname' ? "hostname" : "local IP") + ", you need to use client-side JavaScript",
        example: pathname === '/hostname' ? 
          "window.location.hostname" : 
          "Use RTCPeerConnection to detect local IPs"
      }, {
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
