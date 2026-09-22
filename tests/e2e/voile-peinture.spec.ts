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
 * si. Le plafond total est un cliquet : le point zero du 22/09 est 504 ;
 * il ne remonte pas.
 *
 * Vu ROUGE le 22/09 avant le correctif, sur ces chiffres-la.
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

/** Le plafond de peintures pendant l'attente, toutes causes confondues : le point zero du 22/09. */
const PLAFOND_PEINTURES = 504;

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
  const pire = pires.length ? pires[0][1].length : 0;

  // Un calque se peint UNE fois quand il nait, et une seconde fois quand la
  // police arrive : le span et ses deux copies, c'est six au plus. Au-dela,
  // c'est un repeint par image (le 22/09 avant le correctif : 31 par lettre,
  // 64 pour la traduction, 114 pour le document entier).
  const PLAFOND_PAR_NOEUD = 6;
  expect(
    pire,
    `un noeud du voile est peint ${pire} fois pendant l'attente (plafond ${PLAFOND_PAR_NOEUD} : une fois par calque, deux avec la police) -- il se repeint au lieu de se composer.\n  ${nommes.join("\n  ")}`,
  ).toBeLessThanOrEqual(PLAFOND_PAR_NOEUD);
  expect(peintures.length, `${peintures.length} peintures pendant l'attente, le point zero etait ${PLAFOND_PEINTURES} -- le cliquet ne recule pas`).toBeLessThanOrEqual(
    PLAFOND_PEINTURES,
  );
});
