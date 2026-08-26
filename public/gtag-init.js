// Inicialização do Google Analytics (gtag.js). Arquivo externo de propósito —
// a CSP do projeto não libera 'unsafe-inline' em script-src, então esse trecho
// não pode ficar como <script> inline no index.html.
window.dataLayer = window.dataLayer || [];
function gtag() { dataLayer.push(arguments); }
gtag('js', new Date());
gtag('config', 'G-8R97B336KF');
