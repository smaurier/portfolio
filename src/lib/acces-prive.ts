/**
 * La porte de la page de lecture des chiffres : Basic Auth verifie cote
 * serveur.
 *
 * MODULE SEPARE DE `referents.ts` A DESSEIN. Le comptage tourne dans une
 * fonction edge, sous Deno, ou `Buffer` n'existe pas. En gardant le decodage
 * base64 ici, la fonction edge n'importe jamais ce fichier et ne peut pas
 * tomber dessus a l'execution.
 */

/** Ce que la page de lecture attend, lu dans les variables d'environnement. */
export interface Identifiants {
  readonly utilisateur: string;
  readonly motDePasse: string;
}

/**
 * Vrai si l'en-tete `Authorization` porte exactement les identifiants
 * attendus, en Basic.
 *
 * LA PORTE NE S'OUVRE PAS SUR UNE CONFIGURATION MANQUANTE : si l'attendu est
 * vide (variable d'environnement absente), on refuse tout, y compris un
 * en-tete qui lui ressemblerait. Sans ce garde-fou, un oubli de configuration
 * publierait les chiffres.
 */
export function identifiantsValides(entete: string | null, attendu: Identifiants): boolean {
  if (attendu.utilisateur === "" || attendu.motDePasse === "") return false;
  if (!entete) return false;

  const [schema, valeur] = entete.split(" ");
  if (schema !== "Basic" || !valeur) return false;

  let decode: string;
  try {
    decode = Buffer.from(valeur, "base64").toString("utf8");
  } catch {
    return false;
  }

  // Seul le PREMIER deux-points separe (RFC 7617) : couper sur tous
  // rejetterait un mot de passe legitime qui en contient, et pousserait a en
  // choisir un plus faible.
  const coupure = decode.indexOf(":");
  if (coupure < 0) return false;

  const utilisateur = decode.slice(0, coupure);
  const motDePasse = decode.slice(coupure + 1);

  return egalEnTempsConstant(utilisateur, attendu.utilisateur) && egalEnTempsConstant(motDePasse, attendu.motDePasse);
}

/**
 * Comparaison qui ne s'arrete pas au premier caractere different : une
 * comparaison ordinaire fuit la longueur du prefixe correct par son temps
 * d'execution, ce qui se mesure sur un reseau et permet de deviner un secret
 * caractere par caractere.
 */
function egalEnTempsConstant(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let ecart = 0;
  for (let i = 0; i < a.length; i += 1) ecart |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return ecart === 0;
}
