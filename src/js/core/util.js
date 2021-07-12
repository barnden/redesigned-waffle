class Utils {
    static getElementHeight(parent, attributes, styles) {
        if (!(parent instanceof HTMLElement))
            throw "[Utils] getLineHeight() expected parent of type 'HTMLElement'."

        const element = document.createElement("div")

        element.innerHTML = "M"
        element.style.margin = element.style.padding = "0"

        if (typeof (styles) !== "undefined")
            this.setElementStyle(element, styles)

        if (typeof (attributes) !== "undefined")
            Object.entries(attributes).forEach(
                ([k, v]) => element.setAttribute(k, v)
            )

        parent.appendChild(element)

        const height = element.getBoundingClientRect().height

        parent.removeChild(element)

        return height
    }

    static setElementStyle(element, styles) {
        this.setObjectPair(element.style, styles)
    }

    static setObjectPair(object, pairs) {
        Object.entries(pairs).forEach(
            ([k, v]) => object[k] = v
        )
    }
}
