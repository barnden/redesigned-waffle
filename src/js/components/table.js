class TableCell {
    constructor(parent, editable = false, align = "left", basis = "100%") {
        if (!(parent instanceof TableRow))
            throw "[TableCell] Expected parent of type 'TableRow'."

        this.parent = parent
        this.editable = editable
        this.setup(align, basis)
    }

    setup(align, basis) {
        this.element = document.createElement("div")

        Utils.setStyle(this.element, {
            flexShrink: 0,
            flexGrow: 0
        })

        if (this.editable)
            this.setupEditable()

        this.parent.element.appendChild(this.element)

        this.align = align
        this.basis = basis
    }

    setupEditable() {
        if (typeof (this.parent.header) !== "undefined")
            return

        const remove = _ => {
            if (typeof (this.editor) === "undefined")
                return

            const content = this.editor.value
            this.editor.remove()
            this.editor = undefined
            this.content = content
        }

        this.element.addEventListener("dblclick", _ => {
            if (typeof (this.editor) !== "undefined")
                return

            this.editor = document.createElement("input")

            this.editor.value = [this.content, this.content = ""][0]
            this.editor.type = "text"

            this.editor.addEventListener("focusout", remove)
            this.editor.addEventListener("keydown", e => {
                if (["Enter", "Escape"].includes(e.key))
                    remove()
            })

            this.element.appendChild(this.editor)
            this.editor.focus()
        })
    }

    set content(data) {
        if (!(this.element instanceof HTMLElement))
            throw "[TableCell] Attempted to set content before setup()."

        this.element.innerHTML = DOMPurify.sanitize(data)
        this._data = data
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

    set basis(n) {
        if (!(this.element instanceof HTMLElement))
            throw "[TableCell] Attempted to set basis before setup()."

        this.element.style.flexBasis = this.element.style.maxWidth = n + "%"
    }

    get basis() {
        if (!(this.element instanceof HTMLElement))
            throw "[TableCell] Attempted to get basis before setup()."

        return parseFloat(this.element.style.flexBasis) || 0
    }

    get boundingBox() {
        return this.element.getBoundingClientRect()
    }

    get width() {
        if (!(this.element instanceof HTMLElement))
            throw "[TableCell] Attempted to get width before setup()."

        return ~~this.boundingBox.width
    }

    get height() {
        if (!(this.element instanceof HTMLElement))
            throw "[TableCell] Attempted to get height before setup()."

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

        this.setup(rank)
    }

    setup(rank) {
        this.element = document.createElement("div")
        this.rank = rank

        this.element.classList.add("row")

        this.parent.element.appendChild(this.element)

        if (this.drag)
            this.setupDrag()
    }

    setupDrag() {
        const drag = new Draggable(this.element, undefined, this.parent.element)

        drag.addHook("dragstart", this.dragstart.bind(this))
        drag.addHook("dragpostmove", this.postmove.bind(this))
        drag.addHook("dragend", this.dragend.bind(this))

        this.drag = drag
    }

    addColumn(content, editable, align, basis) {
        const column = new TableCell(this, editable, align, basis)

        column.index = this.columns.length
        column.content = content

        this.columns.push(column)

        return column
    }

    dragstart() {
        Utils.setStyles(
            [this.element, {
                transition: null,
                zIndex: 1
            }],
            [this.parent.element, { userSelect: "none" }]
        )
    }

    postmove(data) {
        const top = data[2] + this.parent.properties.rowHeight / 2
        const currentRank = this.parent.getRank(top)

        if (this.rank == currentRank)
            return false

        this.parent.shift(this.rank, currentRank)
        this.rank = currentRank

        return false
    }

    dragend() {
        const currentRank = this.parent.getRank(this.y + this.parent.properties.rowHeight / 2)

        if (this.rank != currentRank)
            this.rank = currentRank

        Utils.setStyle(this.element, {
            left: null,
            zIndex: null,
            top: this.parent.getOffset(this.rank),
            transition: "top 100ms"
        })

        return false
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

class TableHeader extends TableRow {
    constructor(parent, draggable = true, rank = 0) {
        super(parent, draggable, rank)

        this.header = true
        this.height = 0
        this.totalWeight = 0
    }

    setup(rank) {
        super.setup(rank)

        this.element.classList.add("header")
    }

    addColumn(content, editable, align, columnWeight) {
        this.totalWeight += columnWeight

        const column = super.addColumn(content, editable, align, 0)

        column.weight = columnWeight

        for (let col of this.columns)
            col.basis = 100 * (col.weight / this.totalWeight)

        return column
    }

    computeHeight() {
        this.height = 0

        for (let col of this.columns)
            this.height = Math.max(this.height, col.height)
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
        let offset = rank * this.properties.rowHeight

        if (!this.properties.header)
            return offset

        offset += this.properties.headerHeight - this.properties.rowHeight

        return offset + "px"
    }

    setup() {
        const element = document.createElement("div")
        element.classList.add("table")

        this.element = element
        this.clone = element.cloneNode()

        this.parent.appendChild(this.clone)

        this.properties.rowHeight = Utils.getElementHeight(this.clone, {
            class: "row",
            innerHTML: "<div class=\"row\"><div>M<div></div>"
        })

        this.clone.innerHTML = ""

        if (_DEBUG)
            console.debug(`[Table] Computed line height is ${this.properties.rowHeight}px.`)

        this.resizeObserver = new ResizeObserver(_ => this.reposition())
        this.resizeObserver.observe(this.element)
    }

    addColumn(title, editable, align, columnWeight = 1) {
        let header = this.properties.header

        this.swap()

        if (header == null)
            this.properties.header = header = new TableHeader(this, false)

        const prevHeight = header.height
        header.addColumn(title, editable, align, columnWeight)

        if (prevHeight < header.height)
            this.height += header.height - prevHeight

        this.swap()

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
                column.basis
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
    shift(initialRank, currentRank) {
        const start = Math.max(Math.min(initialRank, currentRank) - 1, 0)
        const end = Math.max(initialRank, currentRank)
        const shiftDown = initialRank > currentRank
        const rows = this.properties.rows

        rows.sort(
            (a, b) => a.rank > b.rank
        )

        for (let i = start; i < end; i++) {
            const row = rows[i]

            if (row.element.getAttribute("data-dragged") != null)
                continue

            row.rank += shiftDown ? 1 : -1

            Utils.setStyle(row.element, {
                top: this.getOffset(row.rank),
                transition: "top 100ms"
            })
        }
    }

    reposition() {
        this.properties.header.computeHeight()

        this.properties.rows.forEach(v => v.element.style.top = this.getOffset(v.rank))
    }

    done() {
        this.parent.appendChild(this.element)

        this.reposition()

        this.element.appendChild(this.clone.childNodes[0])

        this.parent.removeChild(this.clone)
    }

    swap() {
        this.element = [this.clone, this.clone = this.element][0]
    }

    get height() {
        return parseInt(this.element.style.height) || 0
    }

    set height(height) {
        this.element.style.height = height + "px"
    }
}
