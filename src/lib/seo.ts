/**
 * Constantes SEO globales (28/08). Une seule source de vérité pour
 * l'URL prod, le nom du studio, l'email, etc. Utilisée par metadata,
 * sitemap, robots, JSON-LD, OG image.
 */

export const SITE_URL = "https://nahual.fr";
export const SITE_NAME = "Nahual";
export const STUDIO_NAME = "Nahual · studio de création";
export const AUTHOR_NAME = "Sylvain Maurier";
export const AUTHOR_EMAIL = "bonjour@nahual.fr";
export const AUTHOR_LINKEDIN = "https://www.linkedin.com/in/sylvain-maurier/";
export const AUTHOR_GITHUB = "https://github.com/smaurier";
// sylvainmaurier.com (achete 29/08) redirige 301 → nahual.fr via
// Netlify domain settings. Reference dans JSON-LD Person.sameAs pour
// signaler l'equivalence a Google.
export const AUTHOR_SITE = "https://sylvainmaurier.com";

export const FAVICON_PATH = "/img/mini-logo.svg";
