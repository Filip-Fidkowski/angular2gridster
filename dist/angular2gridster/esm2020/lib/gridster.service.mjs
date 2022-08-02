import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { GridList } from './gridList/gridList';
import * as i0 from "@angular/core";
export class GridsterService {
    constructor() {
        this.items = [];
        this._items = [];
        this._itemsMap = {};
        this.disabledItems = [];
        this.debounceRenderSubject = new Subject();
        this.itemRemoveSubject = new Subject();
        this.isInit = false;
        this.itemRemoveSubject.pipe(debounceTime(0)).subscribe(() => {
            this.gridList.pullItemsToLeft();
            this.render();
            this.updateCachedItems();
        });
        this.debounceRenderSubject.pipe(debounceTime(0)).subscribe(() => this.render());
    }
    isInitialized() {
        return this.isInit;
    }
    /**
     * Must be called before init
     * @param item
     */
    registerItem(item) {
        this.items.push(item);
        return item;
    }
    init(gridsterComponent) {
        this.gridsterComponent = gridsterComponent;
        this.draggableOptions = gridsterComponent.draggableOptions;
        this.gridsterOptions = gridsterComponent.gridsterOptions;
    }
    start() {
        this.updateMaxItemSize();
        // Used to highlight a position an element will land on upon drop
        if (this.$positionHighlight) {
            this.removePositionHighlight();
        }
        this.initGridList();
        this.isInit = true;
        setTimeout(() => {
            this.copyItems();
            this.fixItemsPositions();
            this.gridsterComponent.reflowGridster(true);
            this.gridsterComponent.setReady();
        });
    }
    initGridList() {
        // Create instance of GridList (decoupled lib for handling the grid
        // positioning and sorting post-drag and dropping)
        this.gridList = new GridList(this.items, this.options);
    }
    render() {
        this.updateMaxItemSize();
        this.gridList.generateGrid();
        this.applySizeToItems();
        this.applyPositionToItems();
        this.refreshLines();
    }
    reflow() {
        this.calculateCellSize();
        this.render();
    }
    fixItemsPositions() {
        if (this.options.responsiveSizes) {
            this.gridList.fixItemsPositions(this.options);
        }
        else {
            this.gridList.fixItemsPositions(this.gridsterOptions.basicOptions);
            this.gridsterOptions.responsiveOptions.forEach((options) => {
                this.gridList.fixItemsPositions(options);
            });
        }
        this.updateCachedItems();
    }
    removeItem(item) {
        const idx = this.items.indexOf(item);
        if (idx >= 0) {
            this.items.splice(this.items.indexOf(item), 1);
        }
        this.gridList.deleteItemPositionFromGrid(item);
        this.removeItemFromCache(item);
    }
    onResizeStart(item) {
        this.currentElement = item.$element;
        this.copyItems();
        this._maxGridCols = this.gridList.grid.length;
        this.highlightPositionForItem(item);
        this.gridsterComponent.isResizing = true;
        this.refreshLines();
    }
    onResizeDrag(item) {
        const newSize = this.snapItemSizeToGrid(item);
        const sizeChanged = this.dragSizeChanged(newSize);
        const newPosition = this.snapItemPositionToGrid(item);
        const positionChanged = this.dragPositionChanged(newPosition);
        if (sizeChanged || positionChanged) {
            // Regenerate the grid with the positions from when the drag started
            this.restoreCachedItems();
            this.gridList.generateGrid();
            this.previousDragPosition = newPosition;
            this.previousDragSize = newSize;
            this.gridList.moveAndResize(item, newPosition, { w: newSize[0], h: newSize[1] });
            // Visually update item positions and highlight shape
            this.applyPositionToItems(true);
            this.highlightPositionForItem(item);
        }
    }
    onResizeStop(item) {
        this.currentElement = undefined;
        this.updateCachedItems();
        this.previousDragSize = null;
        this.removePositionHighlight();
        this.gridsterComponent.isResizing = false;
        this.gridList.pullItemsToLeft(item);
        this.debounceRenderSubject.next();
        this.fixItemsPositions();
    }
    onStart(item) {
        this.currentElement = item.$element;
        // itemCtrl.isDragging = true;
        // Create a deep copy of the items; we use them to revert the item
        // positions after each drag change, making an entire drag operation less
        // distructable
        this.copyItems();
        // Since dragging actually alters the grid, we need to establish the number
        // of cols (+1 extra) before the drag starts
        this._maxGridCols = this.gridList.grid.length;
        this.gridsterComponent.isDragging = true;
        this.gridsterComponent.updateGridsterElementData();
        this.refreshLines();
    }
    onDrag(item) {
        const newPosition = this.snapItemPositionToGrid(item);
        if (this.dragPositionChanged(newPosition)) {
            // Regenerate the grid with the positions from when the drag started
            this.restoreCachedItems();
            this.gridList.generateGrid();
            this.previousDragPosition = newPosition;
            if (this.options.direction === 'none' &&
                !this.gridList.checkItemAboveEmptyArea(item, { x: newPosition[0], y: newPosition[1] })) {
                return;
            }
            // Since the items list is a deep copy, we need to fetch the item
            // corresponding to this drag action again
            this.gridList.moveItemToPosition(item, newPosition);
            // Visually update item positions and highlight shape
            this.applyPositionToItems(true);
            this.highlightPositionForItem(item);
        }
    }
    cancel() {
        this.restoreCachedItems();
        this.previousDragPosition = null;
        this.updateMaxItemSize();
        this.applyPositionToItems();
        this.removePositionHighlight();
        this.currentElement = undefined;
        this.gridsterComponent.isDragging = false;
    }
    onDragOut(item) {
        this.cancel();
        const idx = this.items.indexOf(item);
        if (idx >= 0) {
            this.items.splice(idx, 1);
        }
        this.gridList.pullItemsToLeft();
        this.render();
    }
    onStop(item) {
        this.currentElement = undefined;
        this.updateCachedItems();
        this.previousDragPosition = null;
        this.removePositionHighlight();
        this.gridList.pullItemsToLeft(item);
        this.gridsterComponent.isDragging = false;
        this.refreshLines();
    }
    calculateCellSize() {
        if (this.options.direction === 'horizontal') {
            this.cellHeight = this.calculateCellHeight();
            this.cellWidth = this.options.cellWidth || this.cellHeight * this.options.widthHeightRatio;
        }
        else {
            this.cellWidth = this.calculateCellWidth();
            this.cellHeight = this.options.cellHeight || this.cellWidth / this.options.widthHeightRatio;
        }
        if (this.options.heightToFontSizeRatio) {
            this._fontSize = this.cellHeight * this.options.heightToFontSizeRatio;
        }
    }
    applyPositionToItems(increaseGridsterSize) {
        if (!this.options.shrink) {
            increaseGridsterSize = true;
        }
        // TODO: Implement group separators
        for (let i = 0; i < this.items.length; i++) {
            // Don't interfere with the positions of the dragged items
            if (this.isCurrentElement(this.items[i].$element)) {
                continue;
            }
            this.items[i].applyPosition(this);
        }
        const child = this.gridsterComponent.$element.firstChild;
        // Update the width of the entire grid container with enough room on the
        // right to allow dragging items to the end of the grid.
        if (this.options.direction === 'horizontal') {
            const increaseWidthWith = (increaseGridsterSize) ? this.maxItemWidth : 0;
            child.style.height = '';
            child.style.width = ((this.gridList.grid.length + increaseWidthWith) * this.cellWidth) + 'px';
        }
        else if (this.gridList.grid.length) {
            const increaseHeightWith = (increaseGridsterSize) ? this.maxItemHeight : 0;
            child.style.height = ((this.gridList.grid.length + increaseHeightWith) * this.cellHeight) + 'px';
            child.style.width = '';
        }
    }
    refreshLines() {
        const gridsterContainer = this.gridsterComponent.$element.firstChild;
        if (this.options.lines && this.options.lines.visible &&
            (this.gridsterComponent.isDragging || this.gridsterComponent.isResizing || this.options.lines.always)) {
            const linesColor = this.options.lines.color || '#d8d8d8';
            const linesBgColor = this.options.lines.backgroundColor || 'transparent';
            const linesWidth = this.options.lines.width || 1;
            const bgPosition = linesWidth / 2;
            gridsterContainer.style.backgroundSize = `${this.cellWidth}px ${this.cellHeight}px`;
            gridsterContainer.style.backgroundPosition = `-${bgPosition}px -${bgPosition}px`;
            gridsterContainer.style.backgroundImage = `
                linear-gradient(to right, ${linesColor} ${linesWidth}px, ${linesBgColor} ${linesWidth}px),
                linear-gradient(to bottom, ${linesColor} ${linesWidth}px, ${linesBgColor} ${linesWidth}px)
            `;
        }
        else {
            gridsterContainer.style.backgroundSize = '';
            gridsterContainer.style.backgroundPosition = '';
            gridsterContainer.style.backgroundImage = '';
        }
    }
    removeItemFromCache(item) {
        this._items = this._items
            .filter(cachedItem => cachedItem.$element !== item.$element);
        Object.keys(this._itemsMap)
            .forEach((breakpoint) => {
            this._itemsMap[breakpoint] = this._itemsMap[breakpoint]
                .filter(cachedItem => cachedItem.$element !== item.$element);
        });
    }
    copyItems() {
        this._items = this.items
            .filter(item => this.isValidGridItem(item))
            .map((item) => {
            return item.copyForBreakpoint(null);
        });
        this.gridsterOptions.responsiveOptions.forEach((options) => {
            this._itemsMap[options.breakpoint] = this.items
                .filter(item => this.isValidGridItem(item))
                .map((item) => {
                return item.copyForBreakpoint(options.breakpoint);
            });
        });
    }
    /**
     * Update maxItemWidth and maxItemHeight vales according to current state of items
     */
    updateMaxItemSize() {
        this.maxItemWidth = Math.max.apply(null, this.items.map((item) => {
            return item.w;
        }));
        this.maxItemHeight = Math.max.apply(null, this.items.map((item) => {
            return item.h;
        }));
    }
    /**
     * Update items properties of previously cached items
     */
    restoreCachedItems() {
        const items = this.options.breakpoint ? this._itemsMap[this.options.breakpoint] : this._items;
        this.items
            .filter(item => this.isValidGridItem(item))
            .forEach((item) => {
            const cachedItem = items.filter(cachedItm => {
                return cachedItm.$element === item.$element;
            })[0];
            item.x = cachedItem.x;
            item.y = cachedItem.y;
            item.w = cachedItem.w;
            item.h = cachedItem.h;
            item.autoSize = cachedItem.autoSize;
        });
    }
    /**
     * If item should react on grid
     * @param GridListItem item
     * @returns boolean
     */
    isValidGridItem(item) {
        if (this.options.direction === 'none') {
            return !!item.itemComponent;
        }
        return true;
    }
    calculateCellWidth() {
        const gridsterWidth = parseFloat(window.getComputedStyle(this.gridsterComponent.$element).width);
        return gridsterWidth / this.options.lanes;
    }
    calculateCellHeight() {
        const gridsterHeight = parseFloat(window.getComputedStyle(this.gridsterComponent.$element).height);
        return gridsterHeight / this.options.lanes;
    }
    applySizeToItems() {
        for (let i = 0; i < this.items.length; i++) {
            this.items[i].applySize();
            if (this.options.heightToFontSizeRatio) {
                this.items[i].$element.style['font-size'] = this._fontSize;
            }
        }
    }
    isCurrentElement(element) {
        if (!this.currentElement) {
            return false;
        }
        return element === this.currentElement;
    }
    snapItemSizeToGrid(item) {
        const itemSize = {
            width: parseInt(item.$element.style.width, 10) - 1,
            height: parseInt(item.$element.style.height, 10) - 1
        };
        let colSize = Math.round(itemSize.width / this.cellWidth);
        let rowSize = Math.round(itemSize.height / this.cellHeight);
        // Keep item minimum 1
        colSize = Math.max(colSize, 1);
        rowSize = Math.max(rowSize, 1);
        // check if element is pinned
        if (this.gridList.isOverFixedArea(item.x, item.y, colSize, rowSize, item)) {
            return [item.w, item.h];
        }
        return [colSize, rowSize];
    }
    generateItemPosition(item) {
        let position;
        if (item.itemPrototype) {
            const coords = item.itemPrototype.getPositionToGridster(this);
            position = {
                x: Math.round(coords.x / this.cellWidth),
                y: Math.round(coords.y / this.cellHeight)
            };
        }
        else {
            position = {
                x: Math.round(item.positionX / this.cellWidth),
                y: Math.round(item.positionY / this.cellHeight)
            };
        }
        return position;
    }
    snapItemPositionToGrid(item) {
        const position = this.generateItemPosition(item);
        let col = position.x;
        let row = position.y;
        // Keep item position within the grid and don't let the item create more
        // than one extra column
        col = Math.max(col, 0);
        row = Math.max(row, 0);
        if (this.options.direction === 'horizontal') {
            col = Math.min(col, this._maxGridCols);
        }
        else {
            col = Math.min(col, Math.max(0, this.options.lanes - item.w));
        }
        // check if element is pinned
        if (this.gridList.isOverFixedArea(col, row, item.w, item.h)) {
            return [item.x, item.y];
        }
        return [col, row];
    }
    dragSizeChanged(newSize) {
        if (!this.previousDragSize) {
            return true;
        }
        return (newSize[0] !== this.previousDragSize[0] ||
            newSize[1] !== this.previousDragSize[1]);
    }
    dragPositionChanged(newPosition) {
        if (!this.previousDragPosition) {
            return true;
        }
        return (newPosition[0] !== this.previousDragPosition[0] ||
            newPosition[1] !== this.previousDragPosition[1]);
    }
    highlightPositionForItem(item) {
        const size = item.calculateSize(this);
        const position = item.calculatePosition(this);
        this.$positionHighlight.style.width = size.width + 'px';
        this.$positionHighlight.style.height = size.height + 'px';
        this.$positionHighlight.style.left = position.left + 'px';
        this.$positionHighlight.style.top = position.top + 'px';
        this.$positionHighlight.style.display = '';
        if (this.options.heightToFontSizeRatio) {
            this.$positionHighlight.style['font-size'] = this._fontSize;
        }
    }
    updateCachedItems() {
        // Notify the user with the items that changed since the previous snapshot
        this.triggerOnChange(null);
        this.gridsterOptions.responsiveOptions.forEach((options) => {
            this.triggerOnChange(options.breakpoint);
        });
        this.copyItems();
    }
    triggerOnChange(breakpoint) {
        const items = breakpoint ? this._itemsMap[breakpoint] : this._items;
        const changeItems = this.gridList.getChangedItems(items || [], breakpoint);
        changeItems
            .filter((itemChange) => {
            return itemChange.item.itemComponent;
        })
            .forEach((itemChange) => {
            if (itemChange.changes.indexOf('x') >= 0) {
                itemChange.item.triggerChangeX(breakpoint);
            }
            if (itemChange.changes.indexOf('y') >= 0) {
                itemChange.item.triggerChangeY(breakpoint);
            }
            if (itemChange.changes.indexOf('w') >= 0) {
                itemChange.item.triggerChangeW(breakpoint);
            }
            if (itemChange.changes.indexOf('h') >= 0) {
                itemChange.item.triggerChangeH(breakpoint);
            }
            // should be called only once (not for each breakpoint)
            itemChange.item.itemComponent.change.emit({
                item: itemChange.item,
                oldValues: itemChange.oldValues || {},
                isNew: itemChange.isNew,
                changes: itemChange.changes,
                breakpoint: breakpoint
            });
        });
    }
    removePositionHighlight() {
        this.$positionHighlight.style.display = 'none';
    }
}
GridsterService.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "13.1.1", ngImport: i0, type: GridsterService, deps: [], target: i0.ɵɵFactoryTarget.Injectable });
GridsterService.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "13.1.1", ngImport: i0, type: GridsterService });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "13.1.1", ngImport: i0, type: GridsterService, decorators: [{
            type: Injectable
        }], ctorParameters: function () { return []; } });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3JpZHN0ZXIuc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3Byb2plY3RzL2FuZ3VsYXIyZ3JpZHN0ZXIvc3JjL2xpYi9ncmlkc3Rlci5zZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDM0MsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLE1BQU0sQ0FBQztBQUMvQixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFFOUMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFCQUFxQixDQUFDOztBQVEvQyxNQUFNLE9BQU8sZUFBZTtJQTJDeEI7UUF0Q0EsVUFBSyxHQUF3QixFQUFFLENBQUM7UUFDaEMsV0FBTSxHQUF3QixFQUFFLENBQUM7UUFDakMsY0FBUyxHQUFrRCxFQUFFLENBQUM7UUFDOUQsa0JBQWEsR0FBd0IsRUFBRSxDQUFDO1FBWXhDLDBCQUFxQixHQUFHLElBQUksT0FBTyxFQUFFLENBQUM7UUFVL0Isc0JBQWlCLEdBQTBCLElBQUksT0FBTyxFQUFFLENBQUM7UUFXeEQsV0FBTSxHQUFHLEtBQUssQ0FBQztRQUduQixJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUU7WUFDeEQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUNoQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDZCxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztRQUM3QixDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxD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QyxJQUFJLEVBQUUsVUFBVSxDQUFDLElBQUk7Z0JBQ3JCLFNBQVMsRUFBRSxVQUFVLENBQUMsU0FBUyxJQUFJLEVBQUU7Z0JBQ3JDLEtBQUssRUFBRSxVQUFVLENBQUMsS0FBSztnQkFDdkIsT0FBTyxFQUFFLFVBQVUsQ0FBQyxPQUFPO2dCQUMzQixVQUFVLEVBQUUsVUFBVTthQUN6QixDQUFDLENBQUM7UUFDUCxDQUFDLENBQUMsQ0FBQztJQUNYLENBQUM7SUFFTyx1QkFBdUI7UUFDM0IsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFDO0lBQ25ELENBQUM7OzRHQXBrQlEsZUFBZTtnSEFBZixlQUFlOzJGQUFmLGVBQWU7a0JBRDNCLFVBQVUiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBJbmplY3RhYmxlIH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XHJcbmltcG9ydCB7IFN1YmplY3QgfSBmcm9tICdyeGpzJztcclxuaW1wb3J0IHsgZGVib3VuY2VUaW1lIH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xyXG5cclxuaW1wb3J0IHsgR3JpZExpc3QgfSBmcm9tICcuL2dyaWRMaXN0L2dyaWRMaXN0JztcclxuaW1wb3J0IHsgSUdyaWRzdGVyT3B0aW9ucyB9IGZyb20gJy4vSUdyaWRzdGVyT3B0aW9ucyc7XHJcbmltcG9ydCB7IElHcmlkc3RlckRyYWdnYWJsZU9wdGlvbnMgfSBmcm9tICcuL0lHcmlkc3RlckRyYWdnYWJsZU9wdGlvbnMnO1xyXG5pbXBvcnQgeyBHcmlkTGlzdEl0ZW0gfSBmcm9tICcuL2dyaWRMaXN0L0dyaWRMaXN0SXRlbSc7XHJcbmltcG9ydCB7IEdyaWRzdGVyQ29tcG9uZW50IH0gZnJvbSAnLi9ncmlkc3Rlci5jb21wb25lbnQnO1xyXG5pbXBvcnQgeyBHcmlkc3Rlck9wdGlvbnMgfSBmcm9tICcuL0dyaWRzdGVyT3B0aW9ucyc7XHJcblxyXG5ASW5qZWN0YWJsZSgpXHJcbmV4cG9ydCBjbGFzcyBHcmlkc3RlclNlcnZpY2Uge1xyXG4gICAgJGVsZW1lbnQ6IEhUTUxFbGVtZW50O1xyXG5cclxuICAgIGdyaWRMaXN0OiBHcmlkTGlzdDtcclxuXHJcbiAgICBpdGVtczogQXJyYXk8R3JpZExpc3RJdGVtPiA9IFtdO1xyXG4gICAgX2l0ZW1zOiBBcnJheTxHcmlkTGlzdEl0ZW0+ID0gW107XHJcbiAgICBfaXRlbXNNYXA6IHsgW2JyZWFrcG9pbnQ6IHN0cmluZ106IEFycmF5PEdyaWRMaXN0SXRlbT4gfSA9IHt9O1xyXG4gICAgZGlzYWJsZWRJdGVtczogQXJyYXk8R3JpZExpc3RJdGVtPiA9IFtdO1xyXG5cclxuICAgIG9wdGlvbnM6IElHcmlkc3Rlck9wdGlvbnM7XHJcbiAgICBkcmFnZ2FibGVPcHRpb25zOiBJR3JpZHN0ZXJEcmFnZ2FibGVPcHRpb25zO1xyXG5cclxuICAgIGdyaWRzdGVyUmVjdDogQ2xpZW50UmVjdDtcclxuICAgIGdyaWRzdGVyU2Nyb2xsRGF0YTogeyBzY3JvbGxUb3A6IG51bWJlciwgc2Nyb2xsTGVmdDogbnVtYmVyIH07XHJcblxyXG4gICAgZ3JpZHN0ZXJPcHRpb25zOiBHcmlkc3Rlck9wdGlvbnM7XHJcblxyXG4gICAgZ3JpZHN0ZXJDb21wb25lbnQ6IEdyaWRzdGVyQ29tcG9uZW50O1xyXG5cclxuICAgIGRlYm91bmNlUmVuZGVyU3ViamVjdCA9IG5ldyBTdWJqZWN0KCk7XHJcblxyXG4gICAgcHVibGljICRwb3NpdGlvbkhpZ2hsaWdodDogSFRNTEVsZW1lbnQ7XHJcblxyXG4gICAgcHVibGljIG1heEl0ZW1XaWR0aDogbnVtYmVyO1xyXG4gICAgcHVibGljIG1heEl0ZW1IZWlnaHQ6IG51bWJlcjtcclxuXHJcbiAgICBwdWJsaWMgY2VsbFdpZHRoOiBudW1iZXI7XHJcbiAgICBwdWJsaWMgY2VsbEhlaWdodDogbnVtYmVyO1xyXG5cclxuICAgIHB1YmxpYyBpdGVtUmVtb3ZlU3ViamVjdDogU3ViamVjdDxHcmlkTGlzdEl0ZW0+ID0gbmV3IFN1YmplY3QoKTtcclxuXHJcbiAgICBwcml2YXRlIF9mb250U2l6ZTogbnVtYmVyO1xyXG5cclxuICAgIHByaXZhdGUgcHJldmlvdXNEcmFnUG9zaXRpb246IEFycmF5PG51bWJlcj47XHJcbiAgICBwcml2YXRlIHByZXZpb3VzRHJhZ1NpemU6IEFycmF5PG51bWJlcj47XHJcblxyXG4gICAgcHJpdmF0ZSBjdXJyZW50RWxlbWVudDogSFRNTEVsZW1lbnQ7XHJcblxyXG4gICAgcHJpdmF0ZSBfbWF4R3JpZENvbHM6IG51bWJlcjtcclxuXHJcbiAgICBwcml2YXRlIGlzSW5pdCA9IGZhbHNlO1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIHRoaXMuaXRlbVJlbW92ZVN1YmplY3QucGlwZShkZWJvdW5jZVRpbWUoMCkpLnN1YnNjcmliZSgoKSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMuZ3JpZExpc3QucHVsbEl0ZW1zVG9MZWZ0KCk7XHJcbiAgICAgICAgICAgIHRoaXMucmVuZGVyKCk7XHJcbiAgICAgICAgICAgIHRoaXMudXBkYXRlQ2FjaGVkSXRlbXMoKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgdGhpcy5kZWJvdW5jZVJlbmRlclN1YmplY3QucGlwZShkZWJvdW5jZVRpbWUoMCkpLnN1YnNjcmliZSgoKSA9PiB0aGlzLnJlbmRlcigpKTtcclxuICAgIH1cclxuXHJcbiAgICBpc0luaXRpYWxpemVkKCk6IGJvb2xlYW4ge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmlzSW5pdDtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIE11c3QgYmUgY2FsbGVkIGJlZm9yZSBpbml0XHJcbiAgICAgKiBAcGFyYW0gaXRlbVxyXG4gICAgICovXHJcbiAgICByZWdpc3Rlckl0ZW0oaXRlbTogR3JpZExpc3RJdGVtKSB7XHJcblxyXG4gICAgICAgIHRoaXMuaXRlbXMucHVzaChpdGVtKTtcclxuICAgICAgICByZXR1cm4gaXRlbTtcclxuICAgIH1cclxuXHJcbiAgICBpbml0KGdyaWRzdGVyQ29tcG9uZW50OiBHcmlkc3RlckNvbXBvbmVudCkge1xyXG5cclxuICAgICAgICB0aGlzLmdyaWRzdGVyQ29tcG9uZW50ID0gZ3JpZHN0ZXJDb21wb25lbnQ7XHJcblxyXG4gICAgICAgIHRoaXMuZHJhZ2dhYmxlT3B0aW9ucyA9IGdyaWRzdGVyQ29tcG9uZW50LmRyYWdnYWJsZU9wdGlvbnM7XHJcblxyXG4gICAgICAgIHRoaXMuZ3JpZHN0ZXJPcHRpb25zID0gZ3JpZHN0ZXJDb21wb25lbnQuZ3JpZHN0ZXJPcHRpb25zO1xyXG4gICAgfVxyXG5cclxuICAgIHN0YXJ0KCkge1xyXG4gICAgICAgIHRoaXMudXBkYXRlTWF4SXRlbVNpemUoKTtcclxuXHJcbiAgICAgICAgLy8gVXNlZCB0byBoaWdobGlnaHQgYSBwb3NpdGlvbiBhbiBlbGVtZW50IHdpbGwgbGFuZCBvbiB1cG9uIGRyb3BcclxuICAgICAgICBpZiAodGhpcy4kcG9zaXRpb25IaWdobGlnaHQpIHtcclxuICAgICAgICAgICAgdGhpcy5yZW1vdmVQb3NpdGlvbkhpZ2hsaWdodCgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5pbml0R3JpZExpc3QoKTtcclxuXHJcbiAgICAgICAgdGhpcy5pc0luaXQgPSB0cnVlO1xyXG5cclxuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcclxuICAgICAgICAgICAgdGhpcy5jb3B5SXRlbXMoKTtcclxuICAgICAgICAgICAgdGhpcy5maXhJdGVtc1Bvc2l0aW9ucygpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5ncmlkc3RlckNvbXBvbmVudC5yZWZsb3dHcmlkc3Rlcih0cnVlKTtcclxuICAgICAgICAgICAgdGhpcy5ncmlkc3RlckNvbXBvbmVudC5zZXRSZWFkeSgpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGluaXRHcmlkTGlzdCgpIHtcclxuICAgICAgICAvLyBDcmVhdGUgaW5zdGFuY2Ugb2YgR3JpZExpc3QgKGRlY291cGxlZCBsaWIgZm9yIGhhbmRsaW5nIHRoZSBncmlkXHJcbiAgICAgICAgLy8gcG9zaXRpb25pbmcgYW5kIHNvcnRpbmcgcG9zdC1kcmFnIGFuZCBkcm9wcGluZylcclxuICAgICAgICB0aGlzLmdyaWRMaXN0ID0gbmV3IEdyaWRMaXN0KHRoaXMuaXRlbXMsIHRoaXMub3B0aW9ucyk7XHJcbiAgICB9XHJcblxyXG4gICAgcmVuZGVyKCkge1xyXG4gICAgICAgIHRoaXMudXBkYXRlTWF4SXRlbVNpemUoKTtcclxuICAgICAgICB0aGlzLmdyaWRMaXN0LmdlbmVyYXRlR3JpZCgpO1xyXG4gICAgICAgIHRoaXMuYXBwbHlTaXplVG9JdGVtcygpO1xyXG4gICAgICAgIHRoaXMuYXBwbHlQb3NpdGlvblRvSXRlbXMoKTtcclxuICAgICAgICB0aGlzLnJlZnJlc2hMaW5lcygpO1xyXG4gICAgfVxyXG5cclxuICAgIHJlZmxvdygpIHtcclxuICAgICAgICB0aGlzLmNhbGN1bGF0ZUNlbGxTaXplKCk7XHJcbiAgICAgICAgdGhpcy5yZW5kZXIoKTtcclxuICAgIH1cclxuXHJcbiAgICBmaXhJdGVtc1Bvc2l0aW9ucygpIHtcclxuICAgICAgICBpZiAodGhpcy5vcHRpb25zLnJlc3BvbnNpdmVTaXplcykge1xyXG4gICAgICAgICAgICB0aGlzLmdyaWRMaXN0LmZpeEl0ZW1zUG9zaXRpb25zKHRoaXMub3B0aW9ucyk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5ncmlkTGlzdC5maXhJdGVtc1Bvc2l0aW9ucyh0aGlzLmdyaWRzdGVyT3B0aW9ucy5iYXNpY09wdGlvbnMpO1xyXG4gICAgICAgICAgICB0aGlzLmdyaWRzdGVyT3B0aW9ucy5yZXNwb25zaXZlT3B0aW9ucy5mb3JFYWNoKChvcHRpb25zOiBJR3JpZHN0ZXJPcHRpb25zKSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmdyaWRMaXN0LmZpeEl0ZW1zUG9zaXRpb25zKG9wdGlvbnMpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMudXBkYXRlQ2FjaGVkSXRlbXMoKTtcclxuICAgIH1cclxuXHJcbiAgICByZW1vdmVJdGVtKGl0ZW06IEdyaWRMaXN0SXRlbSkge1xyXG4gICAgICAgIGNvbnN0IGlkeCA9IHRoaXMuaXRlbXMuaW5kZXhPZihpdGVtKTtcclxuXHJcbiAgICAgICAgaWYgKGlkeCA+PSAwKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaXRlbXMuc3BsaWNlKHRoaXMuaXRlbXMuaW5kZXhPZihpdGVtKSwgMSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmdyaWRMaXN0LmRlbGV0ZUl0ZW1Qb3NpdGlvbkZyb21HcmlkKGl0ZW0pO1xyXG4gICAgICAgIHRoaXMucmVtb3ZlSXRlbUZyb21DYWNoZShpdGVtKTtcclxuICAgIH1cclxuXHJcbiAgICBvblJlc2l6ZVN0YXJ0KGl0ZW06IEdyaWRMaXN0SXRlbSkge1xyXG4gICAgICAgIHRoaXMuY3VycmVudEVsZW1lbnQgPSBpdGVtLiRlbGVtZW50O1xyXG5cclxuICAgICAgICB0aGlzLmNvcHlJdGVtcygpO1xyXG5cclxuICAgICAgICB0aGlzLl9tYXhHcmlkQ29scyA9IHRoaXMuZ3JpZExpc3QuZ3JpZC5sZW5ndGg7XHJcblxyXG4gICAgICAgIHRoaXMuaGlnaGxpZ2h0UG9zaXRpb25Gb3JJdGVtKGl0ZW0pO1xyXG5cclxuICAgICAgICB0aGlzLmdyaWRzdGVyQ29tcG9uZW50LmlzUmVzaXppbmcgPSB0cnVlO1xyXG5cclxuICAgICAgICB0aGlzLnJlZnJlc2hMaW5lcygpO1xyXG4gICAgfVxyXG5cclxuICAgIG9uUmVzaXplRHJhZyhpdGVtOiBHcmlkTGlzdEl0ZW0pIHtcclxuICAgICAgICBjb25zdCBuZXdTaXplID0gdGhpcy5zbmFwSXRlbVNpemVUb0dyaWQoaXRlbSk7XHJcbiAgICAgICAgY29uc3Qgc2l6ZUNoYW5nZWQgPSB0aGlzLmRyYWdTaXplQ2hhbmdlZChuZXdTaXplKTtcclxuICAgICAgICBjb25zdCBuZXdQb3NpdGlvbiA9IHRoaXMuc25hcEl0ZW1Qb3NpdGlvblRvR3JpZChpdGVtKTtcclxuICAgICAgICBjb25zdCBwb3NpdGlvbkNoYW5nZWQgPSB0aGlzLmRyYWdQb3NpdGlvbkNoYW5nZWQobmV3UG9zaXRpb24pO1xyXG5cclxuICAgICAgICBpZiAoc2l6ZUNoYW5nZWQgfHwgcG9zaXRpb25DaGFuZ2VkKSB7XHJcbiAgICAgICAgICAgIC8vIFJlZ2VuZXJhdGUgdGhlIGdyaWQgd2l0aCB0aGUgcG9zaXRpb25zIGZyb20gd2hlbiB0aGUgZHJhZyBzdGFydGVkXHJcbiAgICAgICAgICAgIHRoaXMucmVzdG9yZUNhY2hlZEl0ZW1zKCk7XHJcbiAgICAgICAgICAgIHRoaXMuZ3JpZExpc3QuZ2VuZXJhdGVHcmlkKCk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLnByZXZpb3VzRHJhZ1Bvc2l0aW9uID0gbmV3UG9zaXRpb247XHJcbiAgICAgICAgICAgIHRoaXMucHJldmlvdXNEcmFnU2l6ZSA9IG5ld1NpemU7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmdyaWRMaXN0Lm1vdmVBbmRSZXNpemUoaXRlbSwgbmV3UG9zaXRpb24sIHt3OiBuZXdTaXplWzBdLCBoOiBuZXdTaXplWzFdfSk7XHJcblxyXG4gICAgICAgICAgICAvLyBWaXN1YWxseSB1cGRhdGUgaXRlbSBwb3NpdGlvbnMgYW5kIGhpZ2hsaWdodCBzaGFwZVxyXG4gICAgICAgICAgICB0aGlzLmFwcGx5UG9zaXRpb25Ub0l0ZW1zKHRydWUpO1xyXG4gICAgICAgICAgICB0aGlzLmhpZ2hsaWdodFBvc2l0aW9uRm9ySXRlbShpdGVtKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgb25SZXNpemVTdG9wKGl0ZW06IEdyaWRMaXN0SXRlbSkge1xyXG4gICAgICAgIHRoaXMuY3VycmVudEVsZW1lbnQgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgdGhpcy51cGRhdGVDYWNoZWRJdGVtcygpO1xyXG4gICAgICAgIHRoaXMucHJldmlvdXNEcmFnU2l6ZSA9IG51bGw7XHJcblxyXG4gICAgICAgIHRoaXMucmVtb3ZlUG9zaXRpb25IaWdobGlnaHQoKTtcclxuXHJcbiAgICAgICAgdGhpcy5ncmlkc3RlckNvbXBvbmVudC5pc1Jlc2l6aW5nID0gZmFsc2U7XHJcblxyXG4gICAgICAgIHRoaXMuZ3JpZExpc3QucHVsbEl0ZW1zVG9MZWZ0KGl0ZW0pO1xyXG4gICAgICAgIHRoaXMuZGVib3VuY2VSZW5kZXJTdWJqZWN0Lm5leHQoKTtcclxuXHJcbiAgICAgICAgdGhpcy5maXhJdGVtc1Bvc2l0aW9ucygpO1xyXG4gICAgfVxyXG5cclxuICAgIG9uU3RhcnQoaXRlbTogR3JpZExpc3RJdGVtKSB7XHJcbiAgICAgICAgdGhpcy5jdXJyZW50RWxlbWVudCA9IGl0ZW0uJGVsZW1lbnQ7XHJcbiAgICAgICAgLy8gaXRlbUN0cmwuaXNEcmFnZ2luZyA9IHRydWU7XHJcbiAgICAgICAgLy8gQ3JlYXRlIGEgZGVlcCBjb3B5IG9mIHRoZSBpdGVtczsgd2UgdXNlIHRoZW0gdG8gcmV2ZXJ0IHRoZSBpdGVtXHJcbiAgICAgICAgLy8gcG9zaXRpb25zIGFmdGVyIGVhY2ggZHJhZyBjaGFuZ2UsIG1ha2luZyBhbiBlbnRpcmUgZHJhZyBvcGVyYXRpb24gbGVzc1xyXG4gICAgICAgIC8vIGRpc3RydWN0YWJsZVxyXG4gICAgICAgIHRoaXMuY29weUl0ZW1zKCk7XHJcblxyXG4gICAgICAgIC8vIFNpbmNlIGRyYWdnaW5nIGFjdHVhbGx5IGFsdGVycyB0aGUgZ3JpZCwgd2UgbmVlZCB0byBlc3RhYmxpc2ggdGhlIG51bWJlclxyXG4gICAgICAgIC8vIG9mIGNvbHMgKCsxIGV4dHJhKSBiZWZvcmUgdGhlIGRyYWcgc3RhcnRzXHJcblxyXG4gICAgICAgIHRoaXMuX21heEdyaWRDb2xzID0gdGhpcy5ncmlkTGlzdC5ncmlkLmxlbmd0aDtcclxuXHJcbiAgICAgICAgdGhpcy5ncmlkc3RlckNvbXBvbmVudC5pc0RyYWdnaW5nID0gdHJ1ZTtcclxuICAgICAgICB0aGlzLmdyaWRzdGVyQ29tcG9uZW50LnVwZGF0ZUdyaWRzdGVyRWxlbWVudERhdGEoKTtcclxuXHJcbiAgICAgICAgdGhpcy5yZWZyZXNoTGluZXMoKTtcclxuICAgIH1cclxuXHJcbiAgICBvbkRyYWcoaXRlbTogR3JpZExpc3RJdGVtKSB7XHJcbiAgICAgICAgY29uc3QgbmV3UG9zaXRpb24gPSB0aGlzLnNuYXBJdGVtUG9zaXRpb25Ub0dyaWQoaXRlbSk7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmRyYWdQb3NpdGlvbkNoYW5nZWQobmV3UG9zaXRpb24pKSB7XHJcblxyXG4gICAgICAgICAgICAvLyBSZWdlbmVyYXRlIHRoZSBncmlkIHdpdGggdGhlIHBvc2l0aW9ucyBmcm9tIHdoZW4gdGhlIGRyYWcgc3RhcnRlZFxyXG4gICAgICAgICAgICB0aGlzLnJlc3RvcmVDYWNoZWRJdGVtcygpO1xyXG4gICAgICAgICAgICB0aGlzLmdyaWRMaXN0LmdlbmVyYXRlR3JpZCgpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5wcmV2aW91c0RyYWdQb3NpdGlvbiA9IG5ld1Bvc2l0aW9uO1xyXG4gICAgICAgICAgICBpZiAodGhpcy5vcHRpb25zLmRpcmVjdGlvbiA9PT0gJ25vbmUnICYmXHJcbiAgICAgICAgICAgICAgICAhdGhpcy5ncmlkTGlzdC5jaGVja0l0ZW1BYm92ZUVtcHR5QXJlYShpdGVtLCB7eDogbmV3UG9zaXRpb25bMF0sIHk6IG5ld1Bvc2l0aW9uWzFdfSkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gU2luY2UgdGhlIGl0ZW1zIGxpc3QgaXMgYSBkZWVwIGNvcHksIHdlIG5lZWQgdG8gZmV0Y2ggdGhlIGl0ZW1cclxuICAgICAgICAgICAgLy8gY29ycmVzcG9uZGluZyB0byB0aGlzIGRyYWcgYWN0aW9uIGFnYWluXHJcbiAgICAgICAgICAgIHRoaXMuZ3JpZExpc3QubW92ZUl0ZW1Ub1Bvc2l0aW9uKGl0ZW0sIG5ld1Bvc2l0aW9uKTtcclxuXHJcbiAgICAgICAgICAgIC8vIFZpc3VhbGx5IHVwZGF0ZSBpdGVtIHBvc2l0aW9ucyBhbmQgaGlnaGxpZ2h0IHNoYXBlXHJcbiAgICAgICAgICAgIHRoaXMuYXBwbHlQb3NpdGlvblRvSXRlbXModHJ1ZSk7XHJcbiAgICAgICAgICAgIHRoaXMuaGlnaGxpZ2h0UG9zaXRpb25Gb3JJdGVtKGl0ZW0pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBjYW5jZWwoKSB7XHJcbiAgICAgICAgdGhpcy5yZXN0b3JlQ2FjaGVkSXRlbXMoKTtcclxuICAgICAgICB0aGlzLnByZXZpb3VzRHJhZ1Bvc2l0aW9uID0gbnVsbDtcclxuICAgICAgICB0aGlzLnVwZGF0ZU1heEl0ZW1TaXplKCk7XHJcbiAgICAgICAgdGhpcy5hcHBseVBvc2l0aW9uVG9JdGVtcygpO1xyXG4gICAgICAgIHRoaXMucmVtb3ZlUG9zaXRpb25IaWdobGlnaHQoKTtcclxuICAgICAgICB0aGlzLmN1cnJlbnRFbGVtZW50ID0gdW5kZWZpbmVkO1xyXG4gICAgICAgIHRoaXMuZ3JpZHN0ZXJDb21wb25lbnQuaXNEcmFnZ2luZyA9IGZhbHNlO1xyXG4gICAgfVxyXG5cclxuICAgIG9uRHJhZ091dCAoaXRlbTogR3JpZExpc3RJdGVtKSB7XHJcblxyXG4gICAgICAgIHRoaXMuY2FuY2VsKCk7XHJcblxyXG4gICAgICAgIGNvbnN0IGlkeCA9IHRoaXMuaXRlbXMuaW5kZXhPZihpdGVtKTtcclxuICAgICAgICBpZiAoaWR4ID49IDApIHtcclxuICAgICAgICAgICAgdGhpcy5pdGVtcy5zcGxpY2UoaWR4LCAxKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuZ3JpZExpc3QucHVsbEl0ZW1zVG9MZWZ0KCk7XHJcbiAgICAgICAgdGhpcy5yZW5kZXIoKTtcclxuICAgIH1cclxuXHJcbiAgICBvblN0b3AoaXRlbTogR3JpZExpc3RJdGVtKSB7XHJcbiAgICAgICAgdGhpcy5jdXJyZW50RWxlbWVudCA9IHVuZGVmaW5lZDtcclxuICAgICAgICB0aGlzLnVwZGF0ZUNhY2hlZEl0ZW1zKCk7XHJcbiAgICAgICAgdGhpcy5wcmV2aW91c0RyYWdQb3NpdGlvbiA9IG51bGw7XHJcblxyXG4gICAgICAgIHRoaXMucmVtb3ZlUG9zaXRpb25IaWdobGlnaHQoKTtcclxuXHJcbiAgICAgICAgdGhpcy5ncmlkTGlzdC5wdWxsSXRlbXNUb0xlZnQoaXRlbSk7XHJcblxyXG4gICAgICAgIHRoaXMuZ3JpZHN0ZXJDb21wb25lbnQuaXNEcmFnZ2luZyA9IGZhbHNlO1xyXG5cclxuICAgICAgICB0aGlzLnJlZnJlc2hMaW5lcygpO1xyXG4gICAgfVxyXG5cclxuICAgIGNhbGN1bGF0ZUNlbGxTaXplKCkge1xyXG4gICAgICAgIGlmICh0aGlzLm9wdGlvbnMuZGlyZWN0aW9uID09PSAnaG9yaXpvbnRhbCcpIHtcclxuICAgICAgICAgICAgdGhpcy5jZWxsSGVpZ2h0ID0gdGhpcy5jYWxjdWxhdGVDZWxsSGVpZ2h0KCk7XHJcbiAgICAgICAgICAgIHRoaXMuY2VsbFdpZHRoID0gdGhpcy5vcHRpb25zLmNlbGxXaWR0aCB8fCB0aGlzLmNlbGxIZWlnaHQgKiB0aGlzLm9wdGlvbnMud2lkdGhIZWlnaHRSYXRpbztcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLmNlbGxXaWR0aCA9IHRoaXMuY2FsY3VsYXRlQ2VsbFdpZHRoKCk7XHJcbiAgICAgICAgICAgIHRoaXMuY2VsbEhlaWdodCA9IHRoaXMub3B0aW9ucy5jZWxsSGVpZ2h0IHx8IHRoaXMuY2VsbFdpZHRoIC8gdGhpcy5vcHRpb25zLndpZHRoSGVpZ2h0UmF0aW87XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICh0aGlzLm9wdGlvbnMuaGVpZ2h0VG9Gb250U2l6ZVJhdGlvKSB7XHJcbiAgICAgICAgICAgIHRoaXMuX2ZvbnRTaXplID0gdGhpcy5jZWxsSGVpZ2h0ICogdGhpcy5vcHRpb25zLmhlaWdodFRvRm9udFNpemVSYXRpbztcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgYXBwbHlQb3NpdGlvblRvSXRlbXMoaW5jcmVhc2VHcmlkc3RlclNpemU/KSB7XHJcbiAgICAgICAgaWYgKCF0aGlzLm9wdGlvbnMuc2hyaW5rKSB7XHJcbiAgICAgICAgICAgIGluY3JlYXNlR3JpZHN0ZXJTaXplID0gdHJ1ZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gVE9ETzogSW1wbGVtZW50IGdyb3VwIHNlcGFyYXRvcnNcclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuaXRlbXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgLy8gRG9uJ3QgaW50ZXJmZXJlIHdpdGggdGhlIHBvc2l0aW9ucyBvZiB0aGUgZHJhZ2dlZCBpdGVtc1xyXG4gICAgICAgICAgICBpZiAodGhpcy5pc0N1cnJlbnRFbGVtZW50KHRoaXMuaXRlbXNbaV0uJGVsZW1lbnQpKSB7XHJcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLml0ZW1zW2ldLmFwcGx5UG9zaXRpb24odGhpcyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBjaGlsZCA9IDxIVE1MRWxlbWVudD50aGlzLmdyaWRzdGVyQ29tcG9uZW50LiRlbGVtZW50LmZpcnN0Q2hpbGQ7XHJcbiAgICAgICAgLy8gVXBkYXRlIHRoZSB3aWR0aCBvZiB0aGUgZW50aXJlIGdyaWQgY29udGFpbmVyIHdpdGggZW5vdWdoIHJvb20gb24gdGhlXHJcbiAgICAgICAgLy8gcmlnaHQgdG8gYWxsb3cgZHJhZ2dpbmcgaXRlbXMgdG8gdGhlIGVuZCBvZiB0aGUgZ3JpZC5cclxuICAgICAgICBpZiAodGhpcy5vcHRpb25zLmRpcmVjdGlvbiA9PT0gJ2hvcml6b250YWwnKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGluY3JlYXNlV2lkdGhXaXRoID0gKGluY3JlYXNlR3JpZHN0ZXJTaXplKSA/IHRoaXMubWF4SXRlbVdpZHRoIDogMDtcclxuICAgICAgICAgICAgY2hpbGQuc3R5bGUuaGVpZ2h0ID0gJyc7XHJcbiAgICAgICAgICAgIGNoaWxkLnN0eWxlLndpZHRoID0gKCh0aGlzLmdyaWRMaXN0LmdyaWQubGVuZ3RoICsgaW5jcmVhc2VXaWR0aFdpdGgpICogdGhpcy5jZWxsV2lkdGgpICsgJ3B4JztcclxuXHJcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLmdyaWRMaXN0LmdyaWQubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGluY3JlYXNlSGVpZ2h0V2l0aCA9IChpbmNyZWFzZUdyaWRzdGVyU2l6ZSkgPyB0aGlzLm1heEl0ZW1IZWlnaHQgOiAwO1xyXG4gICAgICAgICAgICBjaGlsZC5zdHlsZS5oZWlnaHQgPSAoKHRoaXMuZ3JpZExpc3QuZ3JpZC5sZW5ndGggKyBpbmNyZWFzZUhlaWdodFdpdGgpICogdGhpcy5jZWxsSGVpZ2h0KSArICdweCc7XHJcbiAgICAgICAgICAgIGNoaWxkLnN0eWxlLndpZHRoID0gJyc7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJlZnJlc2hMaW5lcygpIHtcclxuICAgICAgICBjb25zdCBncmlkc3RlckNvbnRhaW5lciA9IDxIVE1MRWxlbWVudD50aGlzLmdyaWRzdGVyQ29tcG9uZW50LiRlbGVtZW50LmZpcnN0Q2hpbGQ7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLm9wdGlvbnMubGluZXMgJiYgdGhpcy5vcHRpb25zLmxpbmVzLnZpc2libGUgJiZcclxuICAgICAgICAgICAgKHRoaXMuZ3JpZHN0ZXJDb21wb25lbnQuaXNEcmFnZ2luZyB8fCB0aGlzLmdyaWRzdGVyQ29tcG9uZW50LmlzUmVzaXppbmcgfHwgdGhpcy5vcHRpb25zLmxpbmVzLmFsd2F5cykpIHtcclxuICAgICAgICAgICAgY29uc3QgbGluZXNDb2xvciA9IHRoaXMub3B0aW9ucy5saW5lcy5jb2xvciB8fCAnI2Q4ZDhkOCc7XHJcbiAgICAgICAgICAgIGNvbnN0IGxpbmVzQmdDb2xvciA9IHRoaXMub3B0aW9ucy5saW5lcy5iYWNrZ3JvdW5kQ29sb3IgfHwgJ3RyYW5zcGFyZW50JztcclxuICAgICAgICAgICAgY29uc3QgbGluZXNXaWR0aCA9IHRoaXMub3B0aW9ucy5saW5lcy53aWR0aCB8fCAxO1xyXG4gICAgICAgICAgICBjb25zdCBiZ1Bvc2l0aW9uID0gbGluZXNXaWR0aCAvIDI7XHJcblxyXG4gICAgICAgICAgICBncmlkc3RlckNvbnRhaW5lci5zdHlsZS5iYWNrZ3JvdW5kU2l6ZSA9IGAke3RoaXMuY2VsbFdpZHRofXB4ICR7dGhpcy5jZWxsSGVpZ2h0fXB4YDtcclxuICAgICAgICAgICAgZ3JpZHN0ZXJDb250YWluZXIuc3R5bGUuYmFja2dyb3VuZFBvc2l0aW9uID0gYC0ke2JnUG9zaXRpb259cHggLSR7YmdQb3NpdGlvbn1weGA7XHJcbiAgICAgICAgICAgIGdyaWRzdGVyQ29udGFpbmVyLnN0eWxlLmJhY2tncm91bmRJbWFnZSA9IGBcclxuICAgICAgICAgICAgICAgIGxpbmVhci1ncmFkaWVudCh0byByaWdodCwgJHtsaW5lc0NvbG9yfSAke2xpbmVzV2lkdGh9cHgsICR7bGluZXNCZ0NvbG9yfSAke2xpbmVzV2lkdGh9cHgpLFxyXG4gICAgICAgICAgICAgICAgbGluZWFyLWdyYWRpZW50KHRvIGJvdHRvbSwgJHtsaW5lc0NvbG9yfSAke2xpbmVzV2lkdGh9cHgsICR7bGluZXNCZ0NvbG9yfSAke2xpbmVzV2lkdGh9cHgpXHJcbiAgICAgICAgICAgIGA7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgZ3JpZHN0ZXJDb250YWluZXIuc3R5bGUuYmFja2dyb3VuZFNpemUgPSAnJztcclxuICAgICAgICAgICAgZ3JpZHN0ZXJDb250YWluZXIuc3R5bGUuYmFja2dyb3VuZFBvc2l0aW9uID0gJyc7XHJcbiAgICAgICAgICAgIGdyaWRzdGVyQ29udGFpbmVyLnN0eWxlLmJhY2tncm91bmRJbWFnZSA9ICcnO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHJlbW92ZUl0ZW1Gcm9tQ2FjaGUoaXRlbTogR3JpZExpc3RJdGVtKSB7XHJcbiAgICAgICAgdGhpcy5faXRlbXMgPSB0aGlzLl9pdGVtc1xyXG4gICAgICAgICAgICAuZmlsdGVyKGNhY2hlZEl0ZW0gPT4gY2FjaGVkSXRlbS4kZWxlbWVudCAhPT0gaXRlbS4kZWxlbWVudCk7XHJcblxyXG4gICAgICAgIE9iamVjdC5rZXlzKHRoaXMuX2l0ZW1zTWFwKVxyXG4gICAgICAgICAgICAuZm9yRWFjaCgoYnJlYWtwb2ludDogc3RyaW5nKSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl9pdGVtc01hcFticmVha3BvaW50XSA9IHRoaXMuX2l0ZW1zTWFwW2JyZWFrcG9pbnRdXHJcbiAgICAgICAgICAgICAgICAgICAgLmZpbHRlcihjYWNoZWRJdGVtID0+IGNhY2hlZEl0ZW0uJGVsZW1lbnQgIT09IGl0ZW0uJGVsZW1lbnQpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGNvcHlJdGVtcygpOiB2b2lkIHtcclxuICAgICAgICB0aGlzLl9pdGVtcyA9IHRoaXMuaXRlbXNcclxuICAgICAgICAgICAgLmZpbHRlcihpdGVtID0+IHRoaXMuaXNWYWxpZEdyaWRJdGVtKGl0ZW0pKVxyXG4gICAgICAgICAgICAubWFwKChpdGVtOiBHcmlkTGlzdEl0ZW0pID0+IHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBpdGVtLmNvcHlGb3JCcmVha3BvaW50KG51bGwpO1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgdGhpcy5ncmlkc3Rlck9wdGlvbnMucmVzcG9uc2l2ZU9wdGlvbnMuZm9yRWFjaCgob3B0aW9uczogSUdyaWRzdGVyT3B0aW9ucykgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLl9pdGVtc01hcFtvcHRpb25zLmJyZWFrcG9pbnRdID0gdGhpcy5pdGVtc1xyXG4gICAgICAgICAgICAgICAgLmZpbHRlcihpdGVtID0+IHRoaXMuaXNWYWxpZEdyaWRJdGVtKGl0ZW0pKVxyXG4gICAgICAgICAgICAgICAgLm1hcCgoaXRlbTogR3JpZExpc3RJdGVtKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGl0ZW0uY29weUZvckJyZWFrcG9pbnQob3B0aW9ucy5icmVha3BvaW50KTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogVXBkYXRlIG1heEl0ZW1XaWR0aCBhbmQgbWF4SXRlbUhlaWdodCB2YWxlcyBhY2NvcmRpbmcgdG8gY3VycmVudCBzdGF0ZSBvZiBpdGVtc1xyXG4gICAgICovXHJcbiAgICBwcml2YXRlIHVwZGF0ZU1heEl0ZW1TaXplKCkge1xyXG4gICAgICAgIHRoaXMubWF4SXRlbVdpZHRoID0gTWF0aC5tYXguYXBwbHkoXHJcbiAgICAgICAgICAgIG51bGwsIHRoaXMuaXRlbXMubWFwKChpdGVtKSA9PiB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gaXRlbS53O1xyXG4gICAgICAgICAgICB9KSk7XHJcbiAgICAgICAgdGhpcy5tYXhJdGVtSGVpZ2h0ID0gTWF0aC5tYXguYXBwbHkoXHJcbiAgICAgICAgICAgIG51bGwsIHRoaXMuaXRlbXMubWFwKChpdGVtKSA9PiB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gaXRlbS5oO1xyXG4gICAgICAgICAgICB9KSk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBVcGRhdGUgaXRlbXMgcHJvcGVydGllcyBvZiBwcmV2aW91c2x5IGNhY2hlZCBpdGVtc1xyXG4gICAgICovXHJcbiAgICBwcml2YXRlIHJlc3RvcmVDYWNoZWRJdGVtcygpIHtcclxuICAgICAgICBjb25zdCBpdGVtcyA9IHRoaXMub3B0aW9ucy5icmVha3BvaW50ID8gdGhpcy5faXRlbXNNYXBbdGhpcy5vcHRpb25zLmJyZWFrcG9pbnRdIDogdGhpcy5faXRlbXM7XHJcblxyXG4gICAgICAgIHRoaXMuaXRlbXNcclxuICAgICAgICAgICAgLmZpbHRlcihpdGVtID0+IHRoaXMuaXNWYWxpZEdyaWRJdGVtKGl0ZW0pKVxyXG4gICAgICAgICAgICAuZm9yRWFjaCgoaXRlbTogR3JpZExpc3RJdGVtKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBjYWNoZWRJdGVtOiBHcmlkTGlzdEl0ZW0gPSBpdGVtcy5maWx0ZXIoY2FjaGVkSXRtID0+IHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FjaGVkSXRtLiRlbGVtZW50ID09PSBpdGVtLiRlbGVtZW50O1xyXG4gICAgICAgICAgICAgICAgfSlbMF07XHJcblxyXG4gICAgICAgICAgICAgICAgaXRlbS54ID0gY2FjaGVkSXRlbS54O1xyXG4gICAgICAgICAgICAgICAgaXRlbS55ID0gY2FjaGVkSXRlbS55O1xyXG5cclxuICAgICAgICAgICAgICAgIGl0ZW0udyA9IGNhY2hlZEl0ZW0udztcclxuICAgICAgICAgICAgICAgIGl0ZW0uaCA9IGNhY2hlZEl0ZW0uaDtcclxuICAgICAgICAgICAgICAgIGl0ZW0uYXV0b1NpemUgPSBjYWNoZWRJdGVtLmF1dG9TaXplO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIElmIGl0ZW0gc2hvdWxkIHJlYWN0IG9uIGdyaWRcclxuICAgICAqIEBwYXJhbSBHcmlkTGlzdEl0ZW0gaXRlbVxyXG4gICAgICogQHJldHVybnMgYm9vbGVhblxyXG4gICAgICovXHJcbiAgICBwcml2YXRlIGlzVmFsaWRHcmlkSXRlbShpdGVtOiBHcmlkTGlzdEl0ZW0pOiBib29sZWFuIHtcclxuICAgICAgICBpZiAodGhpcy5vcHRpb25zLmRpcmVjdGlvbiA9PT0gJ25vbmUnKSB7XHJcbiAgICAgICAgICAgIHJldHVybiAhIWl0ZW0uaXRlbUNvbXBvbmVudDtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBjYWxjdWxhdGVDZWxsV2lkdGgoKSB7XHJcbiAgICAgICAgY29uc3QgZ3JpZHN0ZXJXaWR0aCA9IHBhcnNlRmxvYXQod2luZG93LmdldENvbXB1dGVkU3R5bGUodGhpcy5ncmlkc3RlckNvbXBvbmVudC4kZWxlbWVudCkud2lkdGgpO1xyXG5cclxuICAgICAgICByZXR1cm4gZ3JpZHN0ZXJXaWR0aCAvIHRoaXMub3B0aW9ucy5sYW5lcztcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGNhbGN1bGF0ZUNlbGxIZWlnaHQoKSB7XHJcbiAgICAgICAgY29uc3QgZ3JpZHN0ZXJIZWlnaHQgPSBwYXJzZUZsb2F0KHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKHRoaXMuZ3JpZHN0ZXJDb21wb25lbnQuJGVsZW1lbnQpLmhlaWdodCk7XHJcblxyXG4gICAgICAgIHJldHVybiBncmlkc3RlckhlaWdodCAvIHRoaXMub3B0aW9ucy5sYW5lcztcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFwcGx5U2l6ZVRvSXRlbXMoKSB7XHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLml0ZW1zLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaXRlbXNbaV0uYXBwbHlTaXplKCk7XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy5vcHRpb25zLmhlaWdodFRvRm9udFNpemVSYXRpbykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5pdGVtc1tpXS4kZWxlbWVudC5zdHlsZVsnZm9udC1zaXplJ10gPSB0aGlzLl9mb250U2l6ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGlzQ3VycmVudEVsZW1lbnQoZWxlbWVudCkge1xyXG4gICAgICAgIGlmICghdGhpcy5jdXJyZW50RWxlbWVudCkge1xyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBlbGVtZW50ID09PSB0aGlzLmN1cnJlbnRFbGVtZW50O1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgc25hcEl0ZW1TaXplVG9HcmlkKGl0ZW06IEdyaWRMaXN0SXRlbSk6IEFycmF5PG51bWJlcj4ge1xyXG4gICAgICAgIGNvbnN0IGl0ZW1TaXplID0ge1xyXG4gICAgICAgICAgICB3aWR0aDogcGFyc2VJbnQoaXRlbS4kZWxlbWVudC5zdHlsZS53aWR0aCwgMTApIC0gMSxcclxuICAgICAgICAgICAgaGVpZ2h0OiBwYXJzZUludChpdGVtLiRlbGVtZW50LnN0eWxlLmhlaWdodCwgMTApIC0gMVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGxldCBjb2xTaXplID0gTWF0aC5yb3VuZChpdGVtU2l6ZS53aWR0aCAvIHRoaXMuY2VsbFdpZHRoKTtcclxuICAgICAgICBsZXQgcm93U2l6ZSA9IE1hdGgucm91bmQoaXRlbVNpemUuaGVpZ2h0IC8gdGhpcy5jZWxsSGVpZ2h0KTtcclxuXHJcbiAgICAgICAgLy8gS2VlcCBpdGVtIG1pbmltdW0gMVxyXG4gICAgICAgIGNvbFNpemUgPSBNYXRoLm1heChjb2xTaXplLCAxKTtcclxuICAgICAgICByb3dTaXplID0gTWF0aC5tYXgocm93U2l6ZSwgMSk7XHJcblxyXG4gICAgICAgIC8vIGNoZWNrIGlmIGVsZW1lbnQgaXMgcGlubmVkXHJcbiAgICAgICAgaWYgKHRoaXMuZ3JpZExpc3QuaXNPdmVyRml4ZWRBcmVhKGl0ZW0ueCwgaXRlbS55LCBjb2xTaXplLCByb3dTaXplLCBpdGVtKSkge1xyXG4gICAgICAgICAgICByZXR1cm4gW2l0ZW0udywgaXRlbS5oXTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBbY29sU2l6ZSwgcm93U2l6ZV07XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBnZW5lcmF0ZUl0ZW1Qb3NpdGlvbihpdGVtOiBHcmlkTGlzdEl0ZW0pOiB7IHg6IG51bWJlciwgeTogbnVtYmVyIH0ge1xyXG4gICAgICAgIGxldCBwb3NpdGlvbjtcclxuXHJcbiAgICAgICAgaWYgKGl0ZW0uaXRlbVByb3RvdHlwZSkge1xyXG4gICAgICAgICAgICBjb25zdCBjb29yZHMgPSBpdGVtLml0ZW1Qcm90b3R5cGUuZ2V0UG9zaXRpb25Ub0dyaWRzdGVyKHRoaXMpO1xyXG4gICAgICAgICAgICBwb3NpdGlvbiA9IHtcclxuICAgICAgICAgICAgICAgIHg6IE1hdGgucm91bmQoY29vcmRzLnggLyB0aGlzLmNlbGxXaWR0aCksXHJcbiAgICAgICAgICAgICAgICB5OiBNYXRoLnJvdW5kKGNvb3Jkcy55IC8gdGhpcy5jZWxsSGVpZ2h0KVxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHBvc2l0aW9uID0ge1xyXG4gICAgICAgICAgICAgICAgeDogTWF0aC5yb3VuZChpdGVtLnBvc2l0aW9uWCAvIHRoaXMuY2VsbFdpZHRoKSxcclxuICAgICAgICAgICAgICAgIHk6IE1hdGgucm91bmQoaXRlbS5wb3NpdGlvblkgLyB0aGlzLmNlbGxIZWlnaHQpXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gcG9zaXRpb247XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBzbmFwSXRlbVBvc2l0aW9uVG9HcmlkKGl0ZW06IEdyaWRMaXN0SXRlbSkge1xyXG4gICAgICAgIGNvbnN0IHBvc2l0aW9uID0gdGhpcy5nZW5lcmF0ZUl0ZW1Qb3NpdGlvbihpdGVtKTtcclxuICAgICAgICBsZXQgY29sID0gcG9zaXRpb24ueDtcclxuICAgICAgICBsZXQgcm93ID0gcG9zaXRpb24ueTtcclxuXHJcbiAgICAgICAgLy8gS2VlcCBpdGVtIHBvc2l0aW9uIHdpdGhpbiB0aGUgZ3JpZCBhbmQgZG9uJ3QgbGV0IHRoZSBpdGVtIGNyZWF0ZSBtb3JlXHJcbiAgICAgICAgLy8gdGhhbiBvbmUgZXh0cmEgY29sdW1uXHJcbiAgICAgICAgY29sID0gTWF0aC5tYXgoY29sLCAwKTtcclxuICAgICAgICByb3cgPSBNYXRoLm1heChyb3csIDApO1xyXG5cclxuICAgICAgICBpZiAodGhpcy5vcHRpb25zLmRpcmVjdGlvbiA9PT0gJ2hvcml6b250YWwnKSB7XHJcbiAgICAgICAgICAgIGNvbCA9IE1hdGgubWluKGNvbCwgdGhpcy5fbWF4R3JpZENvbHMpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGNvbCA9IE1hdGgubWluKGNvbCwgTWF0aC5tYXgoMCwgdGhpcy5vcHRpb25zLmxhbmVzIC0gaXRlbS53KSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBjaGVjayBpZiBlbGVtZW50IGlzIHBpbm5lZFxyXG4gICAgICAgIGlmICh0aGlzLmdyaWRMaXN0LmlzT3ZlckZpeGVkQXJlYShjb2wsIHJvdywgaXRlbS53LCBpdGVtLmgpKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBbaXRlbS54LCBpdGVtLnldO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIFtjb2wsIHJvd107XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBkcmFnU2l6ZUNoYW5nZWQobmV3U2l6ZSk6IGJvb2xlYW4ge1xyXG4gICAgICAgIGlmICghdGhpcy5wcmV2aW91c0RyYWdTaXplKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gKG5ld1NpemVbMF0gIT09IHRoaXMucHJldmlvdXNEcmFnU2l6ZVswXSB8fFxyXG4gICAgICAgICAgICBuZXdTaXplWzFdICE9PSB0aGlzLnByZXZpb3VzRHJhZ1NpemVbMV0pO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZHJhZ1Bvc2l0aW9uQ2hhbmdlZChuZXdQb3NpdGlvbik6IGJvb2xlYW4ge1xyXG4gICAgICAgIGlmICghdGhpcy5wcmV2aW91c0RyYWdQb3NpdGlvbikge1xyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIChuZXdQb3NpdGlvblswXSAhPT0gdGhpcy5wcmV2aW91c0RyYWdQb3NpdGlvblswXSB8fFxyXG4gICAgICAgICAgICBuZXdQb3NpdGlvblsxXSAhPT0gdGhpcy5wcmV2aW91c0RyYWdQb3NpdGlvblsxXSk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBoaWdobGlnaHRQb3NpdGlvbkZvckl0ZW0oaXRlbSkge1xyXG4gICAgICAgIGNvbnN0IHNpemUgPSBpdGVtLmNhbGN1bGF0ZVNpemUodGhpcyk7XHJcbiAgICAgICAgY29uc3QgcG9zaXRpb24gPSBpdGVtLmNhbGN1bGF0ZVBvc2l0aW9uKHRoaXMpO1xyXG5cclxuICAgICAgICB0aGlzLiRwb3NpdGlvbkhpZ2hsaWdodC5zdHlsZS53aWR0aCA9IHNpemUud2lkdGggKyAncHgnO1xyXG4gICAgICAgIHRoaXMuJHBvc2l0aW9uSGlnaGxpZ2h0LnN0eWxlLmhlaWdodCA9IHNpemUuaGVpZ2h0ICsgJ3B4JztcclxuICAgICAgICB0aGlzLiRwb3NpdGlvbkhpZ2hsaWdodC5zdHlsZS5sZWZ0ID0gcG9zaXRpb24ubGVmdCArICdweCc7XHJcbiAgICAgICAgdGhpcy4kcG9zaXRpb25IaWdobGlnaHQuc3R5bGUudG9wID0gcG9zaXRpb24udG9wICsgJ3B4JztcclxuICAgICAgICB0aGlzLiRwb3NpdGlvbkhpZ2hsaWdodC5zdHlsZS5kaXNwbGF5ID0gJyc7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLm9wdGlvbnMuaGVpZ2h0VG9Gb250U2l6ZVJhdGlvKSB7XHJcbiAgICAgICAgICAgIHRoaXMuJHBvc2l0aW9uSGlnaGxpZ2h0LnN0eWxlWydmb250LXNpemUnXSA9IHRoaXMuX2ZvbnRTaXplO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgdXBkYXRlQ2FjaGVkSXRlbXMoKSB7XHJcbiAgICAgICAgLy8gTm90aWZ5IHRoZSB1c2VyIHdpdGggdGhlIGl0ZW1zIHRoYXQgY2hhbmdlZCBzaW5jZSB0aGUgcHJldmlvdXMgc25hcHNob3RcclxuICAgICAgICB0aGlzLnRyaWdnZXJPbkNoYW5nZShudWxsKTtcclxuICAgICAgICB0aGlzLmdyaWRzdGVyT3B0aW9ucy5yZXNwb25zaXZlT3B0aW9ucy5mb3JFYWNoKChvcHRpb25zOiBJR3JpZHN0ZXJPcHRpb25zKSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMudHJpZ2dlck9uQ2hhbmdlKG9wdGlvbnMuYnJlYWtwb2ludCk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHRoaXMuY29weUl0ZW1zKCk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSB0cmlnZ2VyT25DaGFuZ2UoYnJlYWtwb2ludD8pIHtcclxuICAgICAgICBjb25zdCBpdGVtcyA9IGJyZWFrcG9pbnQgPyB0aGlzLl9pdGVtc01hcFticmVha3BvaW50XSA6IHRoaXMuX2l0ZW1zO1xyXG4gICAgICAgIGNvbnN0IGNoYW5nZUl0ZW1zID0gdGhpcy5ncmlkTGlzdC5nZXRDaGFuZ2VkSXRlbXMoaXRlbXMgfHwgW10sIGJyZWFrcG9pbnQpO1xyXG5cclxuICAgICAgICBjaGFuZ2VJdGVtc1xyXG4gICAgICAgICAgICAuZmlsdGVyKChpdGVtQ2hhbmdlOiBhbnkpID0+IHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBpdGVtQ2hhbmdlLml0ZW0uaXRlbUNvbXBvbmVudDtcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgLmZvckVhY2goKGl0ZW1DaGFuZ2U6IGFueSkgPT4ge1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChpdGVtQ2hhbmdlLmNoYW5nZXMuaW5kZXhPZigneCcpID49IDApIHtcclxuICAgICAgICAgICAgICAgICAgICBpdGVtQ2hhbmdlLml0ZW0udHJpZ2dlckNoYW5nZVgoYnJlYWtwb2ludCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAoaXRlbUNoYW5nZS5jaGFuZ2VzLmluZGV4T2YoJ3knKSA+PSAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaXRlbUNoYW5nZS5pdGVtLnRyaWdnZXJDaGFuZ2VZKGJyZWFrcG9pbnQpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYgKGl0ZW1DaGFuZ2UuY2hhbmdlcy5pbmRleE9mKCd3JykgPj0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGl0ZW1DaGFuZ2UuaXRlbS50cmlnZ2VyQ2hhbmdlVyhicmVha3BvaW50KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmIChpdGVtQ2hhbmdlLmNoYW5nZXMuaW5kZXhPZignaCcpID49IDApIHtcclxuICAgICAgICAgICAgICAgICAgICBpdGVtQ2hhbmdlLml0ZW0udHJpZ2dlckNoYW5nZUgoYnJlYWtwb2ludCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAvLyBzaG91bGQgYmUgY2FsbGVkIG9ubHkgb25jZSAobm90IGZvciBlYWNoIGJyZWFrcG9pbnQpXHJcbiAgICAgICAgICAgICAgICBpdGVtQ2hhbmdlLml0ZW0uaXRlbUNvbXBvbmVudC5jaGFuZ2UuZW1pdCh7XHJcbiAgICAgICAgICAgICAgICAgICAgaXRlbTogaXRlbUNoYW5nZS5pdGVtLFxyXG4gICAgICAgICAgICAgICAgICAgIG9sZFZhbHVlczogaXRlbUNoYW5nZS5vbGRWYWx1ZXMgfHwge30sXHJcbiAgICAgICAgICAgICAgICAgICAgaXNOZXc6IGl0ZW1DaGFuZ2UuaXNOZXcsXHJcbiAgICAgICAgICAgICAgICAgICAgY2hhbmdlczogaXRlbUNoYW5nZS5jaGFuZ2VzLFxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrcG9pbnQ6IGJyZWFrcG9pbnRcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHJlbW92ZVBvc2l0aW9uSGlnaGxpZ2h0KCkge1xyXG4gICAgICAgIHRoaXMuJHBvc2l0aW9uSGlnaGxpZ2h0LnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XHJcbiAgICB9XHJcblxyXG59XHJcbiJdfQ==