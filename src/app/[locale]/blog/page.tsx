import { getDictionary } from "../../../dictionaries";

export default function Blog({ params }: { params: { locale: string } }) {
  const dict = getDictionary(params.locale).blog;

  return (
    <main>
      <div className="contentPage">
        <h1>{dict.title}</h1>
        <p>{dict.text}</p>
      </div>
    </main>
  );
}
