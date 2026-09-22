/**
 * Compter les lignes comme `max-lines` d'ESLint et comme `wc -l` : la ligne
 * vide apres le dernier retour a la ligne ne compte pas (mesure du 22/09 :
 * 400 lignes + retour final = 400 pour ESLint, 401 pour split("\n").length).
 * Partage par scripts/harnais-baseline.mjs et tests/harnais/cliquets.test.ts,
 * pour que le JSON des cliquets, la derogation ESLint et le test disent le
 * meme nombre.
 */
export function compterLignes(texte) {
  if (texte.length === 0) return 0;
  const parts = texte.split("\n");
  return texte.endsWith("\n") ? parts.length - 1 : parts.length;
}
