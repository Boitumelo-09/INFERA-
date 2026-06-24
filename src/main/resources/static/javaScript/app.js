const navbar = document.querySelector(".infera-navbar");

window.addEventListener("scroll", () => {

    navbar.classList.toggle(
        "scrolled",
        window.scrollY > 50
    );

});

const words = [
    "Store Knowledge.",
    "Store Research.",
    "Store Understanding.",
    "Build Intelligence.",
    "Build Empathy.",
    "Build Connections.",
    "Build Trust."
];

let index = 0;

setInterval(() => {

    document.getElementById("typing")
        .textContent = words[index];

    index = (index + 1) % words.length;

}, 2000);

const observer = new IntersectionObserver(entries => {

    entries.forEach(entry => {

        if(entry.isIntersecting){

            entry.target.classList.add("active");

        }

    });

});

document.querySelectorAll(".reveal")
    .forEach(el => observer.observe(el));