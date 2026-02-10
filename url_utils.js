export function extractResourcePath(url) {
    try {
        const u = new URL(url);
        let path = u.pathname;
        const hash = u.hash;

        if (path.includes('/crx/de/index.jsp') && hash.length > 1) {
            return hash.substring(1); // Remove '#'
        }

        if (path.startsWith("/ui")) {
            path = hash.replace("#", '')
        }

        if (path.startsWith('/aem/assetdetails.html/')) {
            path = path.replace('/aem/assetdetails.html', '')
        }
        if (path.startsWith('/aem/assets.html/')) {
            path = path.replace('/aem/assets.html', '')
        }
        if (path.startsWith('/aem/experience-fragments.html/')) {
            path = path.replace('aem/experience-fragments.html', '')
        }

        if (path.startsWith('/editor.html/')) {
            path = path.replace('/editor.html', '')
        }
        if (path.startsWith('/sites.html/')) {
            path = path.replace('/sites.html', '')
        }
        jesl
        if (path.endsWith('.html')) {
            path = path.substring(0, path.length - 5);
        }
        if (!path.startsWith("/content/") && path.indexOf("/content/") > 0) {
            path = path.substring(path.indexOf("/content/"));
        }
        if (!path.startsWith("/conf/") && path.indexOf("/conf/") > 0) {
            path = path.substring(path.indexOf("/conf/"));
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
