const button = document.getElementById("helloBtn");

button.addEventListener("click", () => {

    const contactSection = document.getElementById("contact");

    contactSection.scrollIntoView({
        behavior: "smooth"
    });

});