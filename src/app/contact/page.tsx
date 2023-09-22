import ContactForm from "../components/contactForm";
import Header from "../components/header";

export default function Contact() {
  return (
    <>
      <Header />
      <h2>Contactez-moi</h2>
      <p>Utilisez le formulaire ci-dessous pour nous envoyer un message :</p>
      <ContactForm />
    </>
  );
}