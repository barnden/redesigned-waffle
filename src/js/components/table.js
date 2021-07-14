class TableCell {
    constructor(parent, editable = false, align = "left", flexGrow = 1) {
        if (!(parent instanceof TableRow))
            throw "[TableCell] Expected parent of type 'TableRow'."

        this.parent = parent
        this.editable = editable
        this.setup(align, flexGrow)
    }

    setup(align, grow) {
        this.element = document.createElement("div")

        Utils.setStyle(this.element, {
            flexShrink: "0",
            flexBasis: "0"
        })

        if (this.editable)
            this.setupEditable()

        this.parent.element.appendChild(this.element)

        this.align = align
        this.grow = grow
    }

    setupEditable() {
        if (typeof (this.parent.header) !== "undefined")
            return

        const remove = _ => {
            if (typeof (this.editor) === "undefined")
                return

            this.content = this.editor.value
            this.editor.remove()
            this.editor = undefined
        }

        this.element.addEventListener("dblclick", _ => {
            if (typeof (this.editor) !== "undefined")
                return

            this.editor = document.createElement("input")

            this.editor.value = [this.content, this.content = ""][0]
            this.editor.type = "text"

            this.editor.addEventListener("focusout", remove)
            this.editor.addEventListener("keydown", e => {
                if (e.key === "Enter")
                    remove()
            })

            this.element.appendChild(this.editor)
            this.editor.focus()
        })
    }

    set content(data) {
        if (!(this.element instanceof HTMLElement))
            throw "[TableCell] Attempted to set content before setup()."

        this.element.innerHTML = data
        this._data = data

        const row = this.parent
        const header = row.parent.properties.header

        if (row.header || row.columns.length != header.columns.length)
            return

        const maxWidth = ~~header.columns[this.index].element.getBoundingClientRect().width

        if (this.width > maxWidth) {
            this.element.classList.add("ellipsis")

            if (_DEBUG)
                console.log(
                    `element exceeded bounds:\n\t`,
                    `column: ${this.index}, content: ${this.content}\n\t`,
                    `width: ${this.width} px, maxWidth: ${maxWidth} px`
                )

            this.element.style.maxWidth = maxWidth + "px"
        } else {
            this.element.classList.remove("ellipsis")
        }
    }

    get content() {
        if (!(this.element instanceof HTMLElement))
            throw "[TableCell] Attempted to get content before setup()."

        return this._data || ""
    }

    set align(align) {
        if (!(this.element instanceof HTMLElement))
            throw "[TableCell] Attempted to set align before setup()."

        if (!["left", "center", "right"].includes(align))
            throw `[TableCell] Invalid alignment "${align}" specified.`

        if (align == "left")
            return

        this.element.style.textAlign = align
    }

    get align() {
        if (!(this.element instanceof HTMLElement))
            throw "[TableCell] Attempted to get align before setup()."

        return this.element.style.textAlign || "left"
    }

    set grow(flexGrow) {
        if (!(this.element instanceof HTMLElement))
            throw "[TableCell] Attempted to set grow before setup()."

        this.element.style.flexGrow = flexGrow
    }

    get grow() {
        if (!(this.element instanceof HTMLElement))
            throw "[TableCell] Attempted to get grow before setup()."

        return parseInt(this.element.style.flexGrow) || 0
    }

    get boundingBox() {
        return this.element.getBoundingClientRect()
    }

    get width() {
        return ~~this.boundingBox.width
    }

    get height() {
        return ~~this.boundingBox.height
    }
}

class TableRow {
    constructor(parent, draggable = true, rank = 0) {
        if (!(parent instanceof Table))
            throw "[TableRow] Expected parent of type 'Table'."

        this.parent = parent
        this.drag = draggable
        this.columns = []
        this.height = 0

        this.setup(rank)
    }

    setup(rank) {
        this.element = document.createElement("div")
        this.rank = rank

        this.element.style.top = this.parent.getOffset(this.rank) + "px"
        this.element.classList.add("row")

        this.parent.element.appendChild(this.element)

        if (this.drag)
            this.setupDrag()
    }

    setupDrag() {
        const drag = new Draggable(this.element, undefined, this.parent.element)
        const rowHeight = this.parent.properties.rowHeight

        drag.addHook("dragstart", _ => {
            Utils.setStyles(
                [this.element, {
                    transition: null,
                    zIndex: 1
                }],
                [this.parent.element, { userSelect: "none" }]
            )
        })

        drag.addHook("dragend", _ => {
            const currentRank = this.parent.getRank(this.y + rowHeight / 2)

            if (this.rank != currentRank)
                this.rank = currentRank

            Utils.setStyle(this.element, {
                left: null,
                top: this.parent.getOffset(this.rank) + "px",
                transition: "top 100ms",
                zIndex: 0
            })

            return false
        })

        drag.addHook("dragpostmove", data => {
            const top = data[2] + rowHeight / 2
            const currentRank = this.parent.getRank(top)

            if (this.rank == currentRank)
                return false

            this.rank = currentRank
            this.parent.shift(currentRank)

            return false
        })

        this.drag = drag
    }

    addColumn(content, editable, align = "left", flexGrow) {
        const column = new TableCell(this, editable, align, flexGrow)

        column.index = this.columns.length
        column.content = content

        this.height = Math.max(this.height, column.height)

        this.columns.push(column)

        return column
    }

    get y() {
        return parseInt(this.element.style.top) || 0
    }

    get x() {
        return parseInt(this.element.style.left) || 0
    }

    get rank() {
        return parseInt(this.element.getAttribute("data-rank")) || 0
    }

    set rank(n) {
        this.element.setAttribute("data-rank", n)
    }
}

class Table {
    constructor(parent) {
        if (!(parent instanceof HTMLElement))
            parent = document.body

        this.parent = parent
        this.properties = {
            header: null,
            rows: [],
            rowHeight: 0,
            get headerHeight() { return this.header.height }
        }

        this.setup()
    }

    getRank(top) {
        top /= this.properties.rowHeight

        if (!this.properties.header)
            return ~~top

        top -= this.properties.headerHeight / this.properties.rowHeight

        return Math.max(~~top + 1, 1)
    }

    getOffset(rank) {
        const offset = rank * this.properties.rowHeight

        if (!this.properties.header)
            return offset

        return offset - this.properties.rowHeight + this.properties.headerHeight
    }

    setup() {
        this.element = document.createElement("div")

        this.element.classList.add("table")

        this.parent.appendChild(this.element)

        if (this.properties.rowHeight == 0)
            this.properties.rowHeight = Utils.getElementHeight(this.element, {
                class: "row",
                innerHTML: "<div>M</div>"
            })

        if (_DEBUG)
            console.debug(`[Table] Computed line height is ${this.properties.rowHeight}px.`)
    }

    addColumn(title, editable, align, flexGrow) {
        let header = this.properties.header

        if (header == null) {
            this.properties.header = header = new TableRow(this, false)

            header.element.classList.add("header")
            header.header = true
        }

        const prevHeight = header.height
        header.addColumn(title, editable, align, flexGrow)

        if (prevHeight != header.height)
            this.height += header.height - prevHeight

        return this
    }

    addRow() {
        const header = this.properties.header
        const rank = this.properties.rows.length + (header != null)
        const row = new TableRow(this, true, rank)

        this.properties.rows.push(row)
        this.height += this.properties.rowHeight

        const getParams = i => {
            if (header == null)
                return []

            const column = header.columns[i]

            return [
                column.editable,
                column.align,
                column.grow
            ]
        }

        Array.from(arguments).forEach(
            (arg, i) => row.addColumn(arg, ...getParams(i))
        )

        for (let i = row.columns.length; i < header.columns.length; i++)
            row.addColumn("", ...getParams(i))

        return this
    }

    /**
     * Shifts all rows such that there is a gap between rows at rank.
     * @param {number} rank 
     */
    shift(rank) {
        this.properties.rows.sort(
            (a, b) => a.rank > b.rank
        )
        let i = this.properties.header != null

        this.properties.rows.forEach(v => {
            if (v.element.getAttribute("data-dragged") != null)
                return

            if ((v.rank = i++) >= rank)
                v.rank++

            Utils.setStyle(v.element, {
                top: this.getOffset(v.rank) + "px",
                transition: "top 100ms"
            })
        })
    }

    get height() {
        return this.element.getBoundingClientRect().height
    }

    set height(height) {
        this.element.style.height = height + "px"
    }
}
