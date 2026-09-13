/**
 * LES POIGNEES DE SONDE (13/09). Les handles `window.__nahual*` (scene,
 * chauffe, voile) n'existaient qu'en developpement ; or un defaut ne se
 * reproduisait qu'en production (le monde de Contact disparu a densite 2
 * apres un saut de defilement) et rien ne permettait d'y lire l'etat de la
 * scene. `NEXT_PUBLIC_NAHUAL_SONDE=1` au build les active en production ;
 * le build de Netlify ne pose pas cette variable, donc rien ne part en
 * ligne.
 */
export const SONDE = process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_NAHUAL_SONDE === "1";
