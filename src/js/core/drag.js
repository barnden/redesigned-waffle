class Draggable {
    constructor(draggable, parent, container) {
        if (!(draggable instanceof HTMLElement))
            throw "[Draggable] Expected type HTMLElement for interactive."

        if (!(parent instanceof HTMLElement))
            parent = draggable

        this.previousPosition = [0, 0]

        this.draggable = draggable
        this.parent = parent
        this.container = container

        this.hooks = {
            mouseup: [],
            mousemove: [],
            mousedown: []
        }

        this.setup()
    }

    setup() {
        this.draggable.addEventListener("mousedown", this.startHandler)
        this.draggable.addEventListener("touchstart", this.startHandler)

        document.addEventListener("mouseup", this.stopHandler)
        document.addEventListener("touchend", this.stopHandler)
    }

    /**
     * Executes event hooks.
     * @param {string} event
     * @returns {boolean} "true" if error, "false" otherwise.
     */
    executeHooks(event) {
        let error = false

        // TODO: Should we early exit if error?
        if (this.hooks.hasOwnProperty(event) && this.hooks[event].length)
            for (let hook of this.hooks[event])
                if (typeof (hook) === "function")
                    error |= hook(event)

        return error
    }

    getCoordinates(e) {
        const coords = (typeof (e.touches) === "undefined") ? e : e.touches[0]

        return [coords.clientX, coords.clientY]
    }

    dragHandler = e => {
        e.preventDefault()

        if (this.executeHooks("mousemove"))
            return

        const [cx, cy] = this.getCoordinates(e)

        const x = this.parent.offsetLeft - this.previousPosition[0] + cx
        const y = this.parent.offsetTop - this.previousPosition[1] + cy

        let left = x
        let top = y

        if (this.container instanceof HTMLElement) {
            const box = this.parent.getBoundingClientRect()
            const container = this.container.getBoundingClientRect()
            const collision = this.detect(x, y)

            switch (collision & 5) {
                case 0:
                    this.previousPosition[0] = cx
                    break
                case 1:
                    left = 0
                    break
                case 4:
                    left = container.width - box.width - 1
                    break
            }

            switch (collision & 10) {
                case 0:
                    this.previousPosition[1] = cy
                    break
                case 2:
                    top = container.height - box.height - 1
                    break
                case 8:
                    top = 0
                    break
            }
        } else {
            this.previousPosition = [cx, cy]
        }

        this.parent.style.left = `${left}px`
        this.parent.style.top = `${top}px`
    }

    startHandler = e => {
        e.preventDefault()

        // Only activate draggable on left mouse
        if (e.type != "touchstart" && e.buttons != 1)
            return

        // Don't apply drag on both parent and draggable
        if (this.parent.hasAttribute("data-dragged"))
            return

        if (this.executeHooks("mousedown"))
            return

        this.previousPosition = this.getCoordinates(e)

        this.parent.setAttribute("data-dragged", "data-dragged")

        document.addEventListener("mousemove", this.dragHandler)
        document.addEventListener("touchmove", this.dragHandler)
    }

    stopHandler = _ => {
        if (!this.parent.hasAttribute("data-dragged"))
            return

        this.executeHooks("mouseup")

        this.parent.removeAttribute("data-dragged")

        document.removeEventListener("mousemove", this.dragHandler)
        document.removeEventListener("touchmove", this.dragHandler)
    }

    /**
     * Detects collision between edges of the parent and container.
     */
    detect(x, y) {
        if (this.container == undefined)
            return 0

        const container = this.container.getBoundingClientRect()
        const box = this.parent.getBoundingClientRect()

        if (typeof (x) === "undefined" || typeof (y) === "undefined") {
            x = box.left - container.left
            y = box.top - container.top
        }

        const top = y < 0
        const right = x > (container.width - box.width)
        const bottom = y > (container.height - box.height)
        const left = x < 0

        return +top << 3 | +right << 2 | +bottom << 1 | +left
    }

    remove(hooks = true) {
        if (hooks)
            this.hooks = {
                mouseup: [],
                mousemove: [],
                mousedown: []
            }

        this.draggable.removeEventListener("mousedown", this.startHandler)
        this.draggable.removeEventListener("touchstart", this.startHandler)

        document.removeEventListener("mouseup", this.stopHandler)
        document.removeEventListener("touchend", this.stopHandler)

        document.removeEventListener("mousemove", this.dragHandler)
        document.removeEventListener("touchmove", this.dragHandler)
    }

    addHook(event, hook) {
        if (this.hooks.hasOwnProperty(event))
            this.hooks[event].push(hook)
    }

    removeHook(event, hook) {
        if (this.hooks.hasOwnProperty(event) && this.hooks[event].includes(hook))
            this.hooks[event].splice(this.hooks[event].indexOf(hook), 1)
    }
}
