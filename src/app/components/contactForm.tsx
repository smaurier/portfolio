"use client"

import { useState } from "react";

function ContactForm() {
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    message: '',
  });

  const handleChange(event) {
    const { name, value } = event.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  return (
    <form method="POST" data-netlify="true">
      <div>
        <label htmlFor="name">Nom :</label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
        />
      </div>
      <div>
        <label htmlFor="subject">Objet :</label>
        <input
          type="text"
          id="subject"
          name="subject"
          value={formData.subject}
          onChange={handleChange}
          required
        />
      </div>
      <div>
        <label htmlFor="message">Texte à envoyer :</label>
        <textarea
          id="message"
          name="message"
          value={formData.message}
          onChange={handleChange}
          required
        ></textarea>
      </div>
      <div>
        <button type="submit">Envoyer</button>
      </div>
    </form>
  );
}

export default ContactForm;