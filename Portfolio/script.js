const text = "Front-End Developer learning Python and building real-world projects.";

const typingElement = document.querySelector(".hero p");

let index = 0;

function typeText() {
    if (index < text.length) {
        typingElement.textContent += text.charAt(index);
        index++;
        setTimeout(typeText, 35);
    }
}

typingElement.textContent = "";

typeText();

const menuBtn = document.getElementById("menuBtn");
const navLinks = document.getElementById("navLinks");

menuBtn.addEventListener("click", () => {
    navLinks.classList.toggle("show");
});