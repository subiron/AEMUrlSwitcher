export function extractResourcePath(url) {
  try {
    const u = new URL(url);
    let path = u.pathname;
    const hash = u.hash;

    // Pattern 1: /crx/de/index.jsp#...
    if (path.includes('/crx/de/index.jsp') && hash.length > 1) {
      return hash.substring(1); // Remove '#'
    }

    // Pattern 2: /editor.html/...
    if (path.startsWith('/editor.html') || path.startsWith("/ui#")) {
      path = path.replace('/editor.html', '').replace("/ui#",'')
    }

    // Common cleanup: Remove .html extension and query params
    // Note: URL object separates pathname from search, so we just handle pathname here.
    if (path.endsWith('.html')) {
      path = path.substring(0, path.length - 5);
    }

    return path;
  } catch (e) {
    console.error("Invalid URL", e);
    return null;
  }
}

export function buildUrl(host, resourcePath, mode) {
  // Ensure host doesn't have trailing slash
  const cleanHost = host.endsWith('/') ? host.slice(0, -1) : host;
  // Ensure resource path starts with slash
  const cleanPath = resourcePath.startsWith('/') ? resourcePath : '/' + resourcePath;

  switch (mode) {
    case 'crx':
      return `${cleanHost}/crx/de/index.jsp#${cleanPath}`;
    case 'editor':
      return `${cleanHost}/editor.html${cleanPath}.html`;
    case 'wcmdisabled':
      return `${cleanHost}${cleanPath}.html?wcmmode=disabled`;
    case 'json':
      return `${cleanHost}${cleanPath}.2.json`;
    case 'open':
    default:
      return `${cleanHost}${cleanPath}.html`;
  }
}
