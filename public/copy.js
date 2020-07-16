const button = document.getElementById("copy");
const link = document.getElementById("link").href;

let div = document.getElementById("output")

button.addEventListener("click", copy);

function copy() {

    let temp = document.createElement("textarea");
    document.body.appendChild(temp);
    temp.value = link
    temp.select();

    document.execCommand("copy");

    if (!document.getElementById("p")) {
        let p = document.createElement("p")
        div.appendChild(p)
        p.id = "p"
        p.innerText = "URL copied successfully!"
    }

    document.body.removeChild(temp)
}
