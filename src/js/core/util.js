const Utils = {
    getLineHeight: parent => {
        if (!(parent instanceof HTMLElement))
            throw "[util.js] getLineHeight() expected parent of type 'HTMLElement'."

        const element = document.createElement("div")

        element.style.margin = "0"
        element.style.padding = "0"

        element.innerHTML = "M"

        parent.appendChild(element)

        const height = element.getBoundingClientRect().height

        parent.removeChild(element)

        return height
    },
    setElementStyle: (element, styles) => Object.entries(styles).forEach(
        ([k, v]) => element.style[k] = v
    )
}
