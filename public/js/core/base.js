// Base helpers
export function getProjectBaseUrl() {
    const path = window.location.pathname;
    const match = path.match(/^(.*?)\/public\//);
    if (match) return match[1];
    return '';
}
