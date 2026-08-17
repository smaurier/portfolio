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

export function middleware(request: NextRequest) {
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
  // Exclut les assets statiques et fichiers avec extension (favicon, images,
  // polices) de la redirection de locale.
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
