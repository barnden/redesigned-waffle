class TableCell {
    constructor(parent, align = "left") {
        if (!(parent instanceof TableRow))
            throw "[TableCell] Expected parent of type 'TableRow'."

        this.parent = parent

        this.setup(align)
    }

    setup(align) {
        const tableProps = this.parent.parent.properties
        this.element = document.createElement("div")

        Utils.setElementStyle(this.element, {
            flexGrow: "1",
            flexShrink: "1",
            flexBasis: "0",
            height: tableProps.rowHeight + "px"
        })

        this.parent.element.appendChild(this.element)

        this.align = align
    }

    set content(data) {
        if (!(this.element instanceof HTMLElement))
            throw "[TableCell] Attempted to set content before setup()."

        this.element.innerHTML = data
    }

    get content() {
        if (!(this.element instanceof HTMLElement))
            throw "[TableCell] Attempted to get content before setup()."

        return this.element.innerHTML
    }

    set align(align) {
        if (!(this.element instanceof HTMLElement))
            throw "[TableCell] Attempted to set align before setup()."

        if (!["left", "center", "right"].includes(align))
            throw `[TableCell] Invalid alignment "${align}" specified.`

        this.element.style.textAlign = align
    }

    get align() {
        if (!(this.element instanceof HTMLElement))
            throw "[TableCell] Attempted to get align before setup()."

        return this.element.style.textAlign
    }
}

class TableRow {
    constructor(parent, draggable = true, rank = 0) {
        if (!(parent instanceof Table))
            throw "[TableRow] Expected parent of type 'Table'."

        this.parent = parent
        this.drag = draggable
        this.rank = rank
        this.columns = []

        this.setup()
    }

    setup() {
        this.element = document.createElement("div")

        Utils.setElementStyle(this.element, {
            position: "absolute",
            display: "flex",
            height: this.parent.properties.rowHeight + "px",
            width: "100%",
            top: this.parent.properties.rowHeight * this.rank + "px"
        })

        this.parent.element.appendChild(this.element)

        if (this.drag)
            this.setupDrag()
    }

    setupDrag() {
        this.drag = new Draggable(this.element, undefined, this.parent.element)

        this.drag.addHook("mouseup", _ => {
            const rowHeight = this.parent.properties.rowHeight
            const top = (parseInt(this.element.style.top) || 0) + rowHeight / 2

            this.rank = ~~((top + 1) / rowHeight) || 1
            this.element.style.top = this.rank * rowHeight + "px"
            this.element.style.left = null

            if (_DEBUG >= 3) {
                console.debug(`[TableRow] Row top: ${top}px, computed rank: ${this.rank}, computed top: ${this.element.style.top}`)
            }
        })
    }

    addColumn(content, align = "left") {
        const column = new TableCell(this)

        column.content = content
        column.align = align

        this.columns.push(column)
    }
}

class Table {
    constructor(parent, rowHeight = 0) {
        if (!(parent instanceof HTMLElement))
            parent = document.body

        this.parent = parent
        this.properties = {
            header: null,
            rows: [],
            rowHeight: rowHeight
        }

        this.setup()
    }

    setup() {
        this.element = document.createElement("div")

        Utils.setElementStyle(this.element, {
            position: "relative",
            width: "100%"
        })

        if (this.properties.rowHeight == 0)
            this.properties.rowHeight = Utils.getElementHeight(this.parent)

        this.parent.appendChild(this.element)

        if (_DEBUG)
            console.debug(`[Table] Computed line height is ${this.properties.rowHeight}px.`)
    }

    get height() {
        return this.element.getBoundingClientRect().height
    }

    set height(height) {
        this.element.style.height = height + "px"
    }

    addColumn(title, align) {
        let header = this.properties.header

        if (header == null) {
            this.properties.header = header = new TableRow(this, false)
            this.height += this.properties.rowHeight
        }

        header.addColumn(title, align)

        return this
    }

    addRow() {
        const header = this.properties.header
        const rank = this.properties.rows.length + (header != null)
        const row = new TableRow(this, true, rank)

        this.properties.rows.push(row)

        this.height += this.properties.rowHeight

        const getAlignment = i => header != null ? header.columns[i].align : "left"

        Array.from(arguments).forEach(
            (arg, i) => row.addColumn(arg, getAlignment(i))
        )

        for (let i = row.columns.length; i < header.columns.length; i++)
            row.addColumn("", getAlignment(i))

        return this
    }
}
