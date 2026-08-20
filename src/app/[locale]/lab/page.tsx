import StagScene from "../../components/stag-scene/stag-scene";
import { getDictionary } from "../../../dictionaries";

// Page de travail, pas dans la nav, pas indexée — palier 0 de la DA Nahual
// (cf memory project-nahual-da), à retirer/déplacer une fois le chantier
// prêt à remplacer la home actuelle.
export const metadata = {
  robots: { index: false, follow: false },
};

export default async function LabPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const dict = getDictionary(locale).lab;
  return (
    <StagScene
      loadingPhrase={dict.loadingPhrase}
      loadingTranslation={dict.loadingTranslation}
      loadingLabel={dict.loadingLabel}
    />
  );
}
