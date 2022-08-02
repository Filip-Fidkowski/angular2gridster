const GridCol = function (lanes) {
    for (let i = 0; i < lanes; i++) {
        this.push(null);
    }
};
// Extend the Array prototype
GridCol.prototype = [];
/**
 * A GridList manages the two-dimensional positions from a list of items,
 * within a virtual matrix.
 *
 * The GridList's main function is to convert the item positions from one
 * grid size to another, maintaining as much of their order as possible.
 *
 * The GridList's second function is to handle collisions when moving an item
 * over another.
 *
 * The positioning algorithm places items in columns. Starting from left to
 * right, going through each column top to bottom.
 *
 * The size of an item is expressed using the number of cols and rows it
 * takes up within the grid (w and h)
 *
 * The position of an item is express using the col and row position within
 * the grid (x and y)
 *
 * An item is an object of structure:
 * {
 *   w: 3, h: 1,
 *   x: 0, y: 1
 * }
 */
export class GridList {
    constructor(items, options) {
        this.options = options;
        this.items = items;
        this.adjustSizeOfItems();
        this.generateGrid();
    }
    /**
     * Illustrates grid as text-based table, using a number identifier for each
     * item. E.g.
     *
     *  #|  0  1  2  3  4  5  6  7  8  9 10 11 12 13
     *  --------------------------------------------
     *  0| 00 02 03 04 04 06 08 08 08 12 12 13 14 16
     *  1| 01 -- 03 05 05 07 09 10 11 11 -- 13 15 --
     *
     * Warn: Does not work if items don't have a width or height specified
     * besides their position in the grid.
     */
    toString() {
        const widthOfGrid = this.grid.length;
        let output = '\n #|', border = '\n --', item, i, j;
        // Render the table header
        for (i = 0; i < widthOfGrid; i++) {
            output += ' ' + this.padNumber(i, ' ');
            border += '---';
        }
        output += border;
        // Render table contents row by row, as we go on the y axis
        for (i = 0; i < this.options.lanes; i++) {
            output += '\n' + this.padNumber(i, ' ') + '|';
            for (j = 0; j < widthOfGrid; j++) {
                output += ' ';
                item = this.grid[j][i];
                output += item
                    ? this.padNumber(this.items.indexOf(item), '0')
                    : '--';
            }
        }
        output += '\n';
        return output;
    }
    setOption(name, value) {
        this.options[name] = value;
    }
    /**
     * Build the grid structure from scratch, with the current item positions
     */
    generateGrid() {
        let i;
        this.resetGrid();
        for (i = 0; i < this.items.length; i++) {
            this.markItemPositionToGrid(this.items[i]);
        }
    }
    resizeGrid(lanes) {
        let currentColumn = 0;
        this.options.lanes = lanes;
        this.adjustSizeOfItems();
        this.sortItemsByPosition();
        this.resetGrid();
        // The items will be sorted based on their index within the this.items array,
        // that is their "1d position"
        for (let i = 0; i < this.items.length; i++) {
            const item = this.items[i], position = this.getItemPosition(item);
            this.updateItemPosition(item, this.findPositionForItem(item, { x: currentColumn, y: 0 }));
            // New items should never be placed to the left of previous items
            currentColumn = Math.max(currentColumn, position.x);
        }
        this.pullItemsToLeft();
    }
    /**
     * This method has two options for the position we want for the item:
     * - Starting from a certain row/column number and only looking for
     *   positions to its right
     * - Accepting positions for a certain row number only (use-case: items
     *   being shifted to the left/right as a result of collisions)
     *
     * @param Object item
     * @param Object start Position from which to start
     *     the search.
     * @param number [fixedRow] If provided, we're going to try to find a
     *     position for the new item on it. If doesn't fit there, we're going
     *     to put it on the first row.
     *
     * @returns Array x and y.
     */
    findPositionForItem(item, start, fixedRow) {
        let x, y, position;
        // Start searching for a position from the horizontal position of the
        // rightmost item from the grid
        for (x = start.x; x < this.grid.length; x++) {
            if (fixedRow !== undefined) {
                position = [x, fixedRow];
                if (this.itemFitsAtPosition(item, position)) {
                    return position;
                }
            }
            else {
                for (y = start.y; y < this.options.lanes; y++) {
                    position = [x, y];
                    if (this.itemFitsAtPosition(item, position)) {
                        return position;
                    }
                }
            }
        }
        // If we've reached this point, we need to start a new column
        const newCol = this.grid.length;
        let newRow = 0;
        if (fixedRow !== undefined &&
            this.itemFitsAtPosition(item, [newCol, fixedRow])) {
            newRow = fixedRow;
        }
        return [newCol, newRow];
    }
    moveAndResize(item, newPosition, size) {
        const position = this.getItemPosition({
            x: newPosition[0],
            y: newPosition[1],
            w: item.w,
            h: item.h
        });
        const width = size.w || item.w, height = size.h || item.h;
        this.updateItemPosition(item, [position.x, position.y]);
        this.updateItemSize(item, width, height);
        this.resolveCollisions(item);
    }
    moveItemToPosition(item, newPosition) {
        const position = this.getItemPosition({
            x: newPosition[0],
            y: newPosition[1],
            w: item.w,
            h: item.h
        });
        this.updateItemPosition(item, [position.x, position.y]);
        this.resolveCollisions(item);
    }
    /**
     * Resize an item and resolve collisions.
     *
     * @param Object item A reference to an item that's part of the grid.
     * @param Object size
     * @param number [size.w=item.w] The new width.
     * @param number [size.h=item.h] The new height.
     */
    resizeItem(item, size) {
        const width = size.w || item.w, height = size.h || item.h;
        this.updateItemSize(item, width, height);
        this.pullItemsToLeft(item);
    }
    /**
     * Compare the current items against a previous snapshot and return only
     * the ones that changed their attributes in the meantime. This includes both
     * position (x, y) and size (w, h)
     *
     * Each item that is returned is not the GridListItem but the helper that holds GridListItem
     * and list of changed properties.
     */
    getChangedItems(initialItems, breakpoint) {
        return this.items
            .map((item) => {
            const changes = [];
            const oldValues = {};
            const initItem = initialItems.find(initItm => initItm.$element === item.$element);
            if (!initItem) {
                return { item, changes: ['x', 'y', 'w', 'h'], isNew: true };
            }
            const oldX = initItem.getValueX(breakpoint);
            if (item.getValueX(breakpoint) !== oldX) {
                changes.push('x');
                if (oldX || oldX === 0) {
                    oldValues.x = oldX;
                }
            }
            const oldY = initItem.getValueY(breakpoint);
            if (item.getValueY(breakpoint) !== oldY) {
                changes.push('y');
                if (oldY || oldY === 0) {
                    oldValues.y = oldY;
                }
            }
            if (item.getValueW(breakpoint) !==
                initItem.getValueW(breakpoint)) {
                changes.push('w');
                oldValues.w = initItem.w;
            }
            if (item.getValueH(breakpoint) !==
                initItem.getValueH(breakpoint)) {
                changes.push('h');
                oldValues.h = initItem.h;
            }
            return { item, oldValues, changes, isNew: false };
        })
            .filter((itemChange) => {
            return itemChange.changes.length;
        });
    }
    resolveCollisions(item) {
        if (!this.tryToResolveCollisionsLocally(item)) {
            this.pullItemsToLeft(item);
        }
        if (this.options.floating) {
            this.pullItemsToLeft();
        }
        else if (this.getItemsCollidingWithItem(item).length) {
            this.pullItemsToLeft();
        }
    }
    pushCollidingItems(fixedItem) {
        // Start a fresh grid with the fixed item already placed inside
        this.sortItemsByPosition();
        this.resetGrid();
        this.generateGrid();
        this.items
            .filter(item => !this.isItemFloating(item) && item !== fixedItem)
            .forEach(item => {
            if (!this.tryToResolveCollisionsLocally(item)) {
                this.pullItemsToLeft(item);
            }
        });
    }
    /**
     * Build the grid from scratch, by using the current item positions and
     * pulling them as much to the left as possible, removing as space between
     * them as possible.
     *
     * If a "fixed item" is provided, its position will be kept intact and the
     * rest of the items will be layed around it.
     */
    pullItemsToLeft(fixedItem) {
        if (this.options.direction === 'none') {
            return;
        }
        // Start a fresh grid with the fixed item already placed inside
        this.sortItemsByPosition();
        this.resetGrid();
        // Start the grid with the fixed item as the first positioned item
        if (fixedItem) {
            const fixedPosition = this.getItemPosition(fixedItem);
            this.updateItemPosition(fixedItem, [
                fixedPosition.x,
                fixedPosition.y
            ]);
        }
        this.items
            .filter((item) => {
            return !item.dragAndDrop && item !== fixedItem;
        })
            .forEach((item) => {
            const fixedPosition = this.getItemPosition(item);
            this.updateItemPosition(item, [
                fixedPosition.x,
                fixedPosition.y
            ]);
        });
        for (let i = 0; i < this.items.length; i++) {
            const item = this.items[i], position = this.getItemPosition(item);
            // The fixed item keeps its exact position
            if ((fixedItem && item === fixedItem) ||
                !item.dragAndDrop ||
                (!this.options.floating &&
                    this.isItemFloating(item) &&
                    !this.getItemsCollidingWithItem(item).length)) {
                continue;
            }
            const x = this.findLeftMostPositionForItem(item), newPosition = this.findPositionForItem(item, { x: x, y: 0 }, position.y);
            this.updateItemPosition(item, newPosition);
        }
    }
    isOverFixedArea(x, y, w, h, item = null) {
        let itemData = { x, y, w, h };
        if (this.options.direction !== 'horizontal') {
            itemData = { x: y, y: x, w: h, h: w };
        }
        for (let i = itemData.x; i < itemData.x + itemData.w; i++) {
            for (let j = itemData.y; j < itemData.y + itemData.h; j++) {
                if (this.grid[i] &&
                    this.grid[i][j] &&
                    this.grid[i][j] !== item &&
                    !this.grid[i][j].dragAndDrop) {
                    return true;
                }
            }
        }
        return false;
    }
    checkItemAboveEmptyArea(item, newPosition) {
        let itemData = {
            x: newPosition.x,
            y: newPosition.y,
            w: item.w,
            h: item.h
        };
        if (!item.itemPrototype &&
            item.x === newPosition.x &&
            item.y === newPosition.y) {
            return true;
        }
        if (this.options.direction === 'horizontal') {
            itemData = {
                x: newPosition.y,
                y: newPosition.x,
                w: itemData.h,
                h: itemData.w
            };
        }
        return !this.checkItemsInArea(itemData.y, itemData.y + itemData.h - 1, itemData.x, itemData.x + itemData.w - 1, item);
    }
    fixItemsPositions(options) {
        // items with x, y that fits gird with size of options.lanes
        const validItems = this.items
            .filter((item) => item.itemComponent)
            .filter((item) => this.isItemValidForGrid(item, options));
        // items that x, y must be generated
        const invalidItems = this.items
            .filter((item) => item.itemComponent)
            .filter((item) => !this.isItemValidForGrid(item, options));
        const gridList = new GridList([], options);
        // put items with defined positions to the grid
        gridList.items = validItems.map((item) => {
            return item.copyForBreakpoint(options.breakpoint);
        });
        gridList.generateGrid();
        invalidItems.forEach(item => {
            // TODO: check if this change does not broke anything
            // const itemCopy = item.copy();
            const itemCopy = item.copyForBreakpoint(options.breakpoint);
            const position = gridList.findPositionForItem(itemCopy, {
                x: 0,
                y: 0
            });
            gridList.items.push(itemCopy);
            gridList.setItemPosition(itemCopy, position);
            gridList.markItemPositionToGrid(itemCopy);
        });
        gridList.pullItemsToLeft();
        gridList.pushCollidingItems();
        this.items.forEach((itm) => {
            const cachedItem = gridList.items.filter(cachedItm => {
                return cachedItm.$element === itm.$element;
            })[0];
            itm.setValueX(cachedItem.x, options.breakpoint);
            itm.setValueY(cachedItem.y, options.breakpoint);
            itm.setValueW(cachedItem.w, options.breakpoint);
            itm.setValueH(cachedItem.h, options.breakpoint);
            itm.autoSize = cachedItem.autoSize;
        });
    }
    deleteItemPositionFromGrid(item) {
        const position = this.getItemPosition(item);
        let x, y;
        for (x = position.x; x < position.x + position.w; x++) {
            // It can happen to try to remove an item from a position not generated
            // in the grid, probably when loading a persisted grid of items. No need
            // to create a column to be able to remove something from it, though
            if (!this.grid[x]) {
                continue;
            }
            for (y = position.y; y < position.y + position.h; y++) {
                // Don't clear the cell if it's been occupied by a different widget in
                // the meantime (e.g. when an item has been moved over this one, and
                // thus by continuing to clear this item's previous position you would
                // cancel the first item's move, leaving it without any position even)
                if (this.grid[x][y] === item) {
                    this.grid[x][y] = null;
                }
            }
        }
    }
    isItemFloating(item) {
        if (item.itemComponent && item.itemComponent.isDragging) {
            return false;
        }
        const position = this.getItemPosition(item);
        if (position.x === 0) {
            return false;
        }
        const rowBelowItem = this.grid[position.x - 1];
        return (rowBelowItem || [])
            .slice(position.y, position.y + position.h)
            .reduce((isFloating, cellItem) => {
            return isFloating && !cellItem;
        }, true);
    }
    isItemValidForGrid(item, options) {
        const itemData = options.direction === 'horizontal'
            ? {
                x: item.getValueY(options.breakpoint),
                y: item.getValueX(options.breakpoint),
                w: item.getValueH(options.breakpoint),
                h: Math.min(item.getValueW(this.options.breakpoint), options.lanes)
            }
            : {
                x: item.getValueX(options.breakpoint),
                y: item.getValueY(options.breakpoint),
                w: Math.min(item.getValueW(this.options.breakpoint), options.lanes),
                h: item.getValueH(options.breakpoint)
            };
        return (typeof itemData.x === 'number' &&
            typeof itemData.y === 'number' &&
            itemData.x + itemData.w <= options.lanes);
    }
    findDefaultPositionHorizontal(width, height) {
        for (const col of this.grid) {
            const colIdx = this.grid.indexOf(col);
            let rowIdx = 0;
            while (rowIdx < col.length - height + 1) {
                if (!this.checkItemsInArea(colIdx, colIdx + width - 1, rowIdx, rowIdx + height - 1)) {
                    return [colIdx, rowIdx];
                }
                rowIdx++;
            }
        }
        return [this.grid.length, 0];
    }
    findDefaultPositionVertical(width, height) {
        for (const row of this.grid) {
            const rowIdx = this.grid.indexOf(row);
            let colIdx = 0;
            while (colIdx < row.length - width + 1) {
                if (!this.checkItemsInArea(rowIdx, rowIdx + height - 1, colIdx, colIdx + width - 1)) {
                    return [colIdx, rowIdx];
                }
                colIdx++;
            }
        }
        return [0, this.grid.length];
    }
    checkItemsInArea(rowStart, rowEnd, colStart, colEnd, item) {
        for (let i = rowStart; i <= rowEnd; i++) {
            for (let j = colStart; j <= colEnd; j++) {
                if (this.grid[i] &&
                    this.grid[i][j] &&
                    (item ? this.grid[i][j] !== item : true)) {
                    return true;
                }
            }
        }
        return false;
    }
    sortItemsByPosition() {
        this.items.sort((item1, item2) => {
            const position1 = this.getItemPosition(item1), position2 = this.getItemPosition(item2);
            // Try to preserve columns.
            if (position1.x !== position2.x) {
                return position1.x - position2.x;
            }
            if (position1.y !== position2.y) {
                return position1.y - position2.y;
            }
            // The items are placed on the same position.
            return 0;
        });
    }
    /**
     * Some items can have 100% height or 100% width. Those dimmensions are
     * expressed as 0. We need to ensure a valid width and height for each of
     * those items as the number of items per lane.
     */
    adjustSizeOfItems() {
        for (let i = 0; i < this.items.length; i++) {
            const item = this.items[i];
            // This can happen only the first time items are checked.
            // We need the property to have a value for all the items so that the
            // `cloneItems` method will merge the properties properly. If we only set
            // it to the items that need it then the following can happen:
            //
            // cloneItems([{id: 1, autoSize: true}, {id: 2}],
            //            [{id: 2}, {id: 1, autoSize: true}]);
            //
            // will result in
            //
            // [{id: 1, autoSize: true}, {id: 2, autoSize: true}]
            if (item.autoSize === undefined) {
                item.autoSize = item.w === 0 || item.h === 0;
            }
            if (item.autoSize) {
                if (this.options.direction === 'horizontal') {
                    item.h = this.options.lanes;
                }
                else {
                    item.w = this.options.lanes;
                }
            }
        }
    }
    resetGrid() {
        this.grid = [];
    }
    /**
     * Check that an item wouldn't overlap with another one if placed at a
     * certain position within the grid
     */
    itemFitsAtPosition(item, newPosition) {
        const position = this.getItemPosition(item);
        let x, y;
        // No coordonate can be negative
        if (newPosition[0] < 0 || newPosition[1] < 0) {
            return false;
        }
        // Make sure the item isn't larger than the entire grid
        if (newPosition[1] + Math.min(position.h, this.options.lanes) >
            this.options.lanes) {
            return false;
        }
        if (this.isOverFixedArea(item.x, item.y, item.w, item.h)) {
            return false;
        }
        // Make sure the position doesn't overlap with an already positioned
        // item.
        for (x = newPosition[0]; x < newPosition[0] + position.w; x++) {
            const col = this.grid[x];
            // Surely a column that hasn't even been created yet is available
            if (!col) {
                continue;
            }
            for (y = newPosition[1]; y < newPosition[1] + position.h; y++) {
                // Any space occupied by an item can continue to be occupied by the
                // same item.
                if (col[y] && col[y] !== item) {
                    return false;
                }
            }
        }
        return true;
    }
    updateItemPosition(item, position) {
        if (item.x !== null && item.y !== null) {
            this.deleteItemPositionFromGrid(item);
        }
        this.setItemPosition(item, position);
        this.markItemPositionToGrid(item);
    }
    /**
     * @param Object item A reference to a grid item.
     * @param number width The new width.
     * @param number height The new height.
     */
    updateItemSize(item, width, height) {
        if (item.x !== null && item.y !== null) {
            this.deleteItemPositionFromGrid(item);
        }
        item.w = width;
        item.h = height;
        this.markItemPositionToGrid(item);
    }
    /**
     * Mark the grid cells that are occupied by an item. This prevents items
     * from overlapping in the grid
     */
    markItemPositionToGrid(item) {
        const position = this.getItemPosition(item);
        let x, y;
        // Ensure that the grid has enough columns to accomodate the current item.
        this.ensureColumns(position.x + position.w);
        for (x = position.x; x < position.x + position.w; x++) {
            for (y = position.y; y < position.y + position.h; y++) {
                this.grid[x][y] = item;
            }
        }
    }
    /**
     * Ensure that the grid has at least N columns available.
     */
    ensureColumns(N) {
        for (let i = 0; i < N; i++) {
            if (!this.grid[i]) {
                this.grid.push(new GridCol(this.options.lanes));
            }
        }
    }
    getItemsCollidingWithItem(item) {
        const collidingItems = [];
        for (let i = 0; i < this.items.length; i++) {
            if (item !== this.items[i] &&
                this.itemsAreColliding(item, this.items[i])) {
                collidingItems.push(i);
            }
        }
        return collidingItems;
    }
    itemsAreColliding(item1, item2) {
        const position1 = this.getItemPosition(item1), position2 = this.getItemPosition(item2);
        return !(position2.x >= position1.x + position1.w ||
            position2.x + position2.w <= position1.x ||
            position2.y >= position1.y + position1.h ||
            position2.y + position2.h <= position1.y);
    }
    /**
     * Attempt to resolve the collisions after moving an item over one or more
     * other items within the grid, by shifting the position of the colliding
     * items around the moving one. This might result in subsequent collisions,
     * in which case we will revert all position permutations. To be able to
     * revert to the initial item positions, we create a virtual grid in the
     * process
     */
    tryToResolveCollisionsLocally(item) {
        const collidingItems = this.getItemsCollidingWithItem(item);
        if (!collidingItems.length) {
            return true;
        }
        const _gridList = new GridList(this.items.map(itm => {
            return itm.copy();
        }), this.options);
        let leftOfItem;
        let rightOfItem;
        let aboveOfItem;
        let belowOfItem;
        for (let i = 0; i < collidingItems.length; i++) {
            const collidingItem = _gridList.items[collidingItems[i]], collidingPosition = this.getItemPosition(collidingItem);
            // We use a simple algorithm for moving items around when collisions occur:
            // In this prioritized order, we try to move a colliding item around the
            // moving one:
            // 1. to its left side
            // 2. above it
            // 3. under it
            // 4. to its right side
            const position = this.getItemPosition(item);
            leftOfItem = [
                position.x - collidingPosition.w,
                collidingPosition.y
            ];
            rightOfItem = [position.x + position.w, collidingPosition.y];
            aboveOfItem = [
                collidingPosition.x,
                position.y - collidingPosition.h
            ];
            belowOfItem = [collidingPosition.x, position.y + position.h];
            if (_gridList.itemFitsAtPosition(collidingItem, leftOfItem)) {
                _gridList.updateItemPosition(collidingItem, leftOfItem);
            }
            else if (_gridList.itemFitsAtPosition(collidingItem, aboveOfItem)) {
                _gridList.updateItemPosition(collidingItem, aboveOfItem);
            }
            else if (_gridList.itemFitsAtPosition(collidingItem, belowOfItem)) {
                _gridList.updateItemPosition(collidingItem, belowOfItem);
            }
            else if (_gridList.itemFitsAtPosition(collidingItem, rightOfItem)) {
                _gridList.updateItemPosition(collidingItem, rightOfItem);
            }
            else {
                // Collisions failed, we must use the pullItemsToLeft method to arrange
                // the other items around this item with fixed position. This is our
                // plan B for when local collision resolving fails.
                return false;
            }
        }
        // If we reached this point it means we managed to resolve the collisions
        // from one single iteration, just by moving the colliding items around. So
        // we accept this scenario and merge the branched-out grid instance into the
        // original one
        this.items.forEach((itm, idx) => {
            const cachedItem = _gridList.items.filter(cachedItm => {
                return cachedItm.$element === itm.$element;
            })[0];
            itm.x = cachedItem.x;
            itm.y = cachedItem.y;
            itm.w = cachedItem.w;
            itm.h = cachedItem.h;
            itm.autoSize = cachedItem.autoSize;
        });
        this.generateGrid();
        return true;
    }
    /**
     * When pulling items to the left, we need to find the leftmost position for
     * an item, with two considerations in mind:
     * - preserving its current row
     * - preserving the previous horizontal order between items
     */
    findLeftMostPositionForItem(item) {
        let tail = 0;
        const position = this.getItemPosition(item);
        for (let i = 0; i < this.grid.length; i++) {
            for (let j = position.y; j < position.y + position.h; j++) {
                const otherItem = this.grid[i][j];
                if (!otherItem) {
                    continue;
                }
                const otherPosition = this.getItemPosition(otherItem);
                if (this.items.indexOf(otherItem) < this.items.indexOf(item)) {
                    tail = otherPosition.x + otherPosition.w;
                }
            }
        }
        return tail;
    }
    findItemByPosition(x, y) {
        for (let i = 0; i < this.items.length; i++) {
            if (this.items[i].x === x && this.items[i].y === y) {
                return this.items[i];
            }
        }
    }
    getItemByAttribute(key, value) {
        for (let i = 0; i < this.items.length; i++) {
            if (this.items[i][key] === value) {
                return this.items[i];
            }
        }
        return null;
    }
    padNumber(nr, prefix) {
        // Currently works for 2-digit numbers (<100)
        return nr >= 10 ? nr : prefix + nr;
    }
    /**
     * If the direction is vertical we need to rotate the grid 90 deg to the
     * left. Thus, we simulate the fact that items are being pulled to the top.
     *
     * Since the items have widths and heights, if we apply the classic
     * counter-clockwise 90 deg rotation
     *
     *     [0 -1]
     *     [1  0]
     *
     * then the top left point of an item will become the bottom left point of
     * the rotated item. To adjust for this, we need to subtract from the y
     * position the height of the original item - the width of the rotated item.
     *
     * However, if we do this then we'll reverse some actions: resizing the
     * width of an item will stretch the item to the left instead of to the
     * right; resizing an item that doesn't fit into the grid will push the
     * items around it instead of going on a new row, etc.
     *
     * We found it better to do a vertical flip of the grid after rotating it.
     * This restores the direction of the actions and greatly simplifies the
     * transformations.
     */
    getItemPosition(item) {
        if (this.options.direction === 'horizontal') {
            return item;
        }
        else {
            return {
                x: item.y,
                y: item.x,
                w: item.h,
                h: item.w
            };
        }
    }
    /**
     * See getItemPosition.
     */
    setItemPosition(item, position) {
        if (this.options.direction === 'horizontal') {
            item.x = position[0];
            item.y = position[1];
        }
        else {
            // We're supposed to subtract the rotated item's height which is actually
            // the non-rotated item's width.
            item.x = position[1];
            item.y = position[0];
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3JpZExpc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9wcm9qZWN0cy9hbmd1bGFyMmdyaWRzdGVyL3NyYy9saWIvZ3JpZExpc3QvZ3JpZExpc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBR0EsTUFBTSxPQUFPLEdBQUcsVUFBUyxLQUFLO0lBQzFCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLEVBQUUsQ0FBQyxFQUFFLEVBQUU7UUFDNUIsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztLQUNuQjtBQUNMLENBQUMsQ0FBQztBQUNGLDZCQUE2QjtBQUM3QixPQUFPLENBQUMsU0FBUyxHQUFHLEVBQUUsQ0FBQztBQUV2Qjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBd0JHO0FBQ0gsTUFBTSxPQUFPLFFBQVE7SUFNakIsWUFBWSxLQUEwQixFQUFFLE9BQXlCO1FBQzdELElBQUksQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDO1FBRXZCLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO1FBRW5CLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1FBRXpCLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztJQUN4QixDQUFDO0lBRUQ7Ozs7Ozs7Ozs7O09BV0c7SUFDSCxRQUFRO1FBQ0osTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUM7UUFDckMsSUFBSSxNQUFNLEdBQUcsT0FBTyxFQUNoQixNQUFNLEdBQUcsT0FBTyxFQUNoQixJQUFJLEVBQ0osQ0FBQyxFQUNELENBQUMsQ0FBQztRQUVOLDBCQUEwQjtRQUMxQixLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFdBQVcsRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUM5QixNQUFNLElBQUksR0FBRyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLEdBQUcs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Q0FBQzthQUNaLENBQUM7U0FDTDtJQUNMLENBQUM7SUFFRDs7T0FFRztJQUNLLGVBQWUsQ0FBQyxJQUFJLEVBQUUsUUFBUTtRQUNsQyxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxLQUFLLFlBQVksRUFBRTtZQUN6QyxJQUFJLENBQUMsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNyQixJQUFJLENBQUMsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUN4QjthQUFNO1lBQ0gseUVBQXlFO1lBQ3pFLGdDQUFnQztZQUNoQyxJQUFJLENBQUMsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNyQixJQUFJLENBQUMsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUN4QjtJQUNMLENBQUM7Q0FDSiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEdyaWRMaXN0SXRlbSB9IGZyb20gJy4vR3JpZExpc3RJdGVtJztcclxuaW1wb3J0IHsgSUdyaWRzdGVyT3B0aW9ucyB9IGZyb20gJy4uL0lHcmlkc3Rlck9wdGlvbnMnO1xyXG5cclxuY29uc3QgR3JpZENvbCA9IGZ1bmN0aW9uKGxhbmVzKSB7XHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxhbmVzOyBpKyspIHtcclxuICAgICAgICB0aGlzLnB1c2gobnVsbCk7XHJcbiAgICB9XHJcbn07XHJcbi8vIEV4dGVuZCB0aGUgQXJyYXkgcHJvdG90eXBlXHJcbkdyaWRDb2wucHJvdG90eXBlID0gW107XHJcblxyXG4vKipcclxuICogQSBHcmlkTGlzdCBtYW5hZ2VzIHRoZSB0d28tZGltZW5zaW9uYWwgcG9zaXRpb25zIGZyb20gYSBsaXN0IG9mIGl0ZW1zLFxyXG4gKiB3aXRoaW4gYSB2aXJ0dWFsIG1hdHJpeC5cclxuICpcclxuICogVGhlIEdyaWRMaXN0J3MgbWFpbiBmdW5jdGlvbiBpcyB0byBjb252ZXJ0IHRoZSBpdGVtIHBvc2l0aW9ucyBmcm9tIG9uZVxyXG4gKiBncmlkIHNpemUgdG8gYW5vdGhlciwgbWFpbnRhaW5pbmcgYXMgbXVjaCBvZiB0aGVpciBvcmRlciBhcyBwb3NzaWJsZS5cclxuICpcclxuICogVGhlIEdyaWRMaXN0J3Mgc2Vjb25kIGZ1bmN0aW9uIGlzIHRvIGhhbmRsZSBjb2xsaXNpb25zIHdoZW4gbW92aW5nIGFuIGl0ZW1cclxuICogb3ZlciBhbm90aGVyLlxyXG4gKlxyXG4gKiBUaGUgcG9zaXRpb25pbmcgYWxnb3JpdGhtIHBsYWNlcyBpdGVtcyBpbiBjb2x1bW5zLiBTdGFydGluZyBmcm9tIGxlZnQgdG9cclxuICogcmlnaHQsIGdvaW5nIHRocm91Z2ggZWFjaCBjb2x1bW4gdG9wIHRvIGJvdHRvbS5cclxuICpcclxuICogVGhlIHNpemUgb2YgYW4gaXRlbSBpcyBleHByZXNzZWQgdXNpbmcgdGhlIG51bWJlciBvZiBjb2xzIGFuZCByb3dzIGl0XHJcbiAqIHRha2VzIHVwIHdpdGhpbiB0aGUgZ3JpZCAodyBhbmQgaClcclxuICpcclxuICogVGhlIHBvc2l0aW9uIG9mIGFuIGl0ZW0gaXMgZXhwcmVzcyB1c2luZyB0aGUgY29sIGFuZCByb3cgcG9zaXRpb24gd2l0aGluXHJcbiAqIHRoZSBncmlkICh4IGFuZCB5KVxyXG4gKlxyXG4gKiBBbiBpdGVtIGlzIGFuIG9iamVjdCBvZiBzdHJ1Y3R1cmU6XHJcbiAqIHtcclxuICogICB3OiAzLCBoOiAxLFxyXG4gKiAgIHg6IDAsIHk6IDFcclxuICogfVxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIEdyaWRMaXN0IHtcclxuICAgIGl0ZW1zOiBBcnJheTxHcmlkTGlzdEl0ZW0+O1xyXG4gICAgZ3JpZDogQXJyYXk8QXJyYXk8R3JpZExpc3RJdGVtPj47XHJcblxyXG4gICAgb3B0aW9uczogSUdyaWRzdGVyT3B0aW9ucztcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihpdGVtczogQXJyYXk8R3JpZExpc3RJdGVtPiwgb3B0aW9uczogSUdyaWRzdGVyT3B0aW9ucykge1xyXG4gICAgICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XHJcblxyXG4gICAgICAgIHRoaXMuaXRlbXMgPSBpdGVtcztcclxuXHJcbiAgICAgICAgdGhpcy5hZGp1c3RTaXplT2ZJdGVtcygpO1xyXG5cclxuICAgICAgICB0aGlzLmdlbmVyYXRlR3JpZCgpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogSWxsdXN0cmF0ZXMgZ3JpZCBhcyB0ZXh0LWJhc2VkIHRhYmxlLCB1c2luZyBhIG51bWJlciBpZGVudGlmaWVyIGZvciBlYWNoXHJcbiAgICAgKiBpdGVtLiBFLmcuXHJcbiAgICAgKlxyXG4gICAgICogICN8ICAwICAxICAyICAzICA0ICA1ICA2ICA3ICA4ICA5IDEwIDExIDEyIDEzXHJcbiAgICAgKiAgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAgICAqICAwfCAwMCAwMiAwMyAwNCAwNCAwNiAwOCAwOCAwOCAxMiAxMiAxMyAxNCAxNlxyXG4gICAgICogIDF8IDAxIC0tIDAzIDA1IDA1IDA3IDA5IDEwIDExIDExIC0tIDEzIDE1IC0tXHJcbiAgICAgKlxyXG4gICAgICogV2FybjogRG9lcyBub3Qgd29yayBpZiBpdGVtcyBkb24ndCBoYXZlIGEgd2lkdGggb3IgaGVpZ2h0IHNwZWNpZmllZFxyXG4gICAgICogYmVzaWRlcyB0aGVpciBwb3NpdGlvbiBpbiB0aGUgZ3JpZC5cclxuICAgICAqL1xyXG4gICAgdG9TdHJpbmcoKSB7XHJcbiAgICAgICAgY29uc3Qgd2lkdGhPZkdyaWQgPSB0aGlzLmdyaWQubGVuZ3RoO1xyXG4gICAgICAgIGxldCBvdXRwdXQgPSAnXFxuICN8JyxcclxuICAgICAgICAgICAgYm9yZGVyID0gJ1xcbiAtLScsXHJcbiAgICAgICAgICAgIGl0ZW0sXHJcbiAgICAgICAgICAgIGksXHJcbiAgICAgICAgICAgIGo7XHJcblxyXG4gICAgICAgIC8vIFJlbmRlciB0aGUgdGFibGUgaGVhZGVyXHJcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IHdpZHRoT2ZHcmlkOyBpKyspIHtcclxuICAgICAgICAgICAgb3V0cHV0ICs9ICcgJyArIHRoaXMucGFkTnVtYmVyKGksICcgJyk7XHJcbiAgICAgICAgICAgIGJvcmRlciArPSAnLS0tJztcclxuICAgICAgICB9XHJcbiAgICAgICAgb3V0cHV0ICs9IGJvcmRlcjtcclxuXHJcbiAgICAgICAgLy8gUmVuZGVyIHRhYmxlIGNvbnRlbnRzIHJvdyBieSByb3csIGFzIHdlIGdvIG9uIHRoZSB5IGF4aXNcclxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgdGhpcy5vcHRpb25zLmxhbmVzOyBpKyspIHtcclxuICAgICAgICAgICAgb3V0cHV0ICs9ICdcXG4nICsgdGhpcy5wYWROdW1iZXIoaSwgJyAnKSArICd8JztcclxuICAgICAgICAgICAgZm9yIChqID0gMDsgaiA8IHdpZHRoT2ZHcmlkOyBqKyspIHtcclxuICAgICAgICAgICAgICAgIG91dHB1dCArPSAnICc7XHJcbiAgICAgICAgICAgICAgICBpdGVtID0gdGhpcy5ncmlkW2pdW2ldO1xyXG4gICAgICAgICAgICAgICAgb3V0cHV0ICs9IGl0ZW1cclxuICAgICAgICAgICAgICAgICAgICA/IHRoaXMucGFkTnVtYmVyKHRoaXMuaXRlbXMuaW5kZXhPZihpdGVtKSwgJzAnKVxyXG4gICAgICAgICAgICAgICAgICAgIDogJy0tJztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBvdXRwdXQgKz0gJ1xcbic7XHJcbiAgICAgICAgcmV0dXJuIG91dHB1dDtcclxuICAgIH1cclxuXHJcbiAgICBzZXRPcHRpb24obmFtZTogc3RyaW5nLCB2YWx1ZTogYW55KSB7XHJcbiAgICAgICAgdGhpcy5vcHRpb25zW25hbWVdID0gdmFsdWU7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBCdWlsZCB0aGUgZ3JpZCBzdHJ1Y3R1cmUgZnJvbSBzY3JhdGNoLCB3aXRoIHRoZSBjdXJyZW50IGl0ZW0gcG9zaXRpb25zXHJcbiAgICAgKi9cclxuICAgIGdlbmVyYXRlR3JpZCgpIHtcclxuICAgICAgICBsZXQgaTtcclxuICAgICAgICB0aGlzLnJlc2V0R3JpZCgpO1xyXG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCB0aGlzLml0ZW1zLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIHRoaXMubWFya0l0ZW1Qb3NpdGlvblRvR3JpZCh0aGlzLml0ZW1zW2ldKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmVzaXplR3JpZChsYW5lczogbnVtYmVyKSB7XHJcbiAgICAgICAgbGV0IGN1cnJlbnRDb2x1bW4gPSAwO1xyXG5cclxuICAgICAgICB0aGlzLm9wdGlvbnMubGFuZXMgPSBsYW5lcztcclxuICAgICAgICB0aGlzLmFkanVzdFNpemVPZkl0ZW1zKCk7XHJcblxyXG4gICAgICAgIHRoaXMuc29ydEl0ZW1zQnlQb3NpdGlvbigpO1xyXG4gICAgICAgIHRoaXMucmVzZXRHcmlkKCk7XHJcblxyXG4gICAgICAgIC8vIFRoZSBpdGVtcyB3aWxsIGJlIHNvcnRlZCBiYXNlZCBvbiB0aGVpciBpbmRleCB3aXRoaW4gdGhlIHRoaXMuaXRlbXMgYXJyYXksXHJcbiAgICAgICAgLy8gdGhhdCBpcyB0aGVpciBcIjFkIHBvc2l0aW9uXCJcclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuaXRlbXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgY29uc3QgaXRlbSA9IHRoaXMuaXRlbXNbaV0sXHJcbiAgICAgICAgICAgICAgICBwb3NpdGlvbiA9IHRoaXMuZ2V0SXRlbVBvc2l0aW9uKGl0ZW0pO1xyXG5cclxuICAgICAgICAgICAgdGhpcy51cGRhdGVJdGVtUG9zaXRpb24oXHJcbiAgICAgICAgICAgICAgICBpdGVtLFxyXG4gICAgICAgICAgICAgICAgdGhpcy5maW5kUG9zaXRpb25Gb3JJdGVtKGl0ZW0sIHsgeDogY3VycmVudENvbHVtbiwgeTogMCB9KVxyXG4gICAgICAgICAgICApO1xyXG5cclxuICAgICAgICAgICAgLy8gTmV3IGl0ZW1zIHNob3VsZCBuZXZlciBiZSBwbGFjZWQgdG8gdGhlIGxlZnQgb2YgcHJldmlvdXMgaXRlbXNcclxuICAgICAgICAgICAgY3VycmVudENvbHVtbiA9IE1hdGgubWF4KGN1cnJlbnRDb2x1bW4sIHBvc2l0aW9uLngpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5wdWxsSXRlbXNUb0xlZnQoKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFRoaXMgbWV0aG9kIGhhcyB0d28gb3B0aW9ucyBmb3IgdGhlIHBvc2l0aW9uIHdlIHdhbnQgZm9yIHRoZSBpdGVtOlxyXG4gICAgICogLSBTdGFydGluZyBmcm9tIGEgY2VydGFpbiByb3cvY29sdW1uIG51bWJlciBhbmQgb25seSBsb29raW5nIGZvclxyXG4gICAgICogICBwb3NpdGlvbnMgdG8gaXRzIHJpZ2h0XHJcbiAgICAgKiAtIEFjY2VwdGluZyBwb3NpdGlvbnMgZm9yIGEgY2VydGFpbiByb3cgbnVtYmVyIG9ubHkgKHVzZS1jYXNlOiBpdGVtc1xyXG4gICAgICogICBiZWluZyBzaGlmdGVkIHRvIHRoZSBsZWZ0L3JpZ2h0IGFzIGEgcmVzdWx0IG9mIGNvbGxpc2lvbnMpXHJcbiAgICAgKlxyXG4gICAgICogQHBhcmFtIE9iamVjdCBpdGVtXHJcbiAgICAgKiBAcGFyYW0gT2JqZWN0IHN0YXJ0IFBvc2l0aW9uIGZyb20gd2hpY2ggdG8gc3RhcnRcclxuICAgICAqICAgICB0aGUgc2VhcmNoLlxyXG4gICAgICogQHBhcmFtIG51bWJlciBbZml4ZWRSb3ddIElmIHByb3ZpZGVkLCB3ZSdyZSBnb2luZyB0byB0cnkgdG8gZmluZCBhXHJcbiAgICAgKiAgICAgcG9zaXRpb24gZm9yIHRoZSBuZXcgaXRlbSBvbiBpdC4gSWYgZG9lc24ndCBmaXQgdGhlcmUsIHdlJ3JlIGdvaW5nXHJcbiAgICAgKiAgICAgdG8gcHV0IGl0IG9uIHRoZSBmaXJzdCByb3cuXHJcbiAgICAgKlxyXG4gICAgICogQHJldHVybnMgQXJyYXkgeCBhbmQgeS5cclxuICAgICAqL1xyXG4gICAgZmluZFBvc2l0aW9uRm9ySXRlbShcclxuICAgICAgICBpdGVtOiBHcmlkTGlzdEl0ZW0sXHJcbiAgICAgICAgc3RhcnQ6IHsgeDogbnVtYmVyOyB5OiBudW1iZXIgfSxcclxuICAgICAgICBmaXhlZFJvdz86IG51bWJlclxyXG4gICAgKTogQXJyYXk8bnVtYmVyPiB7XHJcbiAgICAgICAgbGV0IHgsIHksIHBvc2l0aW9uO1xyXG5cclxuICAgICAgICAvLyBTdGFydCBzZWFyY2hpbmcgZm9yIGEgcG9zaXRpb24gZnJvbSB0aGUgaG9yaXpvbnRhbCBwb3NpdGlvbiBvZiB0aGVcclxuICAgICAgICAvLyByaWdodG1vc3QgaXRlbSBmcm9tIHRoZSBncmlkXHJcbiAgICAgICAgZm9yICh4ID0gc3RhcnQueDsgeCA8IHRoaXMuZ3JpZC5sZW5ndGg7IHgrKykge1xyXG4gICAgICAgICAgICBpZiAoZml4ZWRSb3cgIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgcG9zaXRpb24gPSBbeCwgZml4ZWRSb3ddO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLml0ZW1GaXRzQXRQb3NpdGlvbihpdGVtLCBwb3NpdGlvbikpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcG9zaXRpb247XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBmb3IgKHkgPSBzdGFydC55OyB5IDwgdGhpcy5vcHRpb25zLmxhbmVzOyB5KyspIHtcclxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbiA9IFt4LCB5XTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuaXRlbUZpdHNBdFBvc2l0aW9uKGl0ZW0sIHBvc2l0aW9uKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcG9zaXRpb247XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBJZiB3ZSd2ZSByZWFjaGVkIHRoaXMgcG9pbnQsIHdlIG5lZWQgdG8gc3RhcnQgYSBuZXcgY29sdW1uXHJcbiAgICAgICAgY29uc3QgbmV3Q29sID0gdGhpcy5ncmlkLmxlbmd0aDtcclxuICAgICAgICBsZXQgbmV3Um93ID0gMDtcclxuXHJcbiAgICAgICAgaWYgKFxyXG4gICAgICAgICAgICBmaXhlZFJvdyAhPT0gdW5kZWZpbmVkICYmXHJcbiAgICAgICAgICAgIHRoaXMuaXRlbUZpdHNBdFBvc2l0aW9uKGl0ZW0sIFtuZXdDb2wsIGZpeGVkUm93XSlcclxuICAgICAgICApIHtcclxuICAgICAgICAgICAgbmV3Um93ID0gZml4ZWRSb3c7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gW25ld0NvbCwgbmV3Um93XTtcclxuICAgIH1cclxuXHJcbiAgICBtb3ZlQW5kUmVzaXplKFxyXG4gICAgICAgIGl0ZW06IEdyaWRMaXN0SXRlbSxcclxuICAgICAgICBuZXdQb3NpdGlvbjogQXJyYXk8bnVtYmVyPixcclxuICAgICAgICBzaXplOiB7IHc6IG51bWJlcjsgaDogbnVtYmVyIH1cclxuICAgICkge1xyXG4gICAgICAgIGNvbnN0IHBvc2l0aW9uID0gdGhpcy5nZXRJdGVtUG9zaXRpb24oe1xyXG4gICAgICAgICAgICB4OiBuZXdQb3NpdGlvblswXSxcclxuICAgICAgICAgICAgeTogbmV3UG9zaXRpb25bMV0sXHJcbiAgICAgICAgICAgIHc6IGl0ZW0udyxcclxuICAgICAgICAgICAgaDogaXRlbS5oXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgY29uc3Qgd2lkdGggPSBzaXplLncgfHwgaXRlbS53LFxyXG4gICAgICAgICAgICBoZWlnaHQgPSBzaXplLmggfHwgaXRlbS5oO1xyXG5cclxuICAgICAgICB0aGlzLnVwZGF0ZUl0ZW1Qb3NpdGlvbihpdGVtLCBbcG9zaXRpb24ueCwgcG9zaXRpb24ueV0pO1xyXG4gICAgICAgIHRoaXMudXBkYXRlSXRlbVNpemUoaXRlbSwgd2lkdGgsIGhlaWdodCk7XHJcblxyXG4gICAgICAgIHRoaXMucmVzb2x2ZUNvbGxpc2lvbnMoaXRlbSk7XHJcbiAgICB9XHJcblxyXG4gICAgbW92ZUl0ZW1Ub1Bvc2l0aW9uKGl0ZW06IEdyaWRMaXN0SXRlbSwgbmV3UG9zaXRpb246IEFycmF5PG51bWJlcj4pIHtcclxuICAgICAgICBjb25zdCBwb3NpdGlvbiA9IHRoaXMuZ2V0SXRlbVBvc2l0aW9uKHtcclxuICAgICAgICAgICAgeDogbmV3UG9zaXRpb25bMF0sXHJcbiAgICAgICAgICAgIHk6IG5ld1Bvc2l0aW9uWzFdLFxyXG4gICAgICAgICAgICB3OiBpdGVtLncsXHJcbiAgICAgICAgICAgIGg6IGl0ZW0uaFxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICB0aGlzLnVwZGF0ZUl0ZW1Qb3NpdGlvbihpdGVtLCBbcG9zaXRpb24ueCwgcG9zaXRpb24ueV0pO1xyXG4gICAgICAgIHRoaXMucmVzb2x2ZUNvbGxpc2lvbnMoaXRlbSk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBSZXNpemUgYW4gaXRlbSBhbmQgcmVzb2x2ZSBjb2xsaXNpb25zLlxyXG4gICAgICpcclxuICAgICAqIEBwYXJhbSBPYmplY3QgaXRlbSBBIHJlZmVyZW5jZSB0byBhbiBpdGVtIHRoYXQncyBwYXJ0IG9mIHRoZSBncmlkLlxyXG4gICAgICogQHBhcmFtIE9iamVjdCBzaXplXHJcbiAgICAgKiBAcGFyYW0gbnVtYmVyIFtzaXplLnc9aXRlbS53XSBUaGUgbmV3IHdpZHRoLlxyXG4gICAgICogQHBhcmFtIG51bWJlciBbc2l6ZS5oPWl0ZW0uaF0gVGhlIG5ldyBoZWlnaHQuXHJcbiAgICAgKi9cclxuICAgIHJlc2l6ZUl0ZW0oaXRlbTogR3JpZExpc3RJdGVtLCBzaXplOiB7IHc6IG51bWJlcjsgaDogbnVtYmVyIH0pIHtcclxuICAgICAgICBjb25zdCB3aWR0aCA9IHNpemUudyB8fCBpdGVtLncsXHJcbiAgICAgICAgICAgIGhlaWdodCA9IHNpemUuaCB8fCBpdGVtLmg7XHJcblxyXG4gICAgICAgIHRoaXMudXBkYXRlSXRlbVNpemUoaXRlbSwgd2lkdGgsIGhlaWdodCk7XHJcblxyXG4gICAgICAgIHRoaXMucHVsbEl0ZW1zVG9MZWZ0KGl0ZW0pO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQ29tcGFyZSB0aGUgY3VycmVudCBpdGVtcyBhZ2FpbnN0IGEgcHJldmlvdXMgc25hcHNob3QgYW5kIHJldHVybiBvbmx5XHJcbiAgICAgKiB0aGUgb25lcyB0aGF0IGNoYW5nZWQgdGhlaXIgYXR0cmlidXRlcyBpbiB0aGUgbWVhbnRpbWUuIFRoaXMgaW5jbHVkZXMgYm90aFxyXG4gICAgICogcG9zaXRpb24gKHgsIHkpIGFuZCBzaXplICh3LCBoKVxyXG4gICAgICpcclxuICAgICAqIEVhY2ggaXRlbSB0aGF0IGlzIHJldHVybmVkIGlzIG5vdCB0aGUgR3JpZExpc3RJdGVtIGJ1dCB0aGUgaGVscGVyIHRoYXQgaG9sZHMgR3JpZExpc3RJdGVtXHJcbiAgICAgKiBhbmQgbGlzdCBvZiBjaGFuZ2VkIHByb3BlcnRpZXMuXHJcbiAgICAgKi9cclxuICAgIGdldENoYW5nZWRJdGVtcyhcclxuICAgICAgICBpbml0aWFsSXRlbXM6IEFycmF5PEdyaWRMaXN0SXRlbT4sXHJcbiAgICAgICAgYnJlYWtwb2ludD9cclxuICAgICk6IEFycmF5PHtcclxuICAgICAgICBpdGVtOiBHcmlkTGlzdEl0ZW07XHJcbiAgICAgICAgY2hhbmdlczogQXJyYXk8c3RyaW5nPjtcclxuICAgICAgICBpc05ldzogYm9vbGVhbjtcclxuICAgIH0+IHtcclxuICAgICAgICByZXR1cm4gdGhpcy5pdGVtc1xyXG4gICAgICAgICAgICAubWFwKChpdGVtOiBHcmlkTGlzdEl0ZW0pID0+IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGNoYW5nZXMgPSBbXTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IG9sZFZhbHVlczoge1xyXG4gICAgICAgICAgICAgICAgICAgIHg/OiBudW1iZXI7XHJcbiAgICAgICAgICAgICAgICAgICAgeT86IG51bWJlcjtcclxuICAgICAgICAgICAgICAgICAgICB3PzogbnVtYmVyO1xyXG4gICAgICAgICAgICAgICAgICAgIGg/OiBudW1iZXI7XHJcbiAgICAgICAgICAgICAgICB9ID0ge307XHJcbiAgICAgICAgICAgICAgICBjb25zdCBpbml0SXRlbSA9IGluaXRpYWxJdGVtcy5maW5kKFxyXG4gICAgICAgICAgICAgICAgICAgIGluaXRJdG0gPT4gaW5pdEl0bS4kZWxlbWVudCA9PT0gaXRlbS4kZWxlbWVudFxyXG4gICAgICAgICAgICAgICAgKTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoIWluaXRJdGVtKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgaXRlbSwgY2hhbmdlczogWyd4JywgJ3knLCAndycsICdoJ10sIGlzTmV3OiB0cnVlIH07XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgY29uc3Qgb2xkWCA9IGluaXRJdGVtLmdldFZhbHVlWChicmVha3BvaW50KTtcclxuICAgICAgICAgICAgICAgIGlmIChpdGVtLmdldFZhbHVlWChicmVha3BvaW50KSAhPT0gb2xkWCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNoYW5nZXMucHVzaCgneCcpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChvbGRYIHx8IG9sZFggPT09IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgb2xkVmFsdWVzLnggPSBvbGRYO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBjb25zdCBvbGRZID0gaW5pdEl0ZW0uZ2V0VmFsdWVZKGJyZWFrcG9pbnQpO1xyXG4gICAgICAgICAgICAgICAgaWYgKGl0ZW0uZ2V0VmFsdWVZKGJyZWFrcG9pbnQpICE9PSBvbGRZKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY2hhbmdlcy5wdXNoKCd5Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG9sZFkgfHwgb2xkWSA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBvbGRWYWx1ZXMueSA9IG9sZFk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYgKFxyXG4gICAgICAgICAgICAgICAgICAgIGl0ZW0uZ2V0VmFsdWVXKGJyZWFrcG9pbnQpICE9PVxyXG4gICAgICAgICAgICAgICAgICAgIGluaXRJdGVtLmdldFZhbHVlVyhicmVha3BvaW50KVxyXG4gICAgICAgICAgICAgICAgKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY2hhbmdlcy5wdXNoKCd3Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgb2xkVmFsdWVzLncgPSBpbml0SXRlbS53O1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYgKFxyXG4gICAgICAgICAgICAgICAgICAgIGl0ZW0uZ2V0VmFsdWVIKGJyZWFrcG9pbnQpICE9PVxyXG4gICAgICAgICAgICAgICAgICAgIGluaXRJdGVtLmdldFZhbHVlSChicmVha3BvaW50KVxyXG4gICAgICAgICAgICAgICAgKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY2hhbmdlcy5wdXNoKCdoJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgb2xkVmFsdWVzLmggPSBpbml0SXRlbS5oO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiB7IGl0ZW0sIG9sZFZhbHVlcywgY2hhbmdlcywgaXNOZXc6IGZhbHNlIH07XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIC5maWx0ZXIoXHJcbiAgICAgICAgICAgICAgICAoaXRlbUNoYW5nZToge1xyXG4gICAgICAgICAgICAgICAgICAgIGl0ZW06IEdyaWRMaXN0SXRlbTtcclxuICAgICAgICAgICAgICAgICAgICBjaGFuZ2VzOiBBcnJheTxzdHJpbmc+O1xyXG4gICAgICAgICAgICAgICAgfSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBpdGVtQ2hhbmdlLmNoYW5nZXMubGVuZ3RoO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICApO1xyXG4gICAgfVxyXG5cclxuICAgIHJlc29sdmVDb2xsaXNpb25zKGl0ZW06IEdyaWRMaXN0SXRlbSkge1xyXG4gICAgICAgIGlmICghdGhpcy50cnlUb1Jlc29sdmVDb2xsaXNpb25zTG9jYWxseShpdGVtKSkge1xyXG4gICAgICAgICAgICB0aGlzLnB1bGxJdGVtc1RvTGVmdChpdGVtKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5mbG9hdGluZykge1xyXG4gICAgICAgICAgICB0aGlzLnB1bGxJdGVtc1RvTGVmdCgpO1xyXG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5nZXRJdGVtc0NvbGxpZGluZ1dpdGhJdGVtKGl0ZW0pLmxlbmd0aCkge1xyXG4gICAgICAgICAgICB0aGlzLnB1bGxJdGVtc1RvTGVmdCgpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwdXNoQ29sbGlkaW5nSXRlbXMoZml4ZWRJdGVtPzogR3JpZExpc3RJdGVtKSB7XHJcbiAgICAgICAgLy8gU3RhcnQgYSBmcmVzaCBncmlkIHdpdGggdGhlIGZpeGVkIGl0ZW0gYWxyZWFkeSBwbGFjZWQgaW5zaWRlXHJcbiAgICAgICAgdGhpcy5zb3J0SXRlbXNCeVBvc2l0aW9uKCk7XHJcbiAgICAgICAgdGhpcy5yZXNldEdyaWQoKTtcclxuICAgICAgICB0aGlzLmdlbmVyYXRlR3JpZCgpO1xyXG5cclxuICAgICAgICB0aGlzLml0ZW1zXHJcbiAgICAgICAgICAgIC5maWx0ZXIoaXRlbSA9PiAhdGhpcy5pc0l0ZW1GbG9hdGluZyhpdGVtKSAmJiBpdGVtICE9PSBmaXhlZEl0ZW0pXHJcbiAgICAgICAgICAgIC5mb3JFYWNoKGl0ZW0gPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLnRyeVRvUmVzb2x2ZUNvbGxpc2lvbnNMb2NhbGx5KGl0ZW0pKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wdWxsSXRlbXNUb0xlZnQoaXRlbSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQnVpbGQgdGhlIGdyaWQgZnJvbSBzY3JhdGNoLCBieSB1c2luZyB0aGUgY3VycmVudCBpdGVtIHBvc2l0aW9ucyBhbmRcclxuICAgICAqIHB1bGxpbmcgdGhlbSBhcyBtdWNoIHRvIHRoZSBsZWZ0IGFzIHBvc3NpYmxlLCByZW1vdmluZyBhcyBzcGFjZSBiZXR3ZWVuXHJcbiAgICAgKiB0aGVtIGFzIHBvc3NpYmxlLlxyXG4gICAgICpcclxuICAgICAqIElmIGEgXCJmaXhlZCBpdGVtXCIgaXMgcHJvdmlkZWQsIGl0cyBwb3NpdGlvbiB3aWxsIGJlIGtlcHQgaW50YWN0IGFuZCB0aGVcclxuICAgICAqIHJlc3Qgb2YgdGhlIGl0ZW1zIHdpbGwgYmUgbGF5ZWQgYXJvdW5kIGl0LlxyXG4gICAgICovXHJcbiAgICBwdWxsSXRlbXNUb0xlZnQoZml4ZWRJdGVtPykge1xyXG4gICAgICAgIGlmICh0aGlzLm9wdGlvbnMuZGlyZWN0aW9uID09PSAnbm9uZScpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gU3RhcnQgYSBmcmVzaCBncmlkIHdpdGggdGhlIGZpeGVkIGl0ZW0gYWxyZWFkeSBwbGFjZWQgaW5zaWRlXHJcbiAgICAgICAgdGhpcy5zb3J0SXRlbXNCeVBvc2l0aW9uKCk7XHJcbiAgICAgICAgdGhpcy5yZXNldEdyaWQoKTtcclxuXHJcbiAgICAgICAgLy8gU3RhcnQgdGhlIGdyaWQgd2l0aCB0aGUgZml4ZWQgaXRlbSBhcyB0aGUgZmlyc3QgcG9zaXRpb25lZCBpdGVtXHJcbiAgICAgICAgaWYgKGZpeGVkSXRlbSkge1xyXG4gICAgICAgICAgICBjb25zdCBmaXhlZFBvc2l0aW9uID0gdGhpcy5nZXRJdGVtUG9zaXRpb24oZml4ZWRJdGVtKTtcclxuICAgICAgICAgICAgdGhpcy51cGRhdGVJdGVtUG9zaXRpb24oZml4ZWRJdGVtLCBbXHJcbiAgICAgICAgICAgICAgICBmaXhlZFBvc2l0aW9uLngsXHJcbiAgICAgICAgICAgICAgICBmaXhlZFBvc2l0aW9uLnlcclxuICAgICAgICAgICAgXSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLml0ZW1zXHJcbiAgICAgICAgICAgIC5maWx0ZXIoKGl0ZW06IEdyaWRMaXN0SXRlbSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuICFpdGVtLmRyYWdBbmREcm9wICYmIGl0ZW0gIT09IGZpeGVkSXRlbTtcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgLmZvckVhY2goKGl0ZW06IEdyaWRMaXN0SXRlbSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZml4ZWRQb3NpdGlvbiA9IHRoaXMuZ2V0SXRlbVBvc2l0aW9uKGl0ZW0pO1xyXG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVJdGVtUG9zaXRpb24oaXRlbSwgW1xyXG4gICAgICAgICAgICAgICAgICAgIGZpeGVkUG9zaXRpb24ueCxcclxuICAgICAgICAgICAgICAgICAgICBmaXhlZFBvc2l0aW9uLnlcclxuICAgICAgICAgICAgICAgIF0pO1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLml0ZW1zLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGl0ZW0gPSB0aGlzLml0ZW1zW2ldLFxyXG4gICAgICAgICAgICAgICAgcG9zaXRpb24gPSB0aGlzLmdldEl0ZW1Qb3NpdGlvbihpdGVtKTtcclxuXHJcbiAgICAgICAgICAgIC8vIFRoZSBmaXhlZCBpdGVtIGtlZXBzIGl0cyBleGFjdCBwb3NpdGlvblxyXG4gICAgICAgICAgICBpZiAoXHJcbiAgICAgICAgICAgICAgICAoZml4ZWRJdGVtICYmIGl0ZW0gPT09IGZpeGVkSXRlbSkgfHxcclxuICAgICAgICAgICAgICAgICFpdGVtLmRyYWdBbmREcm9wIHx8XHJcbiAgICAgICAgICAgICAgICAoIXRoaXMub3B0aW9ucy5mbG9hdGluZyAmJlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaXNJdGVtRmxvYXRpbmcoaXRlbSkgJiZcclxuICAgICAgICAgICAgICAgICAgICAhdGhpcy5nZXRJdGVtc0NvbGxpZGluZ1dpdGhJdGVtKGl0ZW0pLmxlbmd0aClcclxuICAgICAgICAgICAgKSB7XHJcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY29uc3QgeCA9IHRoaXMuZmluZExlZnRNb3N0UG9zaXRpb25Gb3JJdGVtKGl0ZW0pLFxyXG4gICAgICAgICAgICAgICAgbmV3UG9zaXRpb24gPSB0aGlzLmZpbmRQb3NpdGlvbkZvckl0ZW0oXHJcbiAgICAgICAgICAgICAgICAgICAgaXRlbSxcclxuICAgICAgICAgICAgICAgICAgICB7IHg6IHgsIHk6IDAgfSxcclxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbi55XHJcbiAgICAgICAgICAgICAgICApO1xyXG5cclxuICAgICAgICAgICAgdGhpcy51cGRhdGVJdGVtUG9zaXRpb24oaXRlbSwgbmV3UG9zaXRpb24pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBpc092ZXJGaXhlZEFyZWEoXHJcbiAgICAgICAgeDogbnVtYmVyLFxyXG4gICAgICAgIHk6IG51bWJlcixcclxuICAgICAgICB3OiBudW1iZXIsXHJcbiAgICAgICAgaDogbnVtYmVyLFxyXG4gICAgICAgIGl0ZW06IEdyaWRMaXN0SXRlbSA9IG51bGxcclxuICAgICk6IGJvb2xlYW4ge1xyXG4gICAgICAgIGxldCBpdGVtRGF0YSA9IHsgeCwgeSwgdywgaCB9O1xyXG5cclxuICAgICAgICBpZiAodGhpcy5vcHRpb25zLmRpcmVjdGlvbiAhPT0gJ2hvcml6b250YWwnKSB7XHJcbiAgICAgICAgICAgIGl0ZW1EYXRhID0geyB4OiB5LCB5OiB4LCB3OiBoLCBoOiB3IH07XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmb3IgKGxldCBpID0gaXRlbURhdGEueDsgaSA8IGl0ZW1EYXRhLnggKyBpdGVtRGF0YS53OyBpKyspIHtcclxuICAgICAgICAgICAgZm9yIChsZXQgaiA9IGl0ZW1EYXRhLnk7IGogPCBpdGVtRGF0YS55ICsgaXRlbURhdGEuaDsgaisrKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5ncmlkW2ldICYmXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5ncmlkW2ldW2pdICYmXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5ncmlkW2ldW2pdICE9PSBpdGVtICYmXHJcbiAgICAgICAgICAgICAgICAgICAgIXRoaXMuZ3JpZFtpXVtqXS5kcmFnQW5kRHJvcFxyXG4gICAgICAgICAgICAgICAgKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG5cclxuICAgIGNoZWNrSXRlbUFib3ZlRW1wdHlBcmVhKFxyXG4gICAgICAgIGl0ZW06IEdyaWRMaXN0SXRlbSxcclxuICAgICAgICBuZXdQb3NpdGlvbjogeyB4OiBudW1iZXI7IHk6IG51bWJlciB9XHJcbiAgICApIHtcclxuICAgICAgICBsZXQgaXRlbURhdGEgPSB7XHJcbiAgICAgICAgICAgIHg6IG5ld1Bvc2l0aW9uLngsXHJcbiAgICAgICAgICAgIHk6IG5ld1Bvc2l0aW9uLnksXHJcbiAgICAgICAgICAgIHc6IGl0ZW0udyxcclxuICAgICAgICAgICAgaDogaXRlbS5oXHJcbiAgICAgICAgfTtcclxuICAgICAgICBpZiAoXHJcbiAgICAgICAgICAgICFpdGVtLml0ZW1Qcm90b3R5cGUgJiZcclxuICAgICAgICAgICAgaXRlbS54ID09PSBuZXdQb3NpdGlvbi54ICYmXHJcbiAgICAgICAgICAgIGl0ZW0ueSA9PT0gbmV3UG9zaXRpb24ueVxyXG4gICAgICAgICkge1xyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLm9wdGlvbnMuZGlyZWN0aW9uID09PSAnaG9yaXpvbnRhbCcpIHtcclxuICAgICAgICAgICAgaXRlbURhdGEgPSB7XHJcbiAgICAgICAgICAgICAgICB4OiBuZXdQb3NpdGlvbi55LFxyXG4gICAgICAgICAgICAgICAgeTogbmV3UG9zaXRpb24ueCxcclxuICAgICAgICAgICAgICAgIHc6IGl0ZW1EYXRhLmgsXHJcbiAgICAgICAgICAgICAgICBoOiBpdGVtRGF0YS53XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiAhdGhpcy5jaGVja0l0ZW1zSW5BcmVhKFxyXG4gICAgICAgICAgICBpdGVtRGF0YS55LFxyXG4gICAgICAgICAgICBpdGVtRGF0YS55ICsgaXRlbURhdGEuaCAtIDEsXHJcbiAgICAgICAgICAgIGl0ZW1EYXRhLngsXHJcbiAgICAgICAgICAgIGl0ZW1EYXRhLnggKyBpdGVtRGF0YS53IC0gMSxcclxuICAgICAgICAgICAgaXRlbVxyXG4gICAgICAgICk7XHJcbiAgICB9XHJcblxyXG4gICAgZml4SXRlbXNQb3NpdGlvbnMob3B0aW9uczogSUdyaWRzdGVyT3B0aW9ucykge1xyXG4gICAgICAgIC8vIGl0ZW1zIHdpdGggeCwgeSB0aGF0IGZpdHMgZ2lyZCB3aXRoIHNpemUgb2Ygb3B0aW9ucy5sYW5lc1xyXG4gICAgICAgIGNvbnN0IHZhbGlkSXRlbXMgPSB0aGlzLml0ZW1zXHJcbiAgICAgICAgICAgIC5maWx0ZXIoKGl0ZW06IEdyaWRMaXN0SXRlbSkgPT4gaXRlbS5pdGVtQ29tcG9uZW50KVxyXG4gICAgICAgICAgICAuZmlsdGVyKChpdGVtOiBHcmlkTGlzdEl0ZW0pID0+XHJcbiAgICAgICAgICAgICAgICB0aGlzLmlzSXRlbVZhbGlkRm9yR3JpZChpdGVtLCBvcHRpb25zKVxyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgIC8vIGl0ZW1zIHRoYXQgeCwgeSBtdXN0IGJlIGdlbmVyYXRlZFxyXG4gICAgICAgIGNvbnN0IGludmFsaWRJdGVtcyA9IHRoaXMuaXRlbXNcclxuICAgICAgICAgICAgLmZpbHRlcigoaXRlbTogR3JpZExpc3RJdGVtKSA9PiBpdGVtLml0ZW1Db21wb25lbnQpXHJcbiAgICAgICAgICAgIC5maWx0ZXIoXHJcbiAgICAgICAgICAgICAgICAoaXRlbTogR3JpZExpc3RJdGVtKSA9PiAhdGhpcy5pc0l0ZW1WYWxpZEZvckdyaWQoaXRlbSwgb3B0aW9ucylcclxuICAgICAgICAgICAgKTtcclxuXHJcbiAgICAgICAgY29uc3QgZ3JpZExpc3QgPSBuZXcgR3JpZExpc3QoW10sIG9wdGlvbnMpO1xyXG5cclxuICAgICAgICAvLyBwdXQgaXRlbXMgd2l0aCBkZWZpbmVkIHBvc2l0aW9ucyB0byB0aGUgZ3JpZFxyXG4gICAgICAgIGdyaWRMaXN0Lml0ZW1zID0gdmFsaWRJdGVtcy5tYXAoKGl0ZW06IEdyaWRMaXN0SXRlbSkgPT4ge1xyXG4gICAgICAgICAgICByZXR1cm4gaXRlbS5jb3B5Rm9yQnJlYWtwb2ludChvcHRpb25zLmJyZWFrcG9pbnQpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBncmlkTGlzdC5nZW5lcmF0ZUdyaWQoKTtcclxuXHJcbiAgICAgICAgaW52YWxpZEl0ZW1zLmZvckVhY2goaXRlbSA9PiB7XHJcbiAgICAgICAgICAgIC8vIFRPRE86IGNoZWNrIGlmIHRoaXMgY2hhbmdlIGRvZXMgbm90IGJyb2tlIGFueXRoaW5nXHJcbiAgICAgICAgICAgIC8vIGNvbnN0IGl0ZW1Db3B5ID0gaXRlbS5jb3B5KCk7XHJcbiAgICAgICAgICAgIGNvbnN0IGl0ZW1Db3B5ID0gaXRlbS5jb3B5Rm9yQnJlYWtwb2ludChvcHRpb25zLmJyZWFrcG9pbnQpO1xyXG4gICAgICAgICAgICBjb25zdCBwb3NpdGlvbiA9IGdyaWRMaXN0LmZpbmRQb3NpdGlvbkZvckl0ZW0oaXRlbUNvcHksIHtcclxuICAgICAgICAgICAgICAgIHg6IDAsXHJcbiAgICAgICAgICAgICAgICB5OiAwXHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgZ3JpZExpc3QuaXRlbXMucHVzaChpdGVtQ29weSk7XHJcbiAgICAgICAgICAgIGdyaWRMaXN0LnNldEl0ZW1Qb3NpdGlvbihpdGVtQ29weSwgcG9zaXRpb24pO1xyXG4gICAgICAgICAgICBncmlkTGlzdC5tYXJrSXRlbVBvc2l0aW9uVG9HcmlkKGl0ZW1Db3B5KTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgZ3JpZExpc3QucHVsbEl0ZW1zVG9MZWZ0KCk7XHJcbiAgICAgICAgZ3JpZExpc3QucHVzaENvbGxpZGluZ0l0ZW1zKCk7XHJcblxyXG4gICAgICAgIHRoaXMuaXRlbXMuZm9yRWFjaCgoaXRtOiBHcmlkTGlzdEl0ZW0pID0+IHtcclxuICAgICAgICAgICAgY29uc3QgY2FjaGVkSXRlbSA9IGdyaWRMaXN0Lml0ZW1zLmZpbHRlcihjYWNoZWRJdG0gPT4ge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhY2hlZEl0bS4kZWxlbWVudCA9PT0gaXRtLiRlbGVtZW50O1xyXG4gICAgICAgICAgICB9KVswXTtcclxuXHJcbiAgICAgICAgICAgIGl0bS5zZXRWYWx1ZVgoY2FjaGVkSXRlbS54LCBvcHRpb25zLmJyZWFrcG9pbnQpO1xyXG4gICAgICAgICAgICBpdG0uc2V0VmFsdWVZKGNhY2hlZEl0ZW0ueSwgb3B0aW9ucy5icmVha3BvaW50KTtcclxuICAgICAgICAgICAgaXRtLnNldFZhbHVlVyhjYWNoZWRJdGVtLncsIG9wdGlvbnMuYnJlYWtwb2ludCk7XHJcbiAgICAgICAgICAgIGl0bS5zZXRWYWx1ZUgoY2FjaGVkSXRlbS5oLCBvcHRpb25zLmJyZWFrcG9pbnQpO1xyXG4gICAgICAgICAgICBpdG0uYXV0b1NpemUgPSBjYWNoZWRJdGVtLmF1dG9TaXplO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGRlbGV0ZUl0ZW1Qb3NpdGlvbkZyb21HcmlkKGl0ZW06IEdyaWRMaXN0SXRlbSkge1xyXG4gICAgICAgIGNvbnN0IHBvc2l0aW9uID0gdGhpcy5nZXRJdGVtUG9zaXRpb24oaXRlbSk7XHJcbiAgICAgICAgbGV0IHgsIHk7XHJcblxyXG4gICAgICAgIGZvciAoeCA9IHBvc2l0aW9uLng7IHggPCBwb3NpdGlvbi54ICsgcG9zaXRpb24udzsgeCsrKSB7XHJcbiAgICAgICAgICAgIC8vIEl0IGNhbiBoYXBwZW4gdG8gdHJ5IHRvIHJlbW92ZSBhbiBpdGVtIGZyb20gYSBwb3NpdGlvbiBub3QgZ2VuZXJhdGVkXHJcbiAgICAgICAgICAgIC8vIGluIHRoZSBncmlkLCBwcm9iYWJseSB3aGVuIGxvYWRpbmcgYSBwZXJzaXN0ZWQgZ3JpZCBvZiBpdGVtcy4gTm8gbmVlZFxyXG4gICAgICAgICAgICAvLyB0byBjcmVhdGUgYSBjb2x1bW4gdG8gYmUgYWJsZSB0byByZW1vdmUgc29tZXRoaW5nIGZyb20gaXQsIHRob3VnaFxyXG4gICAgICAgICAgICBpZiAoIXRoaXMuZ3JpZFt4XSkge1xyXG4gICAgICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGZvciAoeSA9IHBvc2l0aW9uLnk7IHkgPCBwb3NpdGlvbi55ICsgcG9zaXRpb24uaDsgeSsrKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBEb24ndCBjbGVhciB0aGUgY2VsbCBpZiBpdCdzIGJlZW4gb2NjdXBpZWQgYnkgYSBkaWZmZXJlbnQgd2lkZ2V0IGluXHJcbiAgICAgICAgICAgICAgICAvLyB0aGUgbWVhbnRpbWUgKGUuZy4gd2hlbiBhbiBpdGVtIGhhcyBiZWVuIG1vdmVkIG92ZXIgdGhpcyBvbmUsIGFuZFxyXG4gICAgICAgICAgICAgICAgLy8gdGh1cyBieSBjb250aW51aW5nIHRvIGNsZWFyIHRoaXMgaXRlbSdzIHByZXZpb3VzIHBvc2l0aW9uIHlvdSB3b3VsZFxyXG4gICAgICAgICAgICAgICAgLy8gY2FuY2VsIHRoZSBmaXJzdCBpdGVtJ3MgbW92ZSwgbGVhdmluZyBpdCB3aXRob3V0IGFueSBwb3NpdGlvbiBldmVuKVxyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZ3JpZFt4XVt5XSA9PT0gaXRlbSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZ3JpZFt4XVt5XSA9IG51bGw7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBpc0l0ZW1GbG9hdGluZyhpdGVtKSB7XHJcbiAgICAgICAgaWYgKGl0ZW0uaXRlbUNvbXBvbmVudCAmJiBpdGVtLml0ZW1Db21wb25lbnQuaXNEcmFnZ2luZykge1xyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNvbnN0IHBvc2l0aW9uID0gdGhpcy5nZXRJdGVtUG9zaXRpb24oaXRlbSk7XHJcblxyXG4gICAgICAgIGlmIChwb3NpdGlvbi54ID09PSAwKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgY29uc3Qgcm93QmVsb3dJdGVtID0gdGhpcy5ncmlkW3Bvc2l0aW9uLnggLSAxXTtcclxuXHJcbiAgICAgICAgcmV0dXJuIChyb3dCZWxvd0l0ZW0gfHwgW10pXHJcbiAgICAgICAgICAgIC5zbGljZShwb3NpdGlvbi55LCBwb3NpdGlvbi55ICsgcG9zaXRpb24uaClcclxuICAgICAgICAgICAgLnJlZHVjZSgoaXNGbG9hdGluZywgY2VsbEl0ZW0pID0+IHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBpc0Zsb2F0aW5nICYmICFjZWxsSXRlbTtcclxuICAgICAgICAgICAgfSwgdHJ1ZSk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBpc0l0ZW1WYWxpZEZvckdyaWQoaXRlbTogR3JpZExpc3RJdGVtLCBvcHRpb25zOiBJR3JpZHN0ZXJPcHRpb25zKSB7XHJcbiAgICAgICAgY29uc3QgaXRlbURhdGEgPVxyXG4gICAgICAgICAgICBvcHRpb25zLmRpcmVjdGlvbiA9PT0gJ2hvcml6b250YWwnXHJcbiAgICAgICAgICAgICAgICA/IHtcclxuICAgICAgICAgICAgICAgICAgICAgIHg6IGl0ZW0uZ2V0VmFsdWVZKG9wdGlvbnMuYnJlYWtwb2ludCksXHJcbiAgICAgICAgICAgICAgICAgICAgICB5OiBpdGVtLmdldFZhbHVlWChvcHRpb25zLmJyZWFrcG9pbnQpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgdzogaXRlbS5nZXRWYWx1ZUgob3B0aW9ucy5icmVha3BvaW50KSxcclxuICAgICAgICAgICAgICAgICAgICAgIGg6IE1hdGgubWluKFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0uZ2V0VmFsdWVXKHRoaXMub3B0aW9ucy5icmVha3BvaW50KSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICBvcHRpb25zLmxhbmVzXHJcbiAgICAgICAgICAgICAgICAgICAgICApXHJcbiAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIDoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgeDogaXRlbS5nZXRWYWx1ZVgob3B0aW9ucy5icmVha3BvaW50KSxcclxuICAgICAgICAgICAgICAgICAgICAgIHk6IGl0ZW0uZ2V0VmFsdWVZKG9wdGlvbnMuYnJlYWtwb2ludCksXHJcbiAgICAgICAgICAgICAgICAgICAgICB3OiBNYXRoLm1pbihcclxuICAgICAgICAgICAgICAgICAgICAgICAgICBpdGVtLmdldFZhbHVlVyh0aGlzLm9wdGlvbnMuYnJlYWtwb2ludCksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgb3B0aW9ucy5sYW5lc1xyXG4gICAgICAgICAgICAgICAgICAgICAgKSxcclxuICAgICAgICAgICAgICAgICAgICAgIGg6IGl0ZW0uZ2V0VmFsdWVIKG9wdGlvbnMuYnJlYWtwb2ludClcclxuICAgICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgcmV0dXJuIChcclxuICAgICAgICAgICAgdHlwZW9mIGl0ZW1EYXRhLnggPT09ICdudW1iZXInICYmXHJcbiAgICAgICAgICAgIHR5cGVvZiBpdGVtRGF0YS55ID09PSAnbnVtYmVyJyAmJlxyXG4gICAgICAgICAgICBpdGVtRGF0YS54ICsgaXRlbURhdGEudyA8PSBvcHRpb25zLmxhbmVzXHJcbiAgICAgICAgKTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGZpbmREZWZhdWx0UG9zaXRpb25Ib3Jpem9udGFsKHdpZHRoOiBudW1iZXIsIGhlaWdodDogbnVtYmVyKSB7XHJcbiAgICAgICAgZm9yIChjb25zdCBjb2wgb2YgdGhpcy5ncmlkKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGNvbElkeCA9IHRoaXMuZ3JpZC5pbmRleE9mKGNvbCk7XHJcbiAgICAgICAgICAgIGxldCByb3dJZHggPSAwO1xyXG4gICAgICAgICAgICB3aGlsZSAocm93SWR4IDwgY29sLmxlbmd0aCAtIGhlaWdodCArIDEpIHtcclxuICAgICAgICAgICAgICAgIGlmIChcclxuICAgICAgICAgICAgICAgICAgICAhdGhpcy5jaGVja0l0ZW1zSW5BcmVhKFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb2xJZHgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbElkeCArIHdpZHRoIC0gMSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcm93SWR4LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICByb3dJZHggKyBoZWlnaHQgLSAxXHJcbiAgICAgICAgICAgICAgICAgICAgKVxyXG4gICAgICAgICAgICAgICAgKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFtjb2xJZHgsIHJvd0lkeF07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByb3dJZHgrKztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gW3RoaXMuZ3JpZC5sZW5ndGgsIDBdO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZmluZERlZmF1bHRQb3NpdGlvblZlcnRpY2FsKHdpZHRoOiBudW1iZXIsIGhlaWdodDogbnVtYmVyKSB7XHJcbiAgICAgICAgZm9yIChjb25zdCByb3cgb2YgdGhpcy5ncmlkKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHJvd0lkeCA9IHRoaXMuZ3JpZC5pbmRleE9mKHJvdyk7XHJcbiAgICAgICAgICAgIGxldCBjb2xJZHggPSAwO1xyXG4gICAgICAgICAgICB3aGlsZSAoY29sSWR4IDwgcm93Lmxlbmd0aCAtIHdpZHRoICsgMSkge1xyXG4gICAgICAgICAgICAgICAgaWYgKFxyXG4gICAgICAgICAgICAgICAgICAgICF0aGlzLmNoZWNrSXRlbXNJbkFyZWEoXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJvd0lkeCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcm93SWR4ICsgaGVpZ2h0IC0gMSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29sSWR4LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb2xJZHggKyB3aWR0aCAtIDFcclxuICAgICAgICAgICAgICAgICAgICApXHJcbiAgICAgICAgICAgICAgICApIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gW2NvbElkeCwgcm93SWR4XTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGNvbElkeCsrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBbMCwgdGhpcy5ncmlkLmxlbmd0aF07XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBjaGVja0l0ZW1zSW5BcmVhKFxyXG4gICAgICAgIHJvd1N0YXJ0OiBudW1iZXIsXHJcbiAgICAgICAgcm93RW5kOiBudW1iZXIsXHJcbiAgICAgICAgY29sU3RhcnQ6IG51bWJlcixcclxuICAgICAgICBjb2xFbmQ6IG51bWJlcixcclxuICAgICAgICBpdGVtPzogR3JpZExpc3RJdGVtXHJcbiAgICApIHtcclxuICAgICAgICBmb3IgKGxldCBpID0gcm93U3RhcnQ7IGkgPD0gcm93RW5kOyBpKyspIHtcclxuICAgICAgICAgICAgZm9yIChsZXQgaiA9IGNvbFN0YXJ0OyBqIDw9IGNvbEVuZDsgaisrKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5ncmlkW2ldICYmXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5ncmlkW2ldW2pdICYmXHJcbiAgICAgICAgICAgICAgICAgICAgKGl0ZW0gPyB0aGlzLmdyaWRbaV1bal0gIT09IGl0ZW0gOiB0cnVlKVxyXG4gICAgICAgICAgICAgICAgKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgc29ydEl0ZW1zQnlQb3NpdGlvbigpIHtcclxuICAgICAgICB0aGlzLml0ZW1zLnNvcnQoKGl0ZW0xLCBpdGVtMikgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCBwb3NpdGlvbjEgPSB0aGlzLmdldEl0ZW1Qb3NpdGlvbihpdGVtMSksXHJcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjIgPSB0aGlzLmdldEl0ZW1Qb3NpdGlvbihpdGVtMik7XHJcblxyXG4gICAgICAgICAgICAvLyBUcnkgdG8gcHJlc2VydmUgY29sdW1ucy5cclxuICAgICAgICAgICAgaWYgKHBvc2l0aW9uMS54ICE9PSBwb3NpdGlvbjIueCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHBvc2l0aW9uMS54IC0gcG9zaXRpb24yLng7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChwb3NpdGlvbjEueSAhPT0gcG9zaXRpb24yLnkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBwb3NpdGlvbjEueSAtIHBvc2l0aW9uMi55O1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBUaGUgaXRlbXMgYXJlIHBsYWNlZCBvbiB0aGUgc2FtZSBwb3NpdGlvbi5cclxuICAgICAgICAgICAgcmV0dXJuIDA7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBTb21lIGl0ZW1zIGNhbiBoYXZlIDEwMCUgaGVpZ2h0IG9yIDEwMCUgd2lkdGguIFRob3NlIGRpbW1lbnNpb25zIGFyZVxyXG4gICAgICogZXhwcmVzc2VkIGFzIDAuIFdlIG5lZWQgdG8gZW5zdXJlIGEgdmFsaWQgd2lkdGggYW5kIGhlaWdodCBmb3IgZWFjaCBvZlxyXG4gICAgICogdGhvc2UgaXRlbXMgYXMgdGhlIG51bWJlciBvZiBpdGVtcyBwZXIgbGFuZS5cclxuICAgICAqL1xyXG4gICAgcHJpdmF0ZSBhZGp1c3RTaXplT2ZJdGVtcygpIHtcclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuaXRlbXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgY29uc3QgaXRlbSA9IHRoaXMuaXRlbXNbaV07XHJcblxyXG4gICAgICAgICAgICAvLyBUaGlzIGNhbiBoYXBwZW4gb25seSB0aGUgZmlyc3QgdGltZSBpdGVtcyBhcmUgY2hlY2tlZC5cclxuICAgICAgICAgICAgLy8gV2UgbmVlZCB0aGUgcHJvcGVydHkgdG8gaGF2ZSBhIHZhbHVlIGZvciBhbGwgdGhlIGl0ZW1zIHNvIHRoYXQgdGhlXHJcbiAgICAgICAgICAgIC8vIGBjbG9uZUl0ZW1zYCBtZXRob2Qgd2lsbCBtZXJnZSB0aGUgcHJvcGVydGllcyBwcm9wZXJseS4gSWYgd2Ugb25seSBzZXRcclxuICAgICAgICAgICAgLy8gaXQgdG8gdGhlIGl0ZW1zIHRoYXQgbmVlZCBpdCB0aGVuIHRoZSBmb2xsb3dpbmcgY2FuIGhhcHBlbjpcclxuICAgICAgICAgICAgLy9cclxuICAgICAgICAgICAgLy8gY2xvbmVJdGVtcyhbe2lkOiAxLCBhdXRvU2l6ZTogdHJ1ZX0sIHtpZDogMn1dLFxyXG4gICAgICAgICAgICAvLyAgICAgICAgICAgIFt7aWQ6IDJ9LCB7aWQ6IDEsIGF1dG9TaXplOiB0cnVlfV0pO1xyXG4gICAgICAgICAgICAvL1xyXG4gICAgICAgICAgICAvLyB3aWxsIHJlc3VsdCBpblxyXG4gICAgICAgICAgICAvL1xyXG4gICAgICAgICAgICAvLyBbe2lkOiAxLCBhdXRvU2l6ZTogdHJ1ZX0sIHtpZDogMiwgYXV0b1NpemU6IHRydWV9XVxyXG4gICAgICAgICAgICBpZiAoaXRlbS5hdXRvU2l6ZSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICBpdGVtLmF1dG9TaXplID0gaXRlbS53ID09PSAwIHx8IGl0ZW0uaCA9PT0gMDtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGl0ZW0uYXV0b1NpemUpIHtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLm9wdGlvbnMuZGlyZWN0aW9uID09PSAnaG9yaXpvbnRhbCcpIHtcclxuICAgICAgICAgICAgICAgICAgICBpdGVtLmggPSB0aGlzLm9wdGlvbnMubGFuZXM7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGl0ZW0udyA9IHRoaXMub3B0aW9ucy5sYW5lcztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHJlc2V0R3JpZCgpIHtcclxuICAgICAgICB0aGlzLmdyaWQgPSBbXTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIENoZWNrIHRoYXQgYW4gaXRlbSB3b3VsZG4ndCBvdmVybGFwIHdpdGggYW5vdGhlciBvbmUgaWYgcGxhY2VkIGF0IGFcclxuICAgICAqIGNlcnRhaW4gcG9zaXRpb24gd2l0aGluIHRoZSBncmlkXHJcbiAgICAgKi9cclxuICAgIHByaXZhdGUgaXRlbUZpdHNBdFBvc2l0aW9uKGl0ZW06IEdyaWRMaXN0SXRlbSwgbmV3UG9zaXRpb24pIHtcclxuICAgICAgICBjb25zdCBwb3NpdGlvbiA9IHRoaXMuZ2V0SXRlbVBvc2l0aW9uKGl0ZW0pO1xyXG4gICAgICAgIGxldCB4LCB5O1xyXG5cclxuICAgICAgICAvLyBObyBjb29yZG9uYXRlIGNhbiBiZSBuZWdhdGl2ZVxyXG4gICAgICAgIGlmIChuZXdQb3NpdGlvblswXSA8IDAgfHwgbmV3UG9zaXRpb25bMV0gPCAwKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIE1ha2Ugc3VyZSB0aGUgaXRlbSBpc24ndCBsYXJnZXIgdGhhbiB0aGUgZW50aXJlIGdyaWRcclxuICAgICAgICBpZiAoXHJcbiAgICAgICAgICAgIG5ld1Bvc2l0aW9uWzFdICsgTWF0aC5taW4ocG9zaXRpb24uaCwgdGhpcy5vcHRpb25zLmxhbmVzKSA+XHJcbiAgICAgICAgICAgIHRoaXMub3B0aW9ucy5sYW5lc1xyXG4gICAgICAgICkge1xyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5pc092ZXJGaXhlZEFyZWEoaXRlbS54LCBpdGVtLnksIGl0ZW0udywgaXRlbS5oKSkge1xyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBNYWtlIHN1cmUgdGhlIHBvc2l0aW9uIGRvZXNuJ3Qgb3ZlcmxhcCB3aXRoIGFuIGFscmVhZHkgcG9zaXRpb25lZFxyXG4gICAgICAgIC8vIGl0ZW0uXHJcbiAgICAgICAgZm9yICh4ID0gbmV3UG9zaXRpb25bMF07IHggPCBuZXdQb3NpdGlvblswXSArIHBvc2l0aW9uLnc7IHgrKykge1xyXG4gICAgICAgICAgICBjb25zdCBjb2wgPSB0aGlzLmdyaWRbeF07XHJcbiAgICAgICAgICAgIC8vIFN1cmVseSBhIGNvbHVtbiB0aGF0IGhhc24ndCBldmVuIGJlZW4gY3JlYXRlZCB5ZXQgaXMgYXZhaWxhYmxlXHJcbiAgICAgICAgICAgIGlmICghY29sKSB7XHJcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgZm9yICh5ID0gbmV3UG9zaXRpb25bMV07IHkgPCBuZXdQb3NpdGlvblsxXSArIHBvc2l0aW9uLmg7IHkrKykge1xyXG4gICAgICAgICAgICAgICAgLy8gQW55IHNwYWNlIG9jY3VwaWVkIGJ5IGFuIGl0ZW0gY2FuIGNvbnRpbnVlIHRvIGJlIG9jY3VwaWVkIGJ5IHRoZVxyXG4gICAgICAgICAgICAgICAgLy8gc2FtZSBpdGVtLlxyXG4gICAgICAgICAgICAgICAgaWYgKGNvbFt5XSAmJiBjb2xbeV0gIT09IGl0ZW0pIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgdXBkYXRlSXRlbVBvc2l0aW9uKGl0ZW06IEdyaWRMaXN0SXRlbSwgcG9zaXRpb246IEFycmF5PGFueT4pIHtcclxuICAgICAgICBpZiAoaXRlbS54ICE9PSBudWxsICYmIGl0ZW0ueSAhPT0gbnVsbCkge1xyXG4gICAgICAgICAgICB0aGlzLmRlbGV0ZUl0ZW1Qb3NpdGlvbkZyb21HcmlkKGl0ZW0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5zZXRJdGVtUG9zaXRpb24oaXRlbSwgcG9zaXRpb24pO1xyXG5cclxuICAgICAgICB0aGlzLm1hcmtJdGVtUG9zaXRpb25Ub0dyaWQoaXRlbSk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBAcGFyYW0gT2JqZWN0IGl0ZW0gQSByZWZlcmVuY2UgdG8gYSBncmlkIGl0ZW0uXHJcbiAgICAgKiBAcGFyYW0gbnVtYmVyIHdpZHRoIFRoZSBuZXcgd2lkdGguXHJcbiAgICAgKiBAcGFyYW0gbnVtYmVyIGhlaWdodCBUaGUgbmV3IGhlaWdodC5cclxuICAgICAqL1xyXG4gICAgcHJpdmF0ZSB1cGRhdGVJdGVtU2l6ZShpdGVtOiBHcmlkTGlzdEl0ZW0sIHdpZHRoLCBoZWlnaHQpIHtcclxuICAgICAgICBpZiAoaXRlbS54ICE9PSBudWxsICYmIGl0ZW0ueSAhPT0gbnVsbCkge1xyXG4gICAgICAgICAgICB0aGlzLmRlbGV0ZUl0ZW1Qb3NpdGlvbkZyb21HcmlkKGl0ZW0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaXRlbS53ID0gd2lkdGg7XHJcbiAgICAgICAgaXRlbS5oID0gaGVpZ2h0O1xyXG5cclxuICAgICAgICB0aGlzLm1hcmtJdGVtUG9zaXRpb25Ub0dyaWQoaXRlbSk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBNYXJrIHRoZSBncmlkIGNlbGxzIHRoYXQgYXJlIG9jY3VwaWVkIGJ5IGFuIGl0ZW0uIFRoaXMgcHJldmVudHMgaXRlbXNcclxuICAgICAqIGZyb20gb3ZlcmxhcHBpbmcgaW4gdGhlIGdyaWRcclxuICAgICAqL1xyXG4gICAgcHJpdmF0ZSBtYXJrSXRlbVBvc2l0aW9uVG9HcmlkKGl0ZW06IEdyaWRMaXN0SXRlbSkge1xyXG4gICAgICAgIGNvbnN0IHBvc2l0aW9uID0gdGhpcy5nZXRJdGVtUG9zaXRpb24oaXRlbSk7XHJcbiAgICAgICAgbGV0IHgsIHk7XHJcblxyXG4gICAgICAgIC8vIEVuc3VyZSB0aGF0IHRoZSBncmlkIGhhcyBlbm91Z2ggY29sdW1ucyB0byBhY2NvbW9kYXRlIHRoZSBjdXJyZW50IGl0ZW0uXHJcbiAgICAgICAgdGhpcy5lbnN1cmVDb2x1bW5zKHBvc2l0aW9uLnggKyBwb3NpdGlvbi53KTtcclxuXHJcbiAgICAgICAgZm9yICh4ID0gcG9zaXRpb24ueDsgeCA8IHBvc2l0aW9uLnggKyBwb3NpdGlvbi53OyB4KyspIHtcclxuICAgICAgICAgICAgZm9yICh5ID0gcG9zaXRpb24ueTsgeSA8IHBvc2l0aW9uLnkgKyBwb3NpdGlvbi5oOyB5KyspIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZ3JpZFt4XVt5XSA9IGl0ZW07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBFbnN1cmUgdGhhdCB0aGUgZ3JpZCBoYXMgYXQgbGVhc3QgTiBjb2x1bW5zIGF2YWlsYWJsZS5cclxuICAgICAqL1xyXG4gICAgcHJpdmF0ZSBlbnN1cmVDb2x1bW5zKE4pIHtcclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IE47IGkrKykge1xyXG4gICAgICAgICAgICBpZiAoIXRoaXMuZ3JpZFtpXSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5ncmlkLnB1c2gobmV3IEdyaWRDb2wodGhpcy5vcHRpb25zLmxhbmVzKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBnZXRJdGVtc0NvbGxpZGluZ1dpdGhJdGVtKGl0ZW06IEdyaWRMaXN0SXRlbSk6IG51bWJlcltdIHtcclxuICAgICAgICBjb25zdCBjb2xsaWRpbmdJdGVtcyA9IFtdO1xyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5pdGVtcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICBpZiAoXHJcbiAgICAgICAgICAgICAgICBpdGVtICE9PSB0aGlzLml0ZW1zW2ldICYmXHJcbiAgICAgICAgICAgICAgICB0aGlzLml0ZW1zQXJlQ29sbGlkaW5nKGl0ZW0sIHRoaXMuaXRlbXNbaV0pXHJcbiAgICAgICAgICAgICkge1xyXG4gICAgICAgICAgICAgICAgY29sbGlkaW5nSXRlbXMucHVzaChpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gY29sbGlkaW5nSXRlbXM7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBpdGVtc0FyZUNvbGxpZGluZyhpdGVtMTogR3JpZExpc3RJdGVtLCBpdGVtMjogR3JpZExpc3RJdGVtKSB7XHJcbiAgICAgICAgY29uc3QgcG9zaXRpb24xID0gdGhpcy5nZXRJdGVtUG9zaXRpb24oaXRlbTEpLFxyXG4gICAgICAgICAgICBwb3NpdGlvbjIgPSB0aGlzLmdldEl0ZW1Qb3NpdGlvbihpdGVtMik7XHJcblxyXG4gICAgICAgIHJldHVybiAhKFxyXG4gICAgICAgICAgICBwb3NpdGlvbjIueCA+PSBwb3NpdGlvbjEueCArIHBvc2l0aW9uMS53IHx8XHJcbiAgICAgICAgICAgIHBvc2l0aW9uMi54ICsgcG9zaXRpb24yLncgPD0gcG9zaXRpb24xLnggfHxcclxuICAgICAgICAgICAgcG9zaXRpb24yLnkgPj0gcG9zaXRpb24xLnkgKyBwb3NpdGlvbjEuaCB8fFxyXG4gICAgICAgICAgICBwb3NpdGlvbjIueSArIHBvc2l0aW9uMi5oIDw9IHBvc2l0aW9uMS55XHJcbiAgICAgICAgKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIEF0dGVtcHQgdG8gcmVzb2x2ZSB0aGUgY29sbGlzaW9ucyBhZnRlciBtb3ZpbmcgYW4gaXRlbSBvdmVyIG9uZSBvciBtb3JlXHJcbiAgICAgKiBvdGhlciBpdGVtcyB3aXRoaW4gdGhlIGdyaWQsIGJ5IHNoaWZ0aW5nIHRoZSBwb3NpdGlvbiBvZiB0aGUgY29sbGlkaW5nXHJcbiAgICAgKiBpdGVtcyBhcm91bmQgdGhlIG1vdmluZyBvbmUuIFRoaXMgbWlnaHQgcmVzdWx0IGluIHN1YnNlcXVlbnQgY29sbGlzaW9ucyxcclxuICAgICAqIGluIHdoaWNoIGNhc2Ugd2Ugd2lsbCByZXZlcnQgYWxsIHBvc2l0aW9uIHBlcm11dGF0aW9ucy4gVG8gYmUgYWJsZSB0b1xyXG4gICAgICogcmV2ZXJ0IHRvIHRoZSBpbml0aWFsIGl0ZW0gcG9zaXRpb25zLCB3ZSBjcmVhdGUgYSB2aXJ0dWFsIGdyaWQgaW4gdGhlXHJcbiAgICAgKiBwcm9jZXNzXHJcbiAgICAgKi9cclxuICAgIHByaXZhdGUgdHJ5VG9SZXNvbHZlQ29sbGlzaW9uc0xvY2FsbHkoaXRlbTogR3JpZExpc3RJdGVtKSB7XHJcbiAgICAgICAgY29uc3QgY29sbGlkaW5nSXRlbXMgPSB0aGlzLmdldEl0ZW1zQ29sbGlkaW5nV2l0aEl0ZW0oaXRlbSk7XHJcbiAgICAgICAgaWYgKCFjb2xsaWRpbmdJdGVtcy5sZW5ndGgpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBfZ3JpZExpc3QgPSBuZXcgR3JpZExpc3QoXHJcbiAgICAgICAgICAgIHRoaXMuaXRlbXMubWFwKGl0bSA9PiB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gaXRtLmNvcHkoKTtcclxuICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgIHRoaXMub3B0aW9uc1xyXG4gICAgICAgICk7XHJcblxyXG4gICAgICAgIGxldCBsZWZ0T2ZJdGVtO1xyXG4gICAgICAgIGxldCByaWdodE9mSXRlbTtcclxuICAgICAgICBsZXQgYWJvdmVPZkl0ZW07XHJcbiAgICAgICAgbGV0IGJlbG93T2ZJdGVtO1xyXG5cclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGNvbGxpZGluZ0l0ZW1zLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGNvbGxpZGluZ0l0ZW0gPSBfZ3JpZExpc3QuaXRlbXNbY29sbGlkaW5nSXRlbXNbaV1dLFxyXG4gICAgICAgICAgICAgICAgY29sbGlkaW5nUG9zaXRpb24gPSB0aGlzLmdldEl0ZW1Qb3NpdGlvbihjb2xsaWRpbmdJdGVtKTtcclxuXHJcbiAgICAgICAgICAgIC8vIFdlIHVzZSBhIHNpbXBsZSBhbGdvcml0aG0gZm9yIG1vdmluZyBpdGVtcyBhcm91bmQgd2hlbiBjb2xsaXNpb25zIG9jY3VyOlxyXG4gICAgICAgICAgICAvLyBJbiB0aGlzIHByaW9yaXRpemVkIG9yZGVyLCB3ZSB0cnkgdG8gbW92ZSBhIGNvbGxpZGluZyBpdGVtIGFyb3VuZCB0aGVcclxuICAgICAgICAgICAgLy8gbW92aW5nIG9uZTpcclxuICAgICAgICAgICAgLy8gMS4gdG8gaXRzIGxlZnQgc2lkZVxyXG4gICAgICAgICAgICAvLyAyLiBhYm92ZSBpdFxyXG4gICAgICAgICAgICAvLyAzLiB1bmRlciBpdFxyXG4gICAgICAgICAgICAvLyA0LiB0byBpdHMgcmlnaHQgc2lkZVxyXG4gICAgICAgICAgICBjb25zdCBwb3NpdGlvbiA9IHRoaXMuZ2V0SXRlbVBvc2l0aW9uKGl0ZW0pO1xyXG5cclxuICAgICAgICAgICAgbGVmdE9mSXRlbSA9IFtcclxuICAgICAgICAgICAgICAgIHBvc2l0aW9uLnggLSBjb2xsaWRpbmdQb3NpdGlvbi53LFxyXG4gICAgICAgICAgICAgICAgY29sbGlkaW5nUG9zaXRpb24ueVxyXG4gICAgICAgICAgICBdO1xyXG4gICAgICAgICAgICByaWdodE9mSXRlbSA9IFtwb3NpdGlvbi54ICsgcG9zaXRpb24udywgY29sbGlkaW5nUG9zaXRpb24ueV07XHJcbiAgICAgICAgICAgIGFib3ZlT2ZJdGVtID0gW1xyXG4gICAgICAgICAgICAgICAgY29sbGlkaW5nUG9zaXRpb24ueCxcclxuICAgICAgICAgICAgICAgIHBvc2l0aW9uLnkgLSBjb2xsaWRpbmdQb3NpdGlvbi5oXHJcbiAgICAgICAgICAgIF07XHJcbiAgICAgICAgICAgIGJlbG93T2ZJdGVtID0gW2NvbGxpZGluZ1Bvc2l0aW9uLngsIHBvc2l0aW9uLnkgKyBwb3NpdGlvbi5oXTtcclxuXHJcbiAgICAgICAgICAgIGlmIChfZ3JpZExpc3QuaXRlbUZpdHNBdFBvc2l0aW9uKGNvbGxpZGluZ0l0ZW0sIGxlZnRPZkl0ZW0pKSB7XHJcbiAgICAgICAgICAgICAgICBfZ3JpZExpc3QudXBkYXRlSXRlbVBvc2l0aW9uKGNvbGxpZGluZ0l0ZW0sIGxlZnRPZkl0ZW0pO1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKFxyXG4gICAgICAgICAgICAgICAgX2dyaWRMaXN0Lml0ZW1GaXRzQXRQb3NpdGlvbihjb2xsaWRpbmdJdGVtLCBhYm92ZU9mSXRlbSlcclxuICAgICAgICAgICAgKSB7XHJcbiAgICAgICAgICAgICAgICBfZ3JpZExpc3QudXBkYXRlSXRlbVBvc2l0aW9uKGNvbGxpZGluZ0l0ZW0sIGFib3ZlT2ZJdGVtKTtcclxuICAgICAgICAgICAgfSBlbHNlIGlmIChcclxuICAgICAgICAgICAgICAgIF9ncmlkTGlzdC5pdGVtRml0c0F0UG9zaXRpb24oY29sbGlkaW5nSXRlbSwgYmVsb3dPZkl0ZW0pXHJcbiAgICAgICAgICAgICkge1xyXG4gICAgICAgICAgICAgICAgX2dyaWRMaXN0LnVwZGF0ZUl0ZW1Qb3NpdGlvbihjb2xsaWRpbmdJdGVtLCBiZWxvd09mSXRlbSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoXHJcbiAgICAgICAgICAgICAgICBfZ3JpZExpc3QuaXRlbUZpdHNBdFBvc2l0aW9uKGNvbGxpZGluZ0l0ZW0sIHJpZ2h0T2ZJdGVtKVxyXG4gICAgICAgICAgICApIHtcclxuICAgICAgICAgICAgICAgIF9ncmlkTGlzdC51cGRhdGVJdGVtUG9zaXRpb24oY29sbGlkaW5nSXRlbSwgcmlnaHRPZkl0ZW0pO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgLy8gQ29sbGlzaW9ucyBmYWlsZWQsIHdlIG11c3QgdXNlIHRoZSBwdWxsSXRlbXNUb0xlZnQgbWV0aG9kIHRvIGFycmFuZ2VcclxuICAgICAgICAgICAgICAgIC8vIHRoZSBvdGhlciBpdGVtcyBhcm91bmQgdGhpcyBpdGVtIHdpdGggZml4ZWQgcG9zaXRpb24uIFRoaXMgaXMgb3VyXHJcbiAgICAgICAgICAgICAgICAvLyBwbGFuIEIgZm9yIHdoZW4gbG9jYWwgY29sbGlzaW9uIHJlc29sdmluZyBmYWlscy5cclxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICAvLyBJZiB3ZSByZWFjaGVkIHRoaXMgcG9pbnQgaXQgbWVhbnMgd2UgbWFuYWdlZCB0byByZXNvbHZlIHRoZSBjb2xsaXNpb25zXHJcbiAgICAgICAgLy8gZnJvbSBvbmUgc2luZ2xlIGl0ZXJhdGlvbiwganVzdCBieSBtb3ZpbmcgdGhlIGNvbGxpZGluZyBpdGVtcyBhcm91bmQuIFNvXHJcbiAgICAgICAgLy8gd2UgYWNjZXB0IHRoaXMgc2NlbmFyaW8gYW5kIG1lcmdlIHRoZSBicmFuY2hlZC1vdXQgZ3JpZCBpbnN0YW5jZSBpbnRvIHRoZVxyXG4gICAgICAgIC8vIG9yaWdpbmFsIG9uZVxyXG5cclxuICAgICAgICB0aGlzLml0ZW1zLmZvckVhY2goKGl0bTogR3JpZExpc3RJdGVtLCBpZHg6IG51bWJlcikgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCBjYWNoZWRJdGVtID0gX2dyaWRMaXN0Lml0ZW1zLmZpbHRlcihjYWNoZWRJdG0gPT4ge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhY2hlZEl0bS4kZWxlbWVudCA9PT0gaXRtLiRlbGVtZW50O1xyXG4gICAgICAgICAgICB9KVswXTtcclxuXHJcbiAgICAgICAgICAgIGl0bS54ID0gY2FjaGVkSXRlbS54O1xyXG4gICAgICAgICAgICBpdG0ueSA9IGNhY2hlZEl0ZW0ueTtcclxuICAgICAgICAgICAgaXRtLncgPSBjYWNoZWRJdGVtLnc7XHJcbiAgICAgICAgICAgIGl0bS5oID0gY2FjaGVkSXRlbS5oO1xyXG4gICAgICAgICAgICBpdG0uYXV0b1NpemUgPSBjYWNoZWRJdGVtLmF1dG9TaXplO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHRoaXMuZ2VuZXJhdGVHcmlkKCk7XHJcbiAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBXaGVuIHB1bGxpbmcgaXRlbXMgdG8gdGhlIGxlZnQsIHdlIG5lZWQgdG8gZmluZCB0aGUgbGVmdG1vc3QgcG9zaXRpb24gZm9yXHJcbiAgICAgKiBhbiBpdGVtLCB3aXRoIHR3byBjb25zaWRlcmF0aW9ucyBpbiBtaW5kOlxyXG4gICAgICogLSBwcmVzZXJ2aW5nIGl0cyBjdXJyZW50IHJvd1xyXG4gICAgICogLSBwcmVzZXJ2aW5nIHRoZSBwcmV2aW91cyBob3Jpem9udGFsIG9yZGVyIGJldHdlZW4gaXRlbXNcclxuICAgICAqL1xyXG4gICAgcHJpdmF0ZSBmaW5kTGVmdE1vc3RQb3NpdGlvbkZvckl0ZW0oaXRlbSkge1xyXG4gICAgICAgIGxldCB0YWlsID0gMDtcclxuICAgICAgICBjb25zdCBwb3NpdGlvbiA9IHRoaXMuZ2V0SXRlbVBvc2l0aW9uKGl0ZW0pO1xyXG5cclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuZ3JpZC5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICBmb3IgKGxldCBqID0gcG9zaXRpb24ueTsgaiA8IHBvc2l0aW9uLnkgKyBwb3NpdGlvbi5oOyBqKyspIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IG90aGVySXRlbSA9IHRoaXMuZ3JpZFtpXVtqXTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoIW90aGVySXRlbSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGNvbnN0IG90aGVyUG9zaXRpb24gPSB0aGlzLmdldEl0ZW1Qb3NpdGlvbihvdGhlckl0ZW0pO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLml0ZW1zLmluZGV4T2Yob3RoZXJJdGVtKSA8IHRoaXMuaXRlbXMuaW5kZXhPZihpdGVtKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRhaWwgPSBvdGhlclBvc2l0aW9uLnggKyBvdGhlclBvc2l0aW9uLnc7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiB0YWlsO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZmluZEl0ZW1CeVBvc2l0aW9uKHg6IG51bWJlciwgeTogbnVtYmVyKTogR3JpZExpc3RJdGVtIHtcclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuaXRlbXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuaXRlbXNbaV0ueCA9PT0geCAmJiB0aGlzLml0ZW1zW2ldLnkgPT09IHkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLml0ZW1zW2ldO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZ2V0SXRlbUJ5QXR0cmlidXRlKGtleSwgdmFsdWUpIHtcclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuaXRlbXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuaXRlbXNbaV1ba2V5XSA9PT0gdmFsdWUpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLml0ZW1zW2ldO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgcGFkTnVtYmVyKG5yLCBwcmVmaXgpIHtcclxuICAgICAgICAvLyBDdXJyZW50bHkgd29ya3MgZm9yIDItZGlnaXQgbnVtYmVycyAoPDEwMClcclxuICAgICAgICByZXR1cm4gbnIgPj0gMTAgPyBuciA6IHByZWZpeCArIG5yO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogSWYgdGhlIGRpcmVjdGlvbiBpcyB2ZXJ0aWNhbCB3ZSBuZWVkIHRvIHJvdGF0ZSB0aGUgZ3JpZCA5MCBkZWcgdG8gdGhlXHJcbiAgICAgKiBsZWZ0LiBUaHVzLCB3ZSBzaW11bGF0ZSB0aGUgZmFjdCB0aGF0IGl0ZW1zIGFyZSBiZWluZyBwdWxsZWQgdG8gdGhlIHRvcC5cclxuICAgICAqXHJcbiAgICAgKiBTaW5jZSB0aGUgaXRlbXMgaGF2ZSB3aWR0aHMgYW5kIGhlaWdodHMsIGlmIHdlIGFwcGx5IHRoZSBjbGFzc2ljXHJcbiAgICAgKiBjb3VudGVyLWNsb2Nrd2lzZSA5MCBkZWcgcm90YXRpb25cclxuICAgICAqXHJcbiAgICAgKiAgICAgWzAgLTFdXHJcbiAgICAgKiAgICAgWzEgIDBdXHJcbiAgICAgKlxyXG4gICAgICogdGhlbiB0aGUgdG9wIGxlZnQgcG9pbnQgb2YgYW4gaXRlbSB3aWxsIGJlY29tZSB0aGUgYm90dG9tIGxlZnQgcG9pbnQgb2ZcclxuICAgICAqIHRoZSByb3RhdGVkIGl0ZW0uIFRvIGFkanVzdCBmb3IgdGhpcywgd2UgbmVlZCB0byBzdWJ0cmFjdCBmcm9tIHRoZSB5XHJcbiAgICAgKiBwb3NpdGlvbiB0aGUgaGVpZ2h0IG9mIHRoZSBvcmlnaW5hbCBpdGVtIC0gdGhlIHdpZHRoIG9mIHRoZSByb3RhdGVkIGl0ZW0uXHJcbiAgICAgKlxyXG4gICAgICogSG93ZXZlciwgaWYgd2UgZG8gdGhpcyB0aGVuIHdlJ2xsIHJldmVyc2Ugc29tZSBhY3Rpb25zOiByZXNpemluZyB0aGVcclxuICAgICAqIHdpZHRoIG9mIGFuIGl0ZW0gd2lsbCBzdHJldGNoIHRoZSBpdGVtIHRvIHRoZSBsZWZ0IGluc3RlYWQgb2YgdG8gdGhlXHJcbiAgICAgKiByaWdodDsgcmVzaXppbmcgYW4gaXRlbSB0aGF0IGRvZXNuJ3QgZml0IGludG8gdGhlIGdyaWQgd2lsbCBwdXNoIHRoZVxyXG4gICAgICogaXRlbXMgYXJvdW5kIGl0IGluc3RlYWQgb2YgZ29pbmcgb24gYSBuZXcgcm93LCBldGMuXHJcbiAgICAgKlxyXG4gICAgICogV2UgZm91bmQgaXQgYmV0dGVyIHRvIGRvIGEgdmVydGljYWwgZmxpcCBvZiB0aGUgZ3JpZCBhZnRlciByb3RhdGluZyBpdC5cclxuICAgICAqIFRoaXMgcmVzdG9yZXMgdGhlIGRpcmVjdGlvbiBvZiB0aGUgYWN0aW9ucyBhbmQgZ3JlYXRseSBzaW1wbGlmaWVzIHRoZVxyXG4gICAgICogdHJhbnNmb3JtYXRpb25zLlxyXG4gICAgICovXHJcbiAgICBwcml2YXRlIGdldEl0ZW1Qb3NpdGlvbihpdGVtOiBhbnkpIHtcclxuICAgICAgICBpZiAodGhpcy5vcHRpb25zLmRpcmVjdGlvbiA9PT0gJ2hvcml6b250YWwnKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBpdGVtO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICB4OiBpdGVtLnksXHJcbiAgICAgICAgICAgICAgICB5OiBpdGVtLngsXHJcbiAgICAgICAgICAgICAgICB3OiBpdGVtLmgsXHJcbiAgICAgICAgICAgICAgICBoOiBpdGVtLndcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBTZWUgZ2V0SXRlbVBvc2l0aW9uLlxyXG4gICAgICovXHJcbiAgICBwcml2YXRlIHNldEl0ZW1Qb3NpdGlvbihpdGVtLCBwb3NpdGlvbikge1xyXG4gICAgICAgIGlmICh0aGlzLm9wdGlvbnMuZGlyZWN0aW9uID09PSAnaG9yaXpvbnRhbCcpIHtcclxuICAgICAgICAgICAgaXRlbS54ID0gcG9zaXRpb25bMF07XHJcbiAgICAgICAgICAgIGl0ZW0ueSA9IHBvc2l0aW9uWzFdO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIC8vIFdlJ3JlIHN1cHBvc2VkIHRvIHN1YnRyYWN0IHRoZSByb3RhdGVkIGl0ZW0ncyBoZWlnaHQgd2hpY2ggaXMgYWN0dWFsbHlcclxuICAgICAgICAgICAgLy8gdGhlIG5vbi1yb3RhdGVkIGl0ZW0ncyB3aWR0aC5cclxuICAgICAgICAgICAgaXRlbS54ID0gcG9zaXRpb25bMV07XHJcbiAgICAgICAgICAgIGl0ZW0ueSA9IHBvc2l0aW9uWzBdO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG4iXX0=