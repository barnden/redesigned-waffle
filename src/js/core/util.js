class Utils {
    static getElementHeight(parent, attributes, styles) {
        if (!(parent instanceof HTMLElement))
            throw "[Utils] getLineHeight() expected parent of type 'HTMLElement'."

        const element = document.createElement("div")

        element.innerHTML = "M"

        if (typeof (styles) !== "undefined")
            this.setStyle(element, styles)

        if (typeof (attributes) !== "undefined")
            Object.entries(attributes).forEach(
                ([k, v]) => {
                    if (k == "innerHTML")
                        return (element.innerHTML = v)

                    element.setAttribute(k, v)
                }
            )

        parent.appendChild(element)

        const height = element.getBoundingClientRect().height

        parent.removeChild(element)

        return height
    }

    static setStyle(element, styles) {
        this.setObjectPair(element.style, styles)
    }

    static setStyles() {
        Array.from(arguments).forEach(
            param => this.setStyle(param[0], param[1])
        )
    }

    static setObjectPair(object, pairs) {
        Object.entries(pairs).forEach(
            ([k, v]) => object[k] = v
        )
    }
}
