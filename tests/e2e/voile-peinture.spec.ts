import { test, expect, devices } from "@playwright/test";

/**
 * LA 2D DU VOILE NE REPEINT PAS (22/09, premier oracle de cause du harnais).
 *
 * Sylvain, sur la production : « il saccade enormement ». Trace du 21/09
 * (`docs/superpowers/specs/2026-09-21-harnais-design.md`, section 0) :
 * pendant l'attente du voile, 504 peintures et 2 608 rasterisations en
 * quatre secondes, 134 des 259 images presentees en retard. Les noeuds
 * repeints, nommes : le document entier 114 fois, la traduction 64, la
 * signature 37, chaque lettre 31. Ce ne sont pas les zones qui tournent
 * (elles sont en `transform`, composees) : c'est la revelation lettre par
 * lettre, qui anime `text-shadow` et `filter: blur()` sur chaque span --
 * deux proprietes de PEINTURE. Quand le script charge et bloque le fil
 * principal, ces peintures attendent, et la rotation, innocente, parait
 * saccader.
 *
 * CE QUE CET ORACLE GARDE. Pendant l'attente (du premier octet a
 * `data-loaded`), aucun evenement `Paint` ne doit etre attribue a un noeud
 * du voile. Il lit le tracage Chromium par une session CDP, comme le fera
 * la barre de la tranche B : c'est la seule facon de voir ce que le
 * compositeur fait, `requestAnimationFrame` ne le voit pas.
 *
 * IL COMPTE, IL NE CHRONOMETRE PAS (regle de la maison depuis le 16/09) :
 * un nombre de peintures ne varie pas d'une machine a l'autre, une duree
 * si.
 *
 * Vu ROUGE le 22/09 avant le correctif, sur ces chiffres-la.
 *
 * ================= CORRIGE LE 28/10, SUR MESURE =================
 *
 * Il chronometrait, en fait, et par deux fois : le plafond de 6 peintures
 * par noeud et le cliquet de 504 peintures au total derivaient tous deux
 * avec la DUREE de l'attente, puisque la fenetre de mesure va du premier
 * octet a `data-loaded` et que cette duree-la, elle, depend de la machine.
 * Meme code, deux regimes, le 28/10 : au repos 356 peintures au total et 6
 * sur le pire noeud (attente 4,0 s) ; sous bridage CPU x4, 572 au total et
 * 9 sur le pire noeud (attente 9,1 s). Le 27/10, le lot complet a donc vu
 * rouge (9 pour un plafond de 6) sans qu'une ligne de code du voile ait
 * change -- verifie : `main` rend 9 aussi sous le meme bridage, le defaut
 * etait deja en ligne.
 *
 * ET LE MODELE ECRIT ICI ETAIT FAUX. Il disait : un calque se peint a sa
 * naissance, puis une seconde fois quand la police arrive, donc six au
 * plus pour un span et ses deux copies. Mesure : les polices etaient
 * pretes a 308 ms quand la deuxieme vague tombait a 1232 ms. Les vagues ne
 * suivent pas les polices, elles suivent les passes de `Layerize` -- une
 * re-rasterisation, pas un remplacement de glyphes. Et leur nombre dans la
 * fenetre croit avec la duree de l'attente.
 *
 * CE QU'ON COMPTE DEPUIS : les VAGUES, c'est-a-dire les instants distincts
 * ou un noeud est peint. Un calque re-rasterise rend trois peintures au
 * MEME instant (le span, son ::before, son ::after) ; un repeint par image
 * en rend une par image, etalee. Le plafond de 6 valait donc « exactement
 * deux vagues, zero marge », et chaque vague de plus etait triplee. En
 * vagues, la grandeur est stable : 3 au repos, 4 sous bridage x4, la ou
 * les peintures brutes doublent.
 *
 * Le cliquet des 504 peintures totales est retire pour la meme raison : la
 * regle par noeud le subsume, puisqu'un repeint par image de n'importe
 * quel noeud -- le document entier compris, 114 fois le 22/09 -- se lit en
 * autant de vagues SUR CE NOEUD. Un cliquet qu'une machine lente casse
 * refuse `main` pour du bruit, et ce n'etait pas du bruit cote code : la
 * regle etait fausse.
 */
test.use({ ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } });

/** Un noeud du DOM tel que `DOM.getDocument` le rend, avec ses enfants. */
type Noeud = {
  nodeId: number;
  backendNodeId: number;
  attributes?: string[];
  children?: Noeud[];
  contentDocument?: Noeud;
  shadowRoots?: Noeud[];
};

/** Les identifiants (backend) de tous les descendants du voile, racine comprise. */
function idsDuVoile(racine: Noeud): Set<number> {
  const trouve: Noeud[] = [];
  const chercher = (n: Noeud) => {
    const attrs = n.attributes ?? [];
    for (let i = 0; i < attrs.length; i += 2) if (attrs[i] === "data-veil") trouve.push(n);
    for (const c of n.children ?? []) chercher(c);
    if (n.contentDocument) chercher(n.contentDocument);
    for (const s of n.shadowRoots ?? []) chercher(s);
  };
  chercher(racine);
  const ids = new Set<number>();
  const ramasser = (n: Noeud) => {
    ids.add(n.backendNodeId);
    for (const c of n.children ?? []) ramasser(c);
  };
  for (const v of trouve) ramasser(v);
  return ids;
}

/**
 * LE PLAFOND DE VAGUES PAR NOEUD, par la regle d'enveloppe de la maison
 * (03/10) : plafond = max observe + max(ecart, 1), la marge ne descend
 * jamais sous une unite.
 *
 * CALIBRE SUR LES CHIFFRES DE CET ORACLE, jamais sur ceux d'une sonde.
 * Lecon du 28/10 : une sonde de .scratch, qui lance son propre navigateur,
 * mesurait 3 vagues au repos et 4 sous bridage CPU x4, quand l'oracle en
 * mesure 3 et que le meme defaut lui en donne 5 -- deux environnements,
 * deux echelles, et un plafond calibre sur la mauvaise aurait laisse
 * passer le defaut. Releves de l'oracle lui-meme : 3 vagues en isolement
 * le 28/10, 3 dans le lot complet du 27/10 (instants 0, 224, 572 ms).
 * Donc max 3, ecart 0, plafond 3 + max(0, 1) = 4.
 *
 * Et il attrape : le defaut du 22/09 recree ce jour-la (`text-shadow`,
 * propriete de PEINTURE, animee par lettre) mesure 5 vagues puis 7 sur
 * deux lancers, aux instants 0, 51, 670, 1106 et 1467 ms -- etalees sur
 * toute l'animation, la signature d'un repeint par image, la ou les vagues
 * saines sont groupees tot (0 et 622 ms) et restent a 3. Des plafonds de 8 puis de 5, essayes d'abord, le
 * laissaient passer : c'est la mesure qui l'a dit, pas le raisonnement.
 */
const PLAFOND_VAGUES = 4;

test("pendant l'attente, aucune peinture n'est attribuee au voile", async ({ page }) => {
  test.setTimeout(180_000);
  const cdp = await page.context().newCDPSession(page);
  const evenements: { name: string; ts?: number; args?: { data?: { nodeId?: number } } }[] = [];
  cdp.on("Tracing.dataCollected", (e) => evenements.push(...(e.value as unknown as typeof evenements)));
  const fin = new Promise<void>((r) => cdp.on("Tracing.tracingComplete", () => r()));
  await cdp.send("Tracing.start", {
    traceConfig: { includedCategories: ["devtools.timeline", "disabled-by-default-devtools.timeline"] },
    transferMode: "ReportEvents",
  });

  await page.goto("/fr?shaders-prod", { waitUntil: "commit" });
  await page.waitForFunction(() => document.documentElement.dataset.loaded === "true", null, { timeout: 120_000 });

  // Les noeuds du voile, lus AVANT la fin du tracage : les identifiants
  // backend sont ceux de cette session, et le voile est encore dans le DOM.
  const { root } = (await cdp.send("DOM.getDocument", { depth: -1, pierce: true })) as { root: Noeud };
  const voile = idsDuVoile(root);
  expect(voile.size, "le voile n'a pas ete trouve dans le DOM (data-veil)").toBeGreaterThan(10);

  await cdp.send("Tracing.end");
  await fin;

  const peintures = evenements.filter((e) => e.name === "Paint");
  const surLeVoile = peintures.filter((e) => e.args?.data?.nodeId !== undefined && voile.has(e.args.data.nodeId));

  // Un rouge n'est jamais nu : les noeuds les plus repeints, nommes, avec
  // les INSTANTS de leurs peintures (en ms depuis la premiere) -- groupes,
  // c'est le cout initial d'un calque ; etales, c'est un repeint par image.
  // La page est encore ouverte, les identifiants backend sont valides.
  const parNoeud = new Map<number, number[]>();
  for (const p of surLeVoile) {
    const id = p.args!.data!.nodeId!;
    parNoeud.set(id, [...(parNoeud.get(id) ?? []), p.ts ?? 0]);
  }
  const pires = [...parNoeud.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 4);
  const nommes: string[] = [];
  for (const [id, ts] of pires) {
    const { node } = (await cdp.send("DOM.describeNode", { backendNodeId: id })) as { node: { nodeName: string; attributes?: string[] } };
    const attrs = node.attributes ?? [];
    const classe = attrs[attrs.indexOf("class") + 1] ?? "";
    const t0 = Math.min(...ts);
    const instants = ts.map((t) => Math.round((t - t0) / 1000)).sort((a, b) => a - b);
    nommes.push(`${ts.length} x <${node.nodeName.toLowerCase()} class="${classe.slice(0, 40)}"> aux instants ${instants.join(", ")} ms`);
  }
  // ON COMPTE LES VAGUES, PAS LES PEINTURES (28/10, voir l'en-tete). Un
  // calque re-rasterise donne TROIS peintures au meme instant -- le span,
  // son ::before et son ::after -- donc le nombre de peintures triple
  // chaque vague, tandis que le nombre d'INSTANTS distincts la compte une
  // fois. C'est cette grandeur-la qui ne derive pas avec la machine.
  const instantsParNoeud = [...parNoeud.entries()].map(
    ([id, ts]) => [id, new Set(ts.map((t) => Math.round(t / 1000))).size] as const,
  );
  const pireVagues = Math.max(0, ...instantsParNoeud.map(([, n]) => n));
  expect(
    pireVagues,
    `un noeud du voile est re-rasterise ${pireVagues} fois pendant l'attente (plafond ${PLAFOND_VAGUES}) -- au-dela, il se repeint au lieu de se composer.\n  ${nommes.join("\n  ")}`,
  ).toBeLessThanOrEqual(PLAFOND_VAGUES);
});
