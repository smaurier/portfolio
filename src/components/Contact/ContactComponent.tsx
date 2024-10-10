'use client'

import Button from "../Button/Button";
import InputFieldComponent from "../Form/InputField";
import TextAreaComponent from "../Form/TextAreaField";

function ContactComponent() {
    const emailType = {
        type: 'email',
        placeholder: 'Votre email pour vous recontacter',
        id: 'username',
        name: 'username'
    }

    const nameType = {
        type: 'text',
        placeholder: 'Votre nom',
        id: 'full-name',
        name: 'fullname'
    }

    const messageType = {
        type: 'text',
        placeholder: 'Votre message',
        id: 'message',
        name: 'message',
        rows: 5
    }

    const button = [
        'med', '123'
    ]

    return (
        <div className={`w-1/2 mx-auto mt-10 my-auto`}>
            <form action='#' className={`bg-white shadow-2xl rounded px-8 pt-6 pb-8 mb-4 mt-4`}
                onSubmit={submitContactMessage}>
                <div id="login-box" className={`text-center mb-4`}>
                    <span className={`mx-auto`}>
                        Besoin d'un site Internet, de conseil, de maintenance ... ? <br /> Envoyez moi un message ! 
                    </span>
                </div>
                <div className={`mb-3 mt-10`}>
                    <InputFieldComponent type={emailType} />
                    <div id={`username-required`} className={`error-message`} />
                </div>

                <div className={`mb-3 mt-10`}>
                    <InputFieldComponent type={nameType} />
                    <div id={`fullname-required`} className={`error-message`} />
                </div>

                <div className={`mb-3 mt-10`}>
                    <TextAreaComponent type={messageType} />
                    <div id={`message-required`} className={`error-message`} />
                </div>

                <div className={`mb-3 mt-10`}>
                    <Button size={button}>Envoi</Button>
                </div>

                <div id={`message-success`} className={`text-green-500 italic text-sm mt-1`} />

            </form>
        </div>
    )
}

function submitContactMessage(event) {
    event.preventDefault()

    const userEmail = event.target.username.value
    const userFullName = event.target.fullname.value
    const userMessage = event.target.message.value

    if (!userEmail) {
        document.getElementById('username-required').innerHTML = 'J\'ai besoin de votre email pour vous répondre'
    }
    if (!userFullName) {
        document.getElementById('fullname-required').innerHTML = 'Il me faut votre nom pour vous répondre'
    }
    if (!userMessage) {
        document.getElementById('message-required').innerHTML = 'Détaillez moi votre problème pour que je puisse vous aider ;) '
        return
    }

    document.getElementById('message-success').innerHTML =
        'Merci de m\'avoir contacté. Je vous recontacterai dès que possible.'
}

export default ContactComponent
