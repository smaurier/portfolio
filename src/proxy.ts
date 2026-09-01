import { NextRequest, NextResponse } from "next/server";

const locales = ["fr", "en", "es"] as const;
const defaultLocale = "fr";

// Langue préférée déduite de l'en-tête Accept-Language, sans dépendance
// externe (negotiator/@formatjs sont overkill pour 3 langues). Repli sur le
// français si rien de reconnu — cohérent avec un studio francophone.
function getPreferredLocale(request: NextRequest): string {
  const acceptLanguage = request.headers.get("accept-language");
  if (!acceptLanguage) return defaultLocale;

  const preferred = acceptLanguage
    .split(",")
    .map((part) => part.split(";")[0].trim().slice(0, 2).toLowerCase());

  return preferred.find((lang) => (locales as readonly string[]).includes(lang)) ?? defaultLocale;
}

// Renommé middleware -> proxy pour Next.js 16 (middleware.ts est déprécié,
// même comportement, juste le nom du fichier et de l'export qui changent).
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const hasLocale = locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)
  );
  if (hasLocale) return;

  const locale = getPreferredLocale(request);
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Exclut de la redirection de locale :
  // - _next, api : internes framework
  // - .*\\..* : tout path avec une extension (favicon.ico, icon.svg,
  //   sitemap.xml, robots.txt, manifest.webmanifest, images, polices)
  // - apple-icon, icon : file conventions Next.js metadata SANS extension
  //   (src/app/apple-icon.tsx generee au path /apple-icon). Sans cette
  //   exclusion le proxy les redirige en /fr/apple-icon → 404 car ces
  //   routes vivent au root, pas sous [locale].
  matcher: ["/((?!_next|api|apple-icon|icon|.*\\..*).*)"],
};
