import StagScene from "../../components/stag-scene/stag-scene";

// Page de travail, pas dans la nav, pas indexée — palier 0 de la DA Nahual
// (cf memory project-nahual-da), à retirer/déplacer une fois le chantier
// prêt à remplacer la home actuelle.
export const metadata = {
  robots: { index: false, follow: false },
};

export default function LabPage() {
  return <StagScene />;
}
