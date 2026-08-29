# Configuration multi-domaines · Nahual

## Domaines

| Domaine | Rôle | Statut |
|---|---|---|
| `nahual.fr` | Primary (marque studio) | Actif Netlify |
| `sylvainmaurier.com` | Alias personnel — redirect 301 → nahual.fr | À configurer (acheté 29/08/2026) |

## Setup Netlify sylvainmaurier.com

### Étape 1 · Ajouter le domaine dans Netlify

1. Dashboard Netlify → Sites → **nahual** → Site settings → Domain management
2. **Add domain alias** → `sylvainmaurier.com`
3. Vérifier que `nahual.fr` reste **primary domain**
4. Netlify propose auto-config DNS ou instructions

### Étape 2 · Configurer le DNS chez le registrar

Deux options selon le registrar de `sylvainmaurier.com` :

#### Option A · Nameservers Netlify (recommandé, plus simple)

Chez le registrar, remplacer les nameservers actuels par :
- `dns1.p04.nsone.net`
- `dns2.p04.nsone.net`
- `dns3.p04.nsone.net`
- `dns4.p04.nsone.net`

Netlify gère tout le DNS. Propagation ~1-24h.

#### Option B · Records A/AAAA + CNAME (garder registrar DNS)

Chez le registrar, ajouter les records :

| Type | Nom | Valeur |
|---|---|---|
| A | @ | `75.2.60.5` (Netlify apex IP) |
| CNAME | www | `<votre-site>.netlify.app` |

Netlify auto-config SSL Let's Encrypt (attendre ~10min après DNS propagé).

### Étape 3 · Vérifier redirect

Une fois DNS propagé (`dig sylvainmaurier.com` retourne Netlify IP) :
- `curl -I https://sylvainmaurier.com` doit retourner `301` → `https://nahual.fr`
- Netlify auto-redirige les alias vers le primary domain

### Étape 4 · Vérifier SSL

`https://sylvainmaurier.com` doit avoir un certificat valide (Let's Encrypt).

## Codeside

- `src/lib/seo.ts` : `AUTHOR_SITE = "https://sylvainmaurier.com"`
- `src/app/[locale]/layout.tsx` : JSON-LD Person `sameAs` inclut `AUTHOR_SITE` pour signaler l'équivalence à Google.

## Note SEO

Le redirect 301 depuis `sylvainmaurier.com` évite le duplicate content. Google traite les deux domaines comme équivalents grâce au `sameAs` JSON-LD. Le canonical reste `nahual.fr` (via `metadataBase` Next.js).
