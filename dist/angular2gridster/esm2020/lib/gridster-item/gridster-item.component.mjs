import { Component, ElementRef, Inject, Input, Output, EventEmitter, HostBinding, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { GridsterService } from '../gridster.service';
import { GridListItem } from '../gridList/GridListItem';
import { Draggable } from '../utils/draggable';
import { GridList } from '../gridList/gridList';
import { utils } from '../utils/utils';
import * as i0 from "@angular/core";
import * as i1 from "../gridster-prototype/gridster-prototype.service";
import * as i2 from "../gridster.service";
export class GridsterItemComponent {
    constructor(zone, gridsterPrototypeService, elementRef, gridster) {
        this.zone = zone;
        this.gridsterPrototypeService = gridsterPrototypeService;
        this.xChange = new EventEmitter(true);
        this.yChange = new EventEmitter(true);
        this.xSmChange = new EventEmitter(true);
        this.ySmChange = new EventEmitter(true);
        this.xMdChange = new EventEmitter(true);
        this.yMdChange = new EventEmitter(true);
        this.xLgChange = new EventEmitter(true);
        this.yLgChange = new EventEmitter(true);
        this.xXlChange = new EventEmitter(true);
        this.yXlChange = new EventEmitter(true);
        this.wChange = new EventEmitter(true);
        this.hChange = new EventEmitter(true);
        this.wSmChange = new EventEmitter(true);
        this.hSmChange = new EventEmitter(true);
        this.wMdChange = new EventEmitter(true);
        this.hMdChange = new EventEmitter(true);
        this.wLgChange = new EventEmitter(true);
        this.hLgChange = new EventEmitter(true);
        this.wXlChange = new EventEmitter(true);
        this.hXlChange = new EventEmitter(true);
        this.change = new EventEmitter(true);
        this.start = new EventEmitter(true);
        this.end = new EventEmitter(true);
        this.dragAndDrop = true;
        this.resizable = true;
        this.options = {};
        this.isDragging = false;
        this.isResizing = false;
        this.defaultOptions = {
            minWidth: 1,
            minHeight: 1,
            maxWidth: Infinity,
            maxHeight: Infinity,
            defaultWidth: 1,
            defaultHeight: 1
        };
        this.subscriptions = [];
        this.dragSubscriptions = [];
        this.resizeSubscriptions = [];
        this.gridster = gridster;
        this.elementRef = elementRef;
        this.$element = elementRef.nativeElement;
        this.item = (new GridListItem()).setFromGridsterItem(this);
        // if gridster is initialized do not show animation on new grid-item construct
        if (this.gridster.isInitialized()) {
            this.preventAnimation();
        }
    }
    set positionX(value) {
        this._positionX = value;
    }
    get positionX() {
        return this._positionX;
    }
    set positionY(value) {
        this._positionY = value;
    }
    get positionY() {
        return this._positionY;
    }
    ngOnInit() {
        this.options = Object.assign(this.defaultOptions, this.options);
        this.w = this.w || this.options.defaultWidth;
        this.h = this.h || this.options.defaultHeight;
        this.wSm = this.wSm || this.w;
        this.hSm = this.hSm || this.h;
        this.wMd = this.wMd || this.w;
        this.hMd = this.hMd || this.h;
        this.wLg = this.wLg || this.w;
        this.hLg = this.hLg || this.h;
        this.wXl = this.wXl || this.w;
        this.hXl = this.hXl || this.h;
        if (this.gridster.isInitialized()) {
            this.setPositionsOnItem();
        }
        this.gridster.registerItem(this.item);
        this.gridster.calculateCellSize();
        this.item.applySize();
        this.item.applyPosition();
        if (this.gridster.options.dragAndDrop && this.dragAndDrop) {
            this.enableDragDrop();
        }
        if (this.gridster.isInitialized()) {
            this.gridster.render();
            this.gridster.updateCachedItems();
        }
    }
    ngAfterViewInit() {
        if (this.gridster.options.resizable && this.item.resizable) {
            this.enableResizable();
        }
    }
    ngOnChanges(changes) {
        if (!this.gridster.gridList) {
            return;
        }
        let rerender = false;
        ['w', ...Object.keys(GridListItem.W_PROPERTY_MAP).map(breakpoint => GridListItem.W_PROPERTY_MAP[breakpoint])]
            .filter(propName => changes[propName] && !changes[propName].isFirstChange())
            .forEach((propName) => {
            if (changes[propName].currentValue > this.options.maxWidth) {
                this[propName] = this.options.maxWidth;
                setTimeout(() => this[propName + 'Change'].emit(this[propName]));
            }
            rerender = true;
        });
        ['h', ...Object.keys(GridListItem.H_PROPERTY_MAP).map(breakpoint => GridListItem.H_PROPERTY_MAP[breakpoint])]
            .filter(propName => changes[propName] && !changes[propName].isFirstChange())
            .forEach((propName) => {
            if (changes[propName].currentValue > this.options.maxHeight) {
                this[propName] = this.options.maxHeight;
                setTimeout(() => this[propName + 'Change'].emit(this[propName]));
            }
            rerender = true;
        });
        ['x', 'y',
            ...Object.keys(GridListItem.X_PROPERTY_MAP).map(breakpoint => GridListItem.X_PROPERTY_MAP[breakpoint]),
            ...Object.keys(GridListItem.Y_PROPERTY_MAP).map(breakpoint => GridListItem.Y_PROPERTY_MAP[breakpoint])]
            .filter(propName => changes[propName] && !changes[propName].isFirstChange())
            .forEach((propName) => rerender = true);
        if (changes['dragAndDrop'] && !changes['dragAndDrop'].isFirstChange()) {
            if (changes['dragAndDrop'].currentValue && this.gridster.options.dragAndDrop) {
                this.enableDragDrop();
            }
            else {
                this.disableDraggable();
            }
        }
        if (changes['resizable'] && !changes['resizable'].isFirstChange()) {
            if (changes['resizable'].currentValue && this.gridster.options.resizable) {
                this.enableResizable();
            }
            else {
                this.disableResizable();
            }
        }
        if (rerender && this.gridster.gridsterComponent.isReady) {
            this.gridster.debounceRenderSubject.next();
        }
    }
    ngOnDestroy() {
        this.gridster.removeItem(this.item);
        this.gridster.itemRemoveSubject.next(this.item);
        this.subscriptions.forEach((sub) => {
            sub.unsubscribe();
        });
        this.disableDraggable();
        this.disableResizable();
    }
    updateElemenetPosition() {
        if (this.gridster.options.useCSSTransforms) {
            utils.setTransform(this.$element, { x: this._positionX, y: this._positionY });
        }
        else {
            utils.setCssElementPosition(this.$element, { x: this._positionX, y: this._positionY });
        }
    }
    setPositionsOnItem() {
        if (!this.item.hasPositions(this.gridster.options.breakpoint)) {
            this.setPositionsForGrid(this.gridster.options);
        }
        this.gridster.gridsterOptions.responsiveOptions
            .filter((options) => !this.item.hasPositions(options.breakpoint))
            .forEach((options) => this.setPositionsForGrid(options));
    }
    enableResizable() {
        if (this.resizeSubscriptions.length) {
            return;
        }
        this.zone.runOutsideAngular(() => {
            this.getResizeHandlers().forEach((handler) => {
                const direction = this.getResizeDirection(handler);
                if (this.hasResizableHandle(direction)) {
                    handler.style.display = 'block';
                }
                const draggable = new Draggable(handler, this.getResizableOptions());
                let startEvent;
                let startData;
                let cursorToElementPosition;
                const dragStartSub = draggable.dragStart
                    .subscribe((event) => {
                    this.zone.run(() => {
                        this.isResizing = true;
                        startEvent = event;
                        startData = this.createResizeStartObject(direction);
                        cursorToElementPosition = event.getRelativeCoordinates(this.$element);
                        this.gridster.onResizeStart(this.item);
                        this.onStart('resize');
                    });
                });
                const dragSub = draggable.dragMove
                    .subscribe((event) => {
                    const scrollData = this.gridster.gridsterScrollData;
                    this.resizeElement({
                        direction,
                        startData,
                        position: {
                            x: event.clientX - cursorToElementPosition.x - this.gridster.gridsterRect.left,
                            y: event.clientY - cursorToElementPosition.y - this.gridster.gridsterRect.top
                        },
                        startEvent,
                        moveEvent: event,
                        scrollDiffX: scrollData.scrollLeft - startData.scrollLeft,
                        scrollDiffY: scrollData.scrollTop - startData.scrollTop
                    });
                    this.gridster.onResizeDrag(this.item);
                });
                const dragStopSub = draggable.dragStop
                    .subscribe(() => {
                    this.zone.run(() => {
                        this.isResizing = false;
                        this.gridster.onResizeStop(this.item);
                        this.onEnd('resize');
                    });
                });
                this.resizeSubscriptions = this.resizeSubscriptions.concat([dragStartSub, dragSub, dragStopSub]);
            });
        });
    }
    disableResizable() {
        this.resizeSubscriptions.forEach((sub) => {
            sub.unsubscribe();
        });
        this.resizeSubscriptions = [];
        [].forEach.call(this.$element.querySelectorAll('.gridster-item-resizable-handler'), (handler) => {
            handler.style.display = '';
        });
    }
    enableDragDrop() {
        if (this.dragSubscriptions.length) {
            return;
        }
        this.zone.runOutsideAngular(() => {
            let cursorToElementPosition;
            const draggable = new Draggable(this.$element, this.getDraggableOptions());
            const dragStartSub = draggable.dragStart
                .subscribe((event) => {
                this.zone.run(() => {
                    this.gridster.onStart(this.item);
                    this.isDragging = true;
                    this.onStart('drag');
                    cursorToElementPosition = event.getRelativeCoordinates(this.$element);
                });
            });
            const dragSub = draggable.dragMove
                .subscribe((event) => {
                this.positionY = (event.clientY - cursorToElementPosition.y -
                    this.gridster.gridsterRect.top);
                this.positionX = (event.clientX - cursorToElementPosition.x -
                    this.gridster.gridsterRect.left);
                this.updateElemenetPosition();
                this.gridster.onDrag(this.item);
            });
            const dragStopSub = draggable.dragStop
                .subscribe(() => {
                this.zone.run(() => {
                    this.gridster.onStop(this.item);
                    this.gridster.debounceRenderSubject.next();
                    this.isDragging = false;
                    this.onEnd('drag');
                });
            });
            this.dragSubscriptions = this.dragSubscriptions.concat([dragStartSub, dragSub, dragStopSub]);
        });
    }
    disableDraggable() {
        this.dragSubscriptions.forEach((sub) => {
            sub.unsubscribe();
        });
        this.dragSubscriptions = [];
    }
    getResizeHandlers() {
        return [].filter.call(this.$element.children[0].children, (el) => {
            return el.classList.contains('gridster-item-resizable-handler');
        });
    }
    getDraggableOptions() {
        return { scrollDirection: this.gridster.options.direction, ...this.gridster.draggableOptions };
    }
    getResizableOptions() {
        const resizableOptions = {};
        if (this.gridster.draggableOptions.scroll || this.gridster.draggableOptions.scroll === false) {
            resizableOptions.scroll = this.gridster.draggableOptions.scroll;
        }
        if (this.gridster.draggableOptions.scrollEdge) {
            resizableOptions.scrollEdge = this.gridster.draggableOptions.scrollEdge;
        }
        resizableOptions.scrollDirection = this.gridster.options.direction;
        return resizableOptions;
    }
    hasResizableHandle(direction) {
        const isItemResizable = this.gridster.options.resizable && this.item.resizable;
        const resizeHandles = this.gridster.options.resizeHandles;
        return isItemResizable && (!resizeHandles || (resizeHandles && !!resizeHandles[direction]));
    }
    setPositionsForGrid(options) {
        let x, y;
        const position = this.findPosition(options);
        x = options.direction === 'horizontal' ? position[0] : position[1];
        y = options.direction === 'horizontal' ? position[1] : position[0];
        this.item.setValueX(x, options.breakpoint);
        this.item.setValueY(y, options.breakpoint);
        setTimeout(() => {
            this.item.triggerChangeX(options.breakpoint);
            this.item.triggerChangeY(options.breakpoint);
        });
    }
    findPosition(options) {
        const gridList = new GridList(this.gridster.items.map(item => item.copyForBreakpoint(options.breakpoint)), options);
        return gridList.findPositionForItem(this.item, { x: 0, y: 0 });
    }
    createResizeStartObject(direction) {
        const scrollData = this.gridster.gridsterScrollData;
        return {
            top: this.positionY,
            left: this.positionX,
            height: parseInt(this.$element.style.height, 10),
            width: parseInt(this.$element.style.width, 10),
            minX: Math.max(this.item.x + this.item.w - this.options.maxWidth, 0),
            maxX: this.item.x + this.item.w - this.options.minWidth,
            minY: Math.max(this.item.y + this.item.h - this.options.maxHeight, 0),
            maxY: this.item.y + this.item.h - this.options.minHeight,
            minW: this.options.minWidth,
            maxW: Math.min(this.options.maxWidth, (this.gridster.options.direction === 'vertical' && direction.indexOf('w') < 0) ?
                this.gridster.options.lanes - this.item.x : this.options.maxWidth, direction.indexOf('w') >= 0 ?
                this.item.x + this.item.w : this.options.maxWidth),
            minH: this.options.minHeight,
            maxH: Math.min(this.options.maxHeight, (this.gridster.options.direction === 'horizontal' && direction.indexOf('n') < 0) ?
                this.gridster.options.lanes - this.item.y : this.options.maxHeight, direction.indexOf('n') >= 0 ?
                this.item.y + this.item.h : this.options.maxHeight),
            scrollLeft: scrollData.scrollLeft,
            scrollTop: scrollData.scrollTop
        };
    }
    onEnd(actionType) {
        this.end.emit({ action: actionType, item: this.item });
    }
    onStart(actionType) {
        this.start.emit({ action: actionType, item: this.item });
    }
    /**
     * Assign class for short while to prevent animation of grid item component
     */
    preventAnimation() {
        this.$element.classList.add('no-transition');
        setTimeout(() => {
            this.$element.classList.remove('no-transition');
        }, 500);
        return this;
    }
    getResizeDirection(handler) {
        for (let i = handler.classList.length - 1; i >= 0; i--) {
            if (handler.classList[i].match('handle-')) {
                return handler.classList[i].split('-')[1];
            }
        }
    }
    resizeElement(config) {
        // north
        if (config.direction.indexOf('n') >= 0) {
            this.resizeToNorth(config);
        }
        // west
        if (config.direction.indexOf('w') >= 0) {
            this.resizeToWest(config);
        }
        // east
        if (config.direction.indexOf('e') >= 0) {
            this.resizeToEast(config);
        }
        // south
        if (config.direction.indexOf('s') >= 0) {
            this.resizeToSouth(config);
        }
    }
    resizeToNorth(config) {
        const height = config.startData.height + config.startEvent.clientY -
            config.moveEvent.clientY - config.scrollDiffY;
        if (height < (config.startData.minH * this.gridster.cellHeight)) {
            this.setMinHeight('n', config);
        }
        else if (height > (config.startData.maxH * this.gridster.cellHeight)) {
            this.setMaxHeight('n', config);
        }
        else {
            this.positionY = config.position.y;
            this.$element.style.height = height + 'px';
        }
    }
    resizeToWest(config) {
        const width = config.startData.width + config.startEvent.clientX -
            config.moveEvent.clientX - config.scrollDiffX;
        if (width < (config.startData.minW * this.gridster.cellWidth)) {
            this.setMinWidth('w', config);
        }
        else if (width > (config.startData.maxW * this.gridster.cellWidth)) {
            this.setMaxWidth('w', config);
        }
        else {
            this.positionX = config.position.x;
            this.updateElemenetPosition();
            this.$element.style.width = width + 'px';
        }
    }
    resizeToEast(config) {
        const width = config.startData.width + config.moveEvent.clientX -
            config.startEvent.clientX + config.scrollDiffX;
        if (width > (config.startData.maxW * this.gridster.cellWidth)) {
            this.setMaxWidth('e', config);
        }
        else if (width < (config.startData.minW * this.gridster.cellWidth)) {
            this.setMinWidth('e', config);
        }
        else {
            this.$element.style.width = width + 'px';
        }
    }
    resizeToSouth(config) {
        const height = config.startData.height + config.moveEvent.clientY -
            config.startEvent.clientY + config.scrollDiffY;
        if (height > config.startData.maxH * this.gridster.cellHeight) {
            this.setMaxHeight('s', config);
        }
        else if (height < config.startData.minH * this.gridster.cellHeight) {
            this.setMinHeight('s', config);
        }
        else {
            this.$element.style.height = height + 'px';
        }
    }
    setMinHeight(direction, config) {
        if (direction === 'n') {
            this.$element.style.height = (config.startData.minH * this.gridster.cellHeight) + 'px';
            this.positionY = config.startData.maxY * this.gridster.cellHeight;
        }
        else {
            this.$element.style.height = (config.startData.minH * this.gridster.cellHeight) + 'px';
        }
    }
    setMinWidth(direction, config) {
        if (direction === 'w') {
            this.$element.style.width = (config.startData.minW * this.gridster.cellWidth) + 'px';
            this.positionX = config.startData.maxX * this.gridster.cellWidth;
            this.updateElemenetPosition();
        }
        else {
            this.$element.style.width = (config.startData.minW * this.gridster.cellWidth) + 'px';
        }
    }
    setMaxHeight(direction, config) {
        if (direction === 'n') {
            this.$element.style.height = (config.startData.maxH * this.gridster.cellHeight) + 'px';
            this.positionY = config.startData.minY * this.gridster.cellHeight;
        }
        else {
            this.$element.style.height = (config.startData.maxH * this.gridster.cellHeight) + 'px';
        }
    }
    setMaxWidth(direction, config) {
        if (direction === 'w') {
            this.$element.style.width = (config.startData.maxW * this.gridster.cellWidth) + 'px';
            this.positionX = config.startData.minX * this.gridster.cellWidth;
            this.updateElemenetPosition();
        }
        else {
            this.$element.style.width = (config.startData.maxW * this.gridster.cellWidth) + 'px';
        }
    }
}
GridsterItemComponent.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "13.1.1", ngImport: i0, type: GridsterItemComponent, deps: [{ token: i0.NgZone }, { token: i1.GridsterPrototypeService }, { token: ElementRef }, { token: GridsterService }], target: i0.ɵɵFactoryTarget.Component });
GridsterItemComponent.ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "12.0.0", version: "13.1.1", type: GridsterItemComponent, selector: "ngx-gridster-item", inputs: { x: "x", y: "y", xSm: "xSm", ySm: "ySm", xMd: "xMd", yMd: "yMd", xLg: "xLg", yLg: "yLg", xXl: "xXl", yXl: "yXl", w: "w", h: "h", wSm: "wSm", hSm: "hSm", wMd: "wMd", hMd: "hMd", wLg: "wLg", hLg: "hLg", wXl: "wXl", hXl: "hXl", dragAndDrop: "dragAndDrop", resizable: "resizable", options: "options" }, outputs: { xChange: "xChange", yChange: "yChange", xSmChange: "xSmChange", ySmChange: "ySmChange", xMdChange: "xMdChange", yMdChange: "yMdChange", xLgChange: "xLgChange", yLgChange: "yLgChange", xXlChange: "xXlChange", yXlChange: "yXlChange", wChange: "wChange", hChange: "hChange", wSmChange: "wSmChange", hSmChange: "hSmChange", wMdChange: "wMdChange", hMdChange: "hMdChange", wLgChange: "wLgChange", hLgChange: "hLgChange", wXlChange: "wXlChange", hXlChange: "hXlChange", change: "change", start: "start", end: "end" }, host: { properties: { "class.is-dragging": "this.isDragging", "class.is-resizing": "this.isResizing" } }, usesOnChanges: true, ngImport: i0, template: `<div class="gridster-item-inner">
      <ng-content></ng-content>
      <div class="gridster-item-resizable-handler handle-s"></div>
      <div class="gridster-item-resizable-handler handle-e"></div>
      <div class="gridster-item-resizable-handler handle-n"></div>
      <div class="gridster-item-resizable-handler handle-w"></div>
      <div class="gridster-item-resizable-handler handle-se"></div>
      <div class="gridster-item-resizable-handler handle-ne"></div>
      <div class="gridster-item-resizable-handler handle-sw"></div>
      <div class="gridster-item-resizable-handler handle-nw"></div>
    </div>`, isInline: true, styles: ["ngx-gridster-item{display:block;position:absolute;top:0;left:0;z-index:1;transition:none}.gridster--ready ngx-gridster-item{transition:all .2s ease;transition-property:left,top}.gridster--ready.css-transform ngx-gridster-item{transition-property:transform}.gridster--ready ngx-gridster-item.is-dragging,.gridster--ready ngx-gridster-item.is-resizing{transition:none;z-index:9999}ngx-gridster-item.no-transition{transition:none}ngx-gridster-item .gridster-item-resizable-handler{position:absolute;z-index:2;display:none}ngx-gridster-item .gridster-item-resizable-handler.handle-n{cursor:n-resize;height:10px;right:0;top:0;left:0}ngx-gridster-item .gridster-item-resizable-handler.handle-e{cursor:e-resize;width:10px;bottom:0;right:0;top:0}ngx-gridster-item .gridster-item-resizable-handler.handle-s{cursor:s-resize;height:10px;right:0;bottom:0;left:0}ngx-gridster-item .gridster-item-resizable-handler.handle-w{cursor:w-resize;width:10px;left:0;top:0;bottom:0}ngx-gridster-item .gridster-item-resizable-handler.handle-ne{cursor:ne-resize;width:10px;height:10px;right:0;top:0}ngx-gridster-item .gridster-item-resizable-handler.handle-nw{cursor:nw-resize;width:10px;height:10px;left:0;top:0}ngx-gridster-item .gridster-item-resizable-handler.handle-se{cursor:se-resize;width:0;height:0;right:0;bottom:0;border-style:solid;border-width:0 0 10px 10px;border-color:transparent}ngx-gridster-item .gridster-item-resizable-handler.handle-sw{cursor:sw-resize;width:10px;height:10px;left:0;bottom:0}ngx-gridster-item:hover .gridster-item-resizable-handler.handle-se{border-color:transparent transparent #ccc}\n"], changeDetection: i0.ChangeDetectionStrategy.OnPush, encapsulation: i0.ViewEncapsulation.None });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "13.1.1", ngImport: i0, type: GridsterItemComponent, decorators: [{
            type: Component,
            args: [{
                    selector: 'ngx-gridster-item',
                    template: `<div class="gridster-item-inner">
      <ng-content></ng-content>
      <div class="gridster-item-resizable-handler handle-s"></div>
      <div class="gridster-item-resizable-handler handle-e"></div>
      <div class="gridster-item-resizable-handler handle-n"></div>
      <div class="gridster-item-resizable-handler handle-w"></div>
      <div class="gridster-item-resizable-handler handle-se"></div>
      <div class="gridster-item-resizable-handler handle-ne"></div>
      <div class="gridster-item-resizable-handler handle-sw"></div>
      <div class="gridster-item-resizable-handler handle-nw"></div>
    </div>`,
                    styles: [`
    ngx-gridster-item {
        display: block;
        position: absolute;
        top: 0;
        left: 0;
        z-index: 1;
        -webkit-transition: none;
        transition: none;
    }

    .gridster--ready ngx-gridster-item {
        transition: all 200ms ease;
        transition-property: left, top;
    }

    .gridster--ready.css-transform ngx-gridster-item  {
        transition-property: transform;
    }

    .gridster--ready ngx-gridster-item.is-dragging,
    .gridster--ready ngx-gridster-item.is-resizing {
        -webkit-transition: none;
        transition: none;
        z-index: 9999;
    }

    ngx-gridster-item.no-transition {
        -webkit-transition: none;
        transition: none;
    }
    ngx-gridster-item .gridster-item-resizable-handler {
        position: absolute;
        z-index: 2;
        display: none;
    }

    ngx-gridster-item .gridster-item-resizable-handler.handle-n {
      cursor: n-resize;
      height: 10px;
      right: 0;
      top: 0;
      left: 0;
    }

    ngx-gridster-item .gridster-item-resizable-handler.handle-e {
      cursor: e-resize;
      width: 10px;
      bottom: 0;
      right: 0;
      top: 0;
    }

    ngx-gridster-item .gridster-item-resizable-handler.handle-s {
      cursor: s-resize;
      height: 10px;
      right: 0;
      bottom: 0;
      left: 0;
    }

    ngx-gridster-item .gridster-item-resizable-handler.handle-w {
      cursor: w-resize;
      width: 10px;
      left: 0;
      top: 0;
      bottom: 0;
    }

    ngx-gridster-item .gridster-item-resizable-handler.handle-ne {
      cursor: ne-resize;
      width: 10px;
      height: 10px;
      right: 0;
      top: 0;
    }

    ngx-gridster-item .gridster-item-resizable-handler.handle-nw {
      cursor: nw-resize;
      width: 10px;
      height: 10px;
      left: 0;
      top: 0;
    }

    ngx-gridster-item .gridster-item-resizable-handler.handle-se {
      cursor: se-resize;
      width: 0;
      height: 0;
      right: 0;
      bottom: 0;
      border-style: solid;
      border-width: 0 0 10px 10px;
      border-color: transparent;
    }

    ngx-gridster-item .gridster-item-resizable-handler.handle-sw {
      cursor: sw-resize;
      width: 10px;
      height: 10px;
      left: 0;
      bottom: 0;
    }

    ngx-gridster-item:hover .gridster-item-resizable-handler.handle-se {
      border-color: transparent transparent #ccc
    }
    `],
                    changeDetection: ChangeDetectionStrategy.OnPush,
                    encapsulation: ViewEncapsulation.None
                }]
        }], ctorParameters: function () { return [{ type: i0.NgZone }, { type: i1.GridsterPrototypeService }, { type: i0.ElementRef, decorators: [{
                    type: Inject,
                    args: [ElementRef]
                }] }, { type: i2.GridsterService, decorators: [{
                    type: Inject,
                    args: [GridsterService]
                }] }]; }, propDecorators: { x: [{
                type: Input
            }], xChange: [{
                type: Output
            }], y: [{
                type: Input
            }], yChange: [{
                type: Output
            }], xSm: [{
                type: Input
            }], xSmChange: [{
                type: Output
            }], ySm: [{
                type: Input
            }], ySmChange: [{
                type: Output
            }], xMd: [{
                type: Input
            }], xMdChange: [{
                type: Output
            }], yMd: [{
                type: Input
            }], yMdChange: [{
                type: Output
            }], xLg: [{
                type: Input
            }], xLgChange: [{
                type: Output
            }], yLg: [{
                type: Input
            }], yLgChange: [{
                type: Output
            }], xXl: [{
                type: Input
            }], xXlChange: [{
                type: Output
            }], yXl: [{
                type: Input
            }], yXlChange: [{
                type: Output
            }], w: [{
                type: Input
            }], wChange: [{
                type: Output
            }], h: [{
                type: Input
            }], hChange: [{
                type: Output
            }], wSm: [{
                type: Input
            }], wSmChange: [{
                type: Output
            }], hSm: [{
                type: Input
            }], hSmChange: [{
                type: Output
            }], wMd: [{
                type: Input
            }], wMdChange: [{
                type: Output
            }], hMd: [{
                type: Input
            }], hMdChange: [{
                type: Output
            }], wLg: [{
                type: Input
            }], wLgChange: [{
                type: Output
            }], hLg: [{
                type: Input
            }], hLgChange: [{
                type: Output
            }], wXl: [{
                type: Input
            }], wXlChange: [{
                type: Output
            }], hXl: [{
                type: Input
            }], hXlChange: [{
                type: Output
            }], change: [{
                type: Output
            }], start: [{
                type: Output
            }], end: [{
                type: Output
            }], dragAndDrop: [{
                type: Input
            }], resizable: [{
                type: Input
            }], options: [{
                type: Input
            }], isDragging: [{
                type: HostBinding,
                args: ['class.is-dragging']
            }], isResizing: [{
                type: HostBinding,
                args: ['class.is-resizing']
            }] } });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3JpZHN0ZXItaXRlbS5jb21wb25lbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9wcm9qZWN0cy9hbmd1bGFyMmdyaWRzdGVyL3NyYy9saWIvZ3JpZHN0ZXItaXRlbS9ncmlkc3Rlci1pdGVtLmNvbXBvbmVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsU0FBUyxFQUFVLFVBQVUsRUFBRSxNQUFNLEVBQVEsS0FBSyxFQUFFLE1BQU0sRUFDL0QsWUFBWSxFQUF1QyxXQUFXLEVBQzlELHVCQUF1QixFQUF5QixpQkFBaUIsRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUc3RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFHdEQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBRXhELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUUvQyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFDaEQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGdCQUFnQixDQUFDOzs7O0FBOEh2QyxNQUFNLE9BQU8scUJBQXFCO0lBc0c5QixZQUFvQixJQUFZLEVBQ1osd0JBQWtELEVBQ3RDLFVBQXNCLEVBQ2pCLFFBQXlCO1FBSDFDLFNBQUksR0FBSixJQUFJLENBQVE7UUFDWiw2QkFBd0IsR0FBeEIsd0JBQXdCLENBQTBCO1FBckc1RCxZQUFPLEdBQUcsSUFBSSxZQUFZLENBQVMsSUFBSSxDQUFDLENBQUM7UUFFekMsWUFBTyxHQUFHLElBQUksWUFBWSxDQUFTLElBQUksQ0FBQyxDQUFDO1FBR3pDLGNBQVMsR0FBRyxJQUFJLFlBQVksQ0FBUyxJQUFJLENBQUMsQ0FBQztRQUUzQyxjQUFTLEdBQUcsSUFBSSxZQUFZLENBQVMsSUFBSSxDQUFDLENBQUM7UUFHM0MsY0FBUyxHQUFHLElBQUksWUFBWSxDQUFTLElBQUksQ0FBQyxD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LE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFFaEUsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDO1FBQzdDLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQztRQUM5QyxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQztRQUM5QixJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQztRQUM5QixJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQztRQUM5QixJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQztRQUM5QixJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQztRQUM5QixJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQztRQUM5QixJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQztRQUM5QixJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQztRQUU5QixJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsYUFBYSxFQUFFLEVBQUU7WUFDL0IsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7U0FDN0I7UUFFRCxJQUFJLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFdEMsSUFB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LE1BQU07Z0JBRUUsR0FBRztzQkFBWCxLQUFLO2dCQUNJLFNBQVM7c0JBQWxCLE1BQU07Z0JBQ0UsR0FBRztzQkFBWCxLQUFLO2dCQUNJLFNBQVM7c0JBQWxCLE1BQU07Z0JBR0UsQ0FBQztzQkFBVCxLQUFLO2dCQUNJLE9BQU87c0JBQWhCLE1BQU07Z0JBQ0UsQ0FBQztzQkFBVCxLQUFLO2dCQUNJLE9BQU87c0JBQWhCLE1BQU07Z0JBRUUsR0FBRztzQkFBWCxLQUFLO2dCQUNJLFNBQVM7c0JBQWxCLE1BQU07Z0JBQ0UsR0FBRztzQkFBWCxLQUFLO2dCQUNJLFNBQVM7c0JBQWxCLE1BQU07Z0JBRUUsR0FBRztzQkFBWCxLQUFLO2dCQUNJLFNBQVM7c0JBQWxCLE1BQU07Z0JBQ0UsR0FBRztzQkFBWCxLQUFLO2dCQUNJLFNBQVM7c0JBQWxCLE1BQU07Z0JBRUUsR0FBRztzQkFBWCxLQUFLO2dCQUNJLFNBQVM7c0JBQWxCLE1BQU07Z0JBQ0UsR0FBRztzQkFBWCxLQUFLO2dCQUNJLFNBQVM7c0JBQWxCLE1BQU07Z0JBRUUsR0FBRztzQkFBWCxLQUFLO2dCQUNJLFNBQVM7c0JBQWxCLE1BQU07Z0JBQ0UsR0FBRztzQkFBWCxLQUFLO2dCQUNJLFNBQVM7c0JBQWxCLE1BQU07Z0JBRUcsTUFBTTtzQkFBZixNQUFNO2dCQUNHLEtBQUs7c0JBQWQsTUFBTTtnQkFDRyxHQUFHO3NCQUFaLE1BQU07Z0JBRUUsV0FBVztzQkFBbkIsS0FBSztnQkFDRyxTQUFTO3NCQUFqQixLQUFLO2dCQUVHLE9BQU87c0JBQWYsS0FBSztnQkFJNEIsVUFBVTtzQkFBM0MsV0FBVzt1QkFBQyxtQkFBbUI7Z0JBQ0UsVUFBVTtzQkFBM0MsV0FBVzt1QkFBQyxtQkFBbUIiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBDb21wb25lbnQsIE9uSW5pdCwgRWxlbWVudFJlZiwgSW5qZWN0LCBIb3N0LCBJbnB1dCwgT3V0cHV0LFxyXG4gICAgRXZlbnRFbWl0dGVyLCBTaW1wbGVDaGFuZ2VzLCBPbkNoYW5nZXMsIE9uRGVzdHJveSwgSG9zdEJpbmRpbmcsXHJcbiAgICBDaGFuZ2VEZXRlY3Rpb25TdHJhdGVneSwgQWZ0ZXJWaWV3SW5pdCwgTmdab25lLCBWaWV3RW5jYXBzdWxhdGlvbiB9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xyXG5pbXBvcnQgeyBTdWJzY3JpcHRpb24gfSBmcm9tICdyeGpzJztcclxuXHJcbmltcG9ydCB7IEdyaWRzdGVyU2VydmljZSB9IGZyb20gJy4uL2dyaWRzdGVyLnNlcnZpY2UnO1xyXG5pbXBvcnQgeyBHcmlkc3RlclByb3RvdHlwZVNlcnZpY2UgfSBmcm9tICcuLi9ncmlkc3Rlci1wcm90b3R5cGUvZ3JpZHN0ZXItcHJvdG90eXBlLnNlcnZpY2UnO1xyXG5cclxuaW1wb3J0IHsgR3JpZExpc3RJdGVtIH0gZnJvbSAnLi4vZ3JpZExpc3QvR3JpZExpc3RJdGVtJztcclxuaW1wb3J0IHsgRHJhZ2dhYmxlRXZlbnQgfSBmcm9tICcuLi91dGlscy9EcmFnZ2FibGVFdmVudCc7XHJcbmltcG9ydCB7IERyYWdnYWJsZSB9IGZyb20gJy4uL3V0aWxzL2RyYWdnYWJsZSc7XHJcbmltcG9ydCB7IElHcmlkc3Rlck9wdGlvbnMgfSBmcm9tICcuLi9JR3JpZHN0ZXJPcHRpb25zJztcclxuaW1wb3J0IHsgR3JpZExpc3QgfSBmcm9tICcuLi9ncmlkTGlzdC9ncmlkTGlzdCc7XHJcbmltcG9ydCB7IHV0aWxzIH0gZnJvbSAnLi4vdXRpbHMvdXRpbHMnO1xyXG5cclxuQENvbXBvbmVudCh7XHJcbiAgICBzZWxlY3RvcjogJ25neC1ncmlkc3Rlci1pdGVtJyxcclxuICAgIHRlbXBsYXRlOiBgPGRpdiBjbGFzcz1cImdyaWRzdGVyLWl0ZW0taW5uZXJcIj5cclxuICAgICAgPG5nLWNvbnRlbnQ+PC9uZy1jb250ZW50PlxyXG4gICAgICA8ZGl2IGNsYXNzPVwiZ3JpZHN0ZXItaXRlbS1yZXNpemFibGUtaGFuZGxlciBoYW5kbGUtc1wiPjwvZGl2PlxyXG4gICAgICA8ZGl2IGNsYXNzPVwiZ3JpZHN0ZXItaXRlbS1yZXNpemFibGUtaGFuZGxlciBoYW5kbGUtZVwiPjwvZGl2PlxyXG4gICAgICA8ZGl2IGNsYXNzPVwiZ3JpZHN0ZXItaXRlbS1yZXNpemFibGUtaGFuZGxlciBoYW5kbGUtblwiPjwvZGl2PlxyXG4gICAgICA8ZGl2IGNsYXNzPVwiZ3JpZHN0ZXItaXRlbS1yZXNpemFibGUtaGFuZGxlciBoYW5kbGUtd1wiPjwvZGl2PlxyXG4gICAgICA8ZGl2IGNsYXNzPVwiZ3JpZHN0ZXItaXRlbS1yZXNpemFibGUtaGFuZGxlciBoYW5kbGUtc2VcIj48L2Rpdj5cclxuICAgICAgPGRpdiBjbGFzcz1cImdyaWRzdGVyLWl0ZW0tcmVzaXphYmxlLWhhbmRsZXIgaGFuZGxlLW5lXCI+PC9kaXY+XHJcbiAgICAgIDxkaXYgY2xhc3M9XCJncmlkc3Rlci1pdGVtLXJlc2l6YWJsZS1oYW5kbGVyIGhhbmRsZS1zd1wiPjwvZGl2PlxyXG4gICAgICA8ZGl2IGNsYXNzPVwiZ3JpZHN0ZXItaXRlbS1yZXNpemFibGUtaGFuZGxlciBoYW5kbGUtbndcIj48L2Rpdj5cclxuICAgIDwvZGl2PmAsXHJcbiAgICBzdHlsZXM6IFtgXHJcbiAgICBuZ3gtZ3JpZHN0ZXItaXRlbSB7XHJcbiAgICAgICAgZGlzcGxheTogYmxvY2s7XHJcbiAgICAgICAgcG9zaXRpb246IGFic29sdXRlO1xyXG4gICAgICAgIHRvcDogMDtcclxuICAgICAgICBsZWZ0OiAwO1xyXG4gICAgICAgIHotaW5kZXg6IDE7XHJcbiAgICAgICAgLXdlYmtpdC10cmFuc2l0aW9uOiBub25lO1xyXG4gICAgICAgIHRyYW5zaXRpb246IG5vbmU7XHJcbiAgICB9XHJcblxyXG4gICAgLmdyaWRzdGVyLS1yZWFkeSBuZ3gtZ3JpZHN0ZXItaXRlbSB7XHJcbiAgICAgICAgdHJhbnNpdGlvbjogYWxsIDIwMG1zIGVhc2U7XHJcbiAgICAgICAgdHJhbnNpdGlvbi1wcm9wZXJ0eTogbGVmdCwgdG9wO1xyXG4gICAgfVxyXG5cclxuICAgIC5ncmlkc3Rlci0tcmVhZHkuY3NzLXRyYW5zZm9ybSBuZ3gtZ3JpZHN0ZXItaXRlbSAge1xyXG4gICAgICAgIHRyYW5zaXRpb24tcHJvcGVydHk6IHRyYW5zZm9ybTtcclxuICAgIH1cclxuXHJcbiAgICAuZ3JpZHN0ZXItLXJlYWR5IG5neC1ncmlkc3Rlci1pdGVtLmlzLWRyYWdnaW5nLFxyXG4gICAgLmdyaWRzdGVyLS1yZWFkeSBuZ3gtZ3JpZHN0ZXItaXRlbS5pcy1yZXNpemluZyB7XHJcbiAgICAgICAgLXdlYmtpdC10cmFuc2l0aW9uOiBub25lO1xyXG4gICAgICAgIHRyYW5zaXRpb246IG5vbmU7XHJcbiAgICAgICAgei1pbmRleDogOTk5OTtcclxuICAgIH1cclxuXHJcbiAgICBuZ3gtZ3JpZHN0ZXItaXRlbS5uby10cmFuc2l0aW9uIHtcclxuICAgICAgICAtd2Via2l0LXRyYW5zaXRpb246IG5vbmU7XHJcbiAgICAgICAgdHJhbnNpdGlvbjogbm9uZTtcclxuICAgIH1cclxuICAgIG5neC1ncmlkc3Rlci1pdGVtIC5ncmlkc3Rlci1pdGVtLXJlc2l6YWJsZS1oYW5kbGVyIHtcclxuICAgICAgICBwb3NpdGlvbjogYWJzb2x1dGU7XHJcbiAgICAgICAgei1pbmRleDogMjtcclxuICAgICAgICBkaXNwbGF5OiBub25lO1xyXG4gICAgfVxyXG5cclxuICAgIG5neC1ncmlkc3Rlci1pdGVtIC5ncmlkc3Rlci1pdGVtLXJlc2l6YWJsZS1oYW5kbGVyLmhhbmRsZS1uIHtcclxuICAgICAgY3Vyc29yOiBuLXJlc2l6ZTtcclxuICAgICAgaGVpZ2h0OiAxMHB4O1xyXG4gICAgICByaWdodDogMDtcclxuICAgICAgdG9wOiAwO1xyXG4gICAgICBsZWZ0OiAwO1xyXG4gICAgfVxyXG5cclxuICAgIG5neC1ncmlkc3Rlci1pdGVtIC5ncmlkc3Rlci1pdGVtLXJlc2l6YWJsZS1oYW5kbGVyLmhhbmRsZS1lIHtcclxuICAgICAgY3Vyc29yOiBlLXJlc2l6ZTtcclxuICAgICAgd2lkdGg6IDEwcHg7XHJcbiAgICAgIGJvdHRvbTogMDtcclxuICAgICAgcmlnaHQ6IDA7XHJcbiAgICAgIHRvcDogMDtcclxuICAgIH1cclxuXHJcbiAgICBuZ3gtZ3JpZHN0ZXItaXRlbSAuZ3JpZHN0ZXItaXRlbS1yZXNpemFibGUtaGFuZGxlci5oYW5kbGUtcyB7XHJcbiAgICAgIGN1cnNvcjogcy1yZXNpemU7XHJcbiAgICAgIGhlaWdodDogMTBweDtcclxuICAgICAgcmlnaHQ6IDA7XHJcbiAgICAgIGJvdHRvbTogMDtcclxuICAgICAgbGVmdDogMDtcclxuICAgIH1cclxuXHJcbiAgICBuZ3gtZ3JpZHN0ZXItaXRlbSAuZ3JpZHN0ZXItaXRlbS1yZXNpemFibGUtaGFuZGxlci5oYW5kbGUtdyB7XHJcbiAgICAgIGN1cnNvcjogdy1yZXNpemU7XHJcbiAgICAgIHdpZHRoOiAxMHB4O1xyXG4gICAgICBsZWZ0OiAwO1xyXG4gICAgICB0b3A6IDA7XHJcbiAgICAgIGJvdHRvbTogMDtcclxuICAgIH1cclxuXHJcbiAgICBuZ3gtZ3JpZHN0ZXItaXRlbSAuZ3JpZHN0ZXItaXRlbS1yZXNpemFibGUtaGFuZGxlci5oYW5kbGUtbmUge1xyXG4gICAgICBjdXJzb3I6IG5lLXJlc2l6ZTtcclxuICAgICAgd2lkdGg6IDEwcHg7XHJcbiAgICAgIGhlaWdodDogMTBweDtcclxuICAgICAgcmlnaHQ6IDA7XHJcbiAgICAgIHRvcDogMDtcclxuICAgIH1cclxuXHJcbiAgICBuZ3gtZ3JpZHN0ZXItaXRlbSAuZ3JpZHN0ZXItaXRlbS1yZXNpemFibGUtaGFuZGxlci5oYW5kbGUtbncge1xyXG4gICAgICBjdXJzb3I6IG53LXJlc2l6ZTtcclxuICAgICAgd2lkdGg6IDEwcHg7XHJcbiAgICAgIGhlaWdodDogMTBweDtcclxuICAgICAgbGVmdDogMDtcclxuICAgICAgdG9wOiAwO1xyXG4gICAgfVxyXG5cclxuICAgIG5neC1ncmlkc3Rlci1pdGVtIC5ncmlkc3Rlci1pdGVtLXJlc2l6YWJsZS1oYW5kbGVyLmhhbmRsZS1zZSB7XHJcbiAgICAgIGN1cnNvcjogc2UtcmVzaXplO1xyXG4gICAgICB3aWR0aDogMDtcclxuICAgICAgaGVpZ2h0OiAwO1xyXG4gICAgICByaWdodDogMDtcclxuICAgICAgYm90dG9tOiAwO1xyXG4gICAgICBib3JkZXItc3R5bGU6IHNvbGlkO1xyXG4gICAgICBib3JkZXItd2lkdGg6IDAgMCAxMHB4IDEwcHg7XHJcbiAgICAgIGJvcmRlci1jb2xvcjogdHJhbnNwYXJlbnQ7XHJcbiAgICB9XHJcblxyXG4gICAgbmd4LWdyaWRzdGVyLWl0ZW0gLmdyaWRzdGVyLWl0ZW0tcmVzaXphYmxlLWhhbmRsZXIuaGFuZGxlLXN3IHtcclxuICAgICAgY3Vyc29yOiBzdy1yZXNpemU7XHJcbiAgICAgIHdpZHRoOiAxMHB4O1xyXG4gICAgICBoZWlnaHQ6IDEwcHg7XHJcbiAgICAgIGxlZnQ6IDA7XHJcbiAgICAgIGJvdHRvbTogMDtcclxuICAgIH1cclxuXHJcbiAgICBuZ3gtZ3JpZHN0ZXItaXRlbTpob3ZlciAuZ3JpZHN0ZXItaXRlbS1yZXNpemFibGUtaGFuZGxlci5oYW5kbGUtc2Uge1xyXG4gICAgICBib3JkZXItY29sb3I6IHRyYW5zcGFyZW50IHRyYW5zcGFyZW50ICNjY2NcclxuICAgIH1cclxuICAgIGBdLFxyXG4gICAgY2hhbmdlRGV0ZWN0aW9uOiBDaGFuZ2VEZXRlY3Rpb25TdHJhdGVneS5PblB1c2gsXHJcbiAgICBlbmNhcHN1bGF0aW9uOiBWaWV3RW5jYXBzdWxhdGlvbi5Ob25lXHJcbn0pXHJcbmV4cG9ydCBjbGFzcyBHcmlkc3Rlckl0ZW1Db21wb25lbnQgaW1wbGVtZW50cyBPbkluaXQsIE9uQ2hhbmdlcywgQWZ0ZXJWaWV3SW5pdCwgT25EZXN0cm95IHtcclxuICAgIEBJbnB1dCgpIHg6IG51bWJlcjtcclxuICAgIEBPdXRwdXQoKSB4Q2hhbmdlID0gbmV3IEV2ZW50RW1pdHRlcjxudW1iZXI+KHRydWUpO1xyXG4gICAgQElucHV0KCkgeTogbnVtYmVyO1xyXG4gICAgQE91dHB1dCgpIHlDaGFuZ2UgPSBuZXcgRXZlbnRFbWl0dGVyPG51bWJlcj4odHJ1ZSk7XHJcblxyXG4gICAgQElucHV0KCkgeFNtOiBudW1iZXI7XHJcbiAgICBAT3V0cHV0KCkgeFNtQ2hhbmdlID0gbmV3IEV2ZW50RW1pdHRlcjxudW1iZXI+KHRydWUpO1xyXG4gICAgQElucHV0KCkgeVNtOiBudW1iZXI7XHJcbiAgICBAT3V0cHV0KCkgeVNtQ2hhbmdlID0gbmV3IEV2ZW50RW1pdHRlcjxudW1iZXI+KHRydWUpO1xyXG5cclxuICAgIEBJbnB1dCgpIHhNZDogbnVtYmVyO1xyXG4gICAgQE91dHB1dCgpIHhNZENoYW5nZSA9IG5ldyBFdmVudEVtaXR0ZXI8bnVtYmVyPih0cnVlKTtcclxuICAgIEBJbnB1dCgpIHlNZDogbnVtYmVyO1xyXG4gICAgQE91dHB1dCgpIHlNZENoYW5nZSA9IG5ldyBFdmVudEVtaXR0ZXI8bnVtYmVyPih0cnVlKTtcclxuXHJcbiAgICBASW5wdXQoKSB4TGc6IG51bWJlcjtcclxuICAgIEBPdXRwdXQoKSB4TGdDaGFuZ2UgPSBuZXcgRXZlbnRFbWl0dGVyPG51bWJlcj4odHJ1ZSk7XHJcbiAgICBASW5wdXQoKSB5TGc6IG51bWJlcjtcclxuICAgIEBPdXRwdXQoKSB5TGdDaGFuZ2UgPSBuZXcgRXZlbnRFbWl0dGVyPG51bWJlcj4odHJ1ZSk7XHJcblxyXG4gICAgQElucHV0KCkgeFhsOiBudW1iZXI7XHJcbiAgICBAT3V0cHV0KCkgeFhsQ2hhbmdlID0gbmV3IEV2ZW50RW1pdHRlcjxudW1iZXI+KHRydWUpO1xyXG4gICAgQElucHV0KCkgeVhsOiBudW1iZXI7XHJcbiAgICBAT3V0cHV0KCkgeVhsQ2hhbmdlID0gbmV3IEV2ZW50RW1pdHRlcjxudW1iZXI+KHRydWUpO1xyXG5cclxuXHJcbiAgICBASW5wdXQoKSB3OiBudW1iZXI7XHJcbiAgICBAT3V0cHV0KCkgd0NoYW5nZSA9IG5ldyBFdmVudEVtaXR0ZXI8bnVtYmVyPih0cnVlKTtcclxuICAgIEBJbnB1dCgpIGg6IG51bWJlcjtcclxuICAgIEBPdXRwdXQoKSBoQ2hhbmdlID0gbmV3IEV2ZW50RW1pdHRlcjxudW1iZXI+KHRydWUpO1xyXG5cclxuICAgIEBJbnB1dCgpIHdTbTogbnVtYmVyO1xyXG4gICAgQE91dHB1dCgpIHdTbUNoYW5nZSA9IG5ldyBFdmVudEVtaXR0ZXI8bnVtYmVyPih0cnVlKTtcclxuICAgIEBJbnB1dCgpIGhTbTogbnVtYmVyO1xyXG4gICAgQE91dHB1dCgpIGhTbUNoYW5nZSA9IG5ldyBFdmVudEVtaXR0ZXI8bnVtYmVyPih0cnVlKTtcclxuXHJcbiAgICBASW5wdXQoKSB3TWQ6IG51bWJlcjtcclxuICAgIEBPdXRwdXQoKSB3TWRDaGFuZ2UgPSBuZXcgRXZlbnRFbWl0dGVyPG51bWJlcj4odHJ1ZSk7XHJcbiAgICBASW5wdXQoKSBoTWQ6IG51bWJlcjtcclxuICAgIEBPdXRwdXQoKSBoTWRDaGFuZ2UgPSBuZXcgRXZlbnRFbWl0dGVyPG51bWJlcj4odHJ1ZSk7XHJcblxyXG4gICAgQElucHV0KCkgd0xnOiBudW1iZXI7XHJcbiAgICBAT3V0cHV0KCkgd0xnQ2hhbmdlID0gbmV3IEV2ZW50RW1pdHRlcjxudW1iZXI+KHRydWUpO1xyXG4gICAgQElucHV0KCkgaExnOiBudW1iZXI7XHJcbiAgICBAT3V0cHV0KCkgaExnQ2hhbmdlID0gbmV3IEV2ZW50RW1pdHRlcjxudW1iZXI+KHRydWUpO1xyXG5cclxuICAgIEBJbnB1dCgpIHdYbDogbnVtYmVyO1xyXG4gICAgQE91dHB1dCgpIHdYbENoYW5nZSA9IG5ldyBFdmVudEVtaXR0ZXI8bnVtYmVyPih0cnVlKTtcclxuICAgIEBJbnB1dCgpIGhYbDogbnVtYmVyO1xyXG4gICAgQE91dHB1dCgpIGhYbENoYW5nZSA9IG5ldyBFdmVudEVtaXR0ZXI8bnVtYmVyPih0cnVlKTtcclxuXHJcbiAgICBAT3V0cHV0KCkgY2hhbmdlID0gbmV3IEV2ZW50RW1pdHRlcjxhbnk+KHRydWUpO1xyXG4gICAgQE91dHB1dCgpIHN0YXJ0ID0gbmV3IEV2ZW50RW1pdHRlcjxhbnk+KHRydWUpO1xyXG4gICAgQE91dHB1dCgpIGVuZCA9IG5ldyBFdmVudEVtaXR0ZXI8YW55Pih0cnVlKTtcclxuXHJcbiAgICBASW5wdXQoKSBkcmFnQW5kRHJvcCA9IHRydWU7XHJcbiAgICBASW5wdXQoKSByZXNpemFibGUgPSB0cnVlO1xyXG5cclxuICAgIEBJbnB1dCgpIG9wdGlvbnM6IGFueSA9IHt9O1xyXG5cclxuICAgIGF1dG9TaXplOiBib29sZWFuO1xyXG5cclxuICAgIEBIb3N0QmluZGluZygnY2xhc3MuaXMtZHJhZ2dpbmcnKSBpc0RyYWdnaW5nID0gZmFsc2U7XHJcbiAgICBASG9zdEJpbmRpbmcoJ2NsYXNzLmlzLXJlc2l6aW5nJykgaXNSZXNpemluZyA9IGZhbHNlO1xyXG5cclxuICAgICRlbGVtZW50OiBIVE1MRWxlbWVudDtcclxuICAgIGVsZW1lbnRSZWY6IEVsZW1lbnRSZWY7XHJcbiAgICAvKipcclxuICAgICAqIEdyaWRzdGVyIHByb3ZpZGVyIHNlcnZpY2VcclxuICAgICAqL1xyXG4gICAgZ3JpZHN0ZXI6IEdyaWRzdGVyU2VydmljZTtcclxuXHJcbiAgICBpdGVtOiBHcmlkTGlzdEl0ZW07XHJcblxyXG4gICAgc2V0IHBvc2l0aW9uWCh2YWx1ZTogbnVtYmVyKSB7XHJcbiAgICAgICAgdGhpcy5fcG9zaXRpb25YID0gdmFsdWU7XHJcbiAgICB9XHJcbiAgICBnZXQgcG9zaXRpb25YKCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLl9wb3NpdGlvblg7XHJcbiAgICB9XHJcbiAgICBzZXQgcG9zaXRpb25ZKHZhbHVlOiBudW1iZXIpIHtcclxuICAgICAgICB0aGlzLl9wb3NpdGlvblkgPSB2YWx1ZTtcclxuICAgIH1cclxuICAgIGdldCBwb3NpdGlvblkoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX3Bvc2l0aW9uWTtcclxuICAgIH1cclxuICAgIHByaXZhdGUgX3Bvc2l0aW9uWDogbnVtYmVyO1xyXG4gICAgcHJpdmF0ZSBfcG9zaXRpb25ZOiBudW1iZXI7XHJcblxyXG4gICAgcHJpdmF0ZSBkZWZhdWx0T3B0aW9uczogYW55ID0ge1xyXG4gICAgICAgIG1pbldpZHRoOiAxLFxyXG4gICAgICAgIG1pbkhlaWdodDogMSxcclxuICAgICAgICBtYXhXaWR0aDogSW5maW5pdHksXHJcbiAgICAgICAgbWF4SGVpZ2h0OiBJbmZpbml0eSxcclxuICAgICAgICBkZWZhdWx0V2lkdGg6IDEsXHJcbiAgICAgICAgZGVmYXVsdEhlaWdodDogMVxyXG4gICAgfTtcclxuICAgIHByaXZhdGUgc3Vic2NyaXB0aW9uczogQXJyYXk8U3Vic2NyaXB0aW9uPiA9IFtdO1xyXG4gICAgcHJpdmF0ZSBkcmFnU3Vic2NyaXB0aW9uczogQXJyYXk8U3Vic2NyaXB0aW9uPiA9IFtdO1xyXG4gICAgcHJpdmF0ZSByZXNpemVTdWJzY3JpcHRpb25zOiBBcnJheTxTdWJzY3JpcHRpb24+ID0gW107XHJcblxyXG4gICAgY29uc3RydWN0b3IocHJpdmF0ZSB6b25lOiBOZ1pvbmUsXHJcbiAgICAgICAgICAgICAgICBwcml2YXRlIGdyaWRzdGVyUHJvdG90eXBlU2VydmljZTogR3JpZHN0ZXJQcm90b3R5cGVTZXJ2aWNlLFxyXG4gICAgICAgICAgICAgICAgQEluamVjdChFbGVtZW50UmVmKSBlbGVtZW50UmVmOiBFbGVtZW50UmVmLFxyXG4gICAgICAgICAgICAgICAgQEluamVjdChHcmlkc3RlclNlcnZpY2UpIGdyaWRzdGVyOiBHcmlkc3RlclNlcnZpY2UpIHtcclxuXHJcbiAgICAgICAgdGhpcy5ncmlkc3RlciA9IGdyaWRzdGVyO1xyXG4gICAgICAgIHRoaXMuZWxlbWVudFJlZiA9IGVsZW1lbnRSZWY7XHJcbiAgICAgICAgdGhpcy4kZWxlbWVudCA9IGVsZW1lbnRSZWYubmF0aXZlRWxlbWVudDtcclxuXHJcbiAgICAgICAgdGhpcy5pdGVtID0gKG5ldyBHcmlkTGlzdEl0ZW0oKSkuc2V0RnJvbUdyaWRzdGVySXRlbSh0aGlzKTtcclxuXHJcbiAgICAgICAgLy8gaWYgZ3JpZHN0ZXIgaXMgaW5pdGlhbGl6ZWQgZG8gbm90IHNob3cgYW5pbWF0aW9uIG9uIG5ldyBncmlkLWl0ZW0gY29uc3RydWN0XHJcbiAgICAgICAgaWYgKHRoaXMuZ3JpZHN0ZXIuaXNJbml0aWFsaXplZCgpKSB7XHJcbiAgICAgICAgICAgIHRoaXMucHJldmVudEFuaW1hdGlvbigpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBuZ09uSW5pdCgpIHtcclxuICAgICAgICB0aGlzLm9wdGlvbnMgPSBPYmplY3QuYXNzaWduKHRoaXMuZGVmYXVsdE9wdGlvbnMsIHRoaXMub3B0aW9ucyk7XHJcblxyXG4gICAgICAgIHRoaXMudyA9IHRoaXMudyB8fCB0aGlzLm9wdGlvbnMuZGVmYXVsdFdpZHRoO1xyXG4gICAgICAgIHRoaXMuaCA9IHRoaXMuaCB8fCB0aGlzLm9wdGlvbnMuZGVmYXVsdEhlaWdodDtcclxuICAgICAgICB0aGlzLndTbSA9IHRoaXMud1NtIHx8IHRoaXMudztcclxuICAgICAgICB0aGlzLmhTbSA9IHRoaXMuaFNtIHx8IHRoaXMuaDtcclxuICAgICAgICB0aGlzLndNZCA9IHRoaXMud01kIHx8IHRoaXMudztcclxuICAgICAgICB0aGlzLmhNZCA9IHRoaXMuaE1kIHx8IHRoaXMuaDtcclxuICAgICAgICB0aGlzLndMZyA9IHRoaXMud0xnIHx8IHRoaXMudztcclxuICAgICAgICB0aGlzLmhMZyA9IHRoaXMuaExnIHx8IHRoaXMuaDtcclxuICAgICAgICB0aGlzLndYbCA9IHRoaXMud1hsIHx8IHRoaXMudztcclxuICAgICAgICB0aGlzLmhYbCA9IHRoaXMuaFhsIHx8IHRoaXMuaDtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMuZ3JpZHN0ZXIuaXNJbml0aWFsaXplZCgpKSB7XHJcbiAgICAgICAgICAgIHRoaXMuc2V0UG9zaXRpb25zT25JdGVtKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmdyaWRzdGVyLnJlZ2lzdGVySXRlbSh0aGlzLml0ZW0pO1xyXG5cclxuICAgICAgICB0aGlzLmdyaWRzdGVyLmNhbGN1bGF0ZUNlbGxTaXplKCk7XHJcbiAgICAgICAgdGhpcy5pdGVtLmFwcGx5U2l6ZSgpO1xyXG4gICAgICAgIHRoaXMuaXRlbS5hcHBseVBvc2l0aW9uKCk7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmdyaWRzdGVyLm9wdGlvbnMuZHJhZ0FuZERyb3AgJiYgdGhpcy5kcmFnQW5kRHJvcCkge1xyXG4gICAgICAgICAgICB0aGlzLmVuYWJsZURyYWdEcm9wKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5ncmlkc3Rlci5pc0luaXRpYWxpemVkKCkpIHtcclxuICAgICAgICAgICAgdGhpcy5ncmlkc3Rlci5yZW5kZXIoKTtcclxuICAgICAgICAgICAgdGhpcy5ncmlkc3Rlci51cGRhdGVDYWNoZWRJdGVtcygpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBuZ0FmdGVyVmlld0luaXQoKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuZ3JpZHN0ZXIub3B0aW9ucy5yZXNpemFibGUgJiYgdGhpcy5pdGVtLnJlc2l6YWJsZSkge1xyXG4gICAgICAgICAgICB0aGlzLmVuYWJsZVJlc2l6YWJsZSgpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBuZ09uQ2hhbmdlcyhjaGFuZ2VzOiBTaW1wbGVDaGFuZ2VzKSB7XHJcbiAgICAgICAgaWYgKCF0aGlzLmdyaWRzdGVyLmdyaWRMaXN0KSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgbGV0IHJlcmVuZGVyID0gZmFsc2U7XHJcblxyXG4gICAgICAgIFsndycsIC4uLk9iamVjdC5rZXlzKEdyaWRMaXN0SXRlbS5XX1BST1BFUlRZX01BUCkubWFwKGJyZWFrcG9pbnQgPT4gR3JpZExpc3RJdGVtLldfUFJPUEVSVFlfTUFQW2JyZWFrcG9pbnRdKV1cclxuICAgICAgICAuZmlsdGVyKHByb3BOYW1lID0+IGNoYW5nZXNbcHJvcE5hbWVdICYmICFjaGFuZ2VzW3Byb3BOYW1lXS5pc0ZpcnN0Q2hhbmdlKCkpXHJcbiAgICAgICAgLmZvckVhY2goKHByb3BOYW1lOiBzdHJpbmcpID0+IHtcclxuICAgICAgICAgICAgaWYgKGNoYW5nZXNbcHJvcE5hbWVdLmN1cnJlbnRWYWx1ZSA+IHRoaXMub3B0aW9ucy5tYXhXaWR0aCkge1xyXG4gICAgICAgICAgICAgICAgdGhpc1twcm9wTmFtZV0gPSB0aGlzLm9wdGlvbnMubWF4V2lkdGg7XHJcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHRoaXNbcHJvcE5hbWUgKyAnQ2hhbmdlJ10uZW1pdCh0aGlzW3Byb3BOYW1lXSkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJlcmVuZGVyID0gdHJ1ZTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgWydoJywgLi4uT2JqZWN0LmtleXMoR3JpZExpc3RJdGVtLkhfUFJPUEVSVFlfTUFQKS5tYXAoYnJlYWtwb2ludCA9PiBHcmlkTGlzdEl0ZW0uSF9QUk9QRVJUWV9NQVBbYnJlYWtwb2ludF0pXVxyXG4gICAgICAgICAgICAuZmlsdGVyKHByb3BOYW1lID0+IGNoYW5nZXNbcHJvcE5hbWVdICYmICFjaGFuZ2VzW3Byb3BOYW1lXS5pc0ZpcnN0Q2hhbmdlKCkpXHJcbiAgICAgICAgICAgIC5mb3JFYWNoKChwcm9wTmFtZTogc3RyaW5nKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAoY2hhbmdlc1twcm9wTmFtZV0uY3VycmVudFZhbHVlID4gdGhpcy5vcHRpb25zLm1heEhlaWdodCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXNbcHJvcE5hbWVdID0gdGhpcy5vcHRpb25zLm1heEhlaWdodDtcclxuICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHRoaXNbcHJvcE5hbWUgKyAnQ2hhbmdlJ10uZW1pdCh0aGlzW3Byb3BOYW1lXSkpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmVyZW5kZXIgPSB0cnVlO1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgWyd4JywgJ3knLFxyXG4gICAgICAgIC4uLk9iamVjdC5rZXlzKEdyaWRMaXN0SXRlbS5YX1BST1BFUlRZX01BUCkubWFwKGJyZWFrcG9pbnQgPT4gR3JpZExpc3RJdGVtLlhfUFJPUEVSVFlfTUFQW2JyZWFrcG9pbnRdKSxcclxuICAgICAgICAuLi5PYmplY3Qua2V5cyhHcmlkTGlzdEl0ZW0uWV9QUk9QRVJUWV9NQVApLm1hcChicmVha3BvaW50ID0+IEdyaWRMaXN0SXRlbS5ZX1BST1BFUlRZX01BUFticmVha3BvaW50XSldXHJcbiAgICAgICAgICAgIC5maWx0ZXIocHJvcE5hbWUgPT4gY2hhbmdlc1twcm9wTmFtZV0gJiYgIWNoYW5nZXNbcHJvcE5hbWVdLmlzRmlyc3RDaGFuZ2UoKSlcclxuICAgICAgICAgICAgLmZvckVhY2goKHByb3BOYW1lOiBzdHJpbmcpID0+IHJlcmVuZGVyID0gdHJ1ZSk7XHJcblxyXG4gICAgICAgIGlmIChjaGFuZ2VzWydkcmFnQW5kRHJvcCddICYmICFjaGFuZ2VzWydkcmFnQW5kRHJvcCddLmlzRmlyc3RDaGFuZ2UoKSkge1xyXG4gICAgICAgICAgICBpZiAoY2hhbmdlc1snZHJhZ0FuZERyb3AnXS5jdXJyZW50VmFsdWUgJiYgdGhpcy5ncmlkc3Rlci5vcHRpb25zLmRyYWdBbmREcm9wKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmVuYWJsZURyYWdEcm9wKCk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmRpc2FibGVEcmFnZ2FibGUoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoY2hhbmdlc1sncmVzaXphYmxlJ10gJiYgIWNoYW5nZXNbJ3Jlc2l6YWJsZSddLmlzRmlyc3RDaGFuZ2UoKSkge1xyXG4gICAgICAgICAgICBpZiAoY2hhbmdlc1sncmVzaXphYmxlJ10uY3VycmVudFZhbHVlICYmIHRoaXMuZ3JpZHN0ZXIub3B0aW9ucy5yZXNpemFibGUpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZW5hYmxlUmVzaXphYmxlKCk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmRpc2FibGVSZXNpemFibGUoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHJlcmVuZGVyICYmIHRoaXMuZ3JpZHN0ZXIuZ3JpZHN0ZXJDb21wb25lbnQuaXNSZWFkeSkge1xyXG4gICAgICAgICAgICB0aGlzLmdyaWRzdGVyLmRlYm91bmNlUmVuZGVyU3ViamVjdC5uZXh0KCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIG5nT25EZXN0cm95KCkge1xyXG4gICAgICAgIHRoaXMuZ3JpZHN0ZXIucmVtb3ZlSXRlbSh0aGlzLml0ZW0pO1xyXG4gICAgICAgIHRoaXMuZ3JpZHN0ZXIuaXRlbVJlbW92ZVN1YmplY3QubmV4dCh0aGlzLml0ZW0pO1xyXG5cclxuICAgICAgICB0aGlzLnN1YnNjcmlwdGlvbnMuZm9yRWFjaCgoc3ViOiBTdWJzY3JpcHRpb24pID0+IHtcclxuICAgICAgICAgICAgc3ViLnVuc3Vic2NyaWJlKCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgdGhpcy5kaXNhYmxlRHJhZ2dhYmxlKCk7XHJcbiAgICAgICAgdGhpcy5kaXNhYmxlUmVzaXphYmxlKCk7XHJcbiAgICB9XHJcblxyXG4gICAgdXBkYXRlRWxlbWVuZXRQb3NpdGlvbigpIHtcclxuICAgICAgICBpZiAodGhpcy5ncmlkc3Rlci5vcHRpb25zLnVzZUNTU1RyYW5zZm9ybXMpIHtcclxuICAgICAgICAgICAgdXRpbHMuc2V0VHJhbnNmb3JtKHRoaXMuJGVsZW1lbnQsIHt4OiB0aGlzLl9wb3NpdGlvblgsIHk6IHRoaXMuX3Bvc2l0aW9uWX0pO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHV0aWxzLnNldENzc0VsZW1lbnRQb3NpdGlvbih0aGlzLiRlbGVtZW50LCB7eDogdGhpcy5fcG9zaXRpb25YLCB5OiB0aGlzLl9wb3NpdGlvbll9KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgc2V0UG9zaXRpb25zT25JdGVtKCkge1xyXG4gICAgICAgIGlmICghdGhpcy5pdGVtLmhhc1Bvc2l0aW9ucyh0aGlzLmdyaWRzdGVyLm9wdGlvbnMuYnJlYWtwb2ludCkpIHtcclxuICAgICAgICAgICAgdGhpcy5zZXRQb3NpdGlvbnNGb3JHcmlkKHRoaXMuZ3JpZHN0ZXIub3B0aW9ucyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmdyaWRzdGVyLmdyaWRzdGVyT3B0aW9ucy5yZXNwb25zaXZlT3B0aW9uc1xyXG4gICAgICAgICAgICAuZmlsdGVyKChvcHRpb25zOiBJR3JpZHN0ZXJPcHRpb25zKSA9PiAhdGhpcy5pdGVtLmhhc1Bvc2l0aW9ucyhvcHRpb25zLmJyZWFrcG9pbnQpKVxyXG4gICAgICAgICAgICAuZm9yRWFjaCgob3B0aW9uczogSUdyaWRzdGVyT3B0aW9ucykgPT4gdGhpcy5zZXRQb3NpdGlvbnNGb3JHcmlkKG9wdGlvbnMpKTtcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgZW5hYmxlUmVzaXphYmxlKCkge1xyXG4gICAgICAgIGlmICh0aGlzLnJlc2l6ZVN1YnNjcmlwdGlvbnMubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuem9uZS5ydW5PdXRzaWRlQW5ndWxhcigoKSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMuZ2V0UmVzaXplSGFuZGxlcnMoKS5mb3JFYWNoKChoYW5kbGVyKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBkaXJlY3Rpb24gPSB0aGlzLmdldFJlc2l6ZURpcmVjdGlvbihoYW5kbGVyKTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5oYXNSZXNpemFibGVIYW5kbGUoZGlyZWN0aW9uKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGhhbmRsZXIuc3R5bGUuZGlzcGxheSA9ICdibG9jayc7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgY29uc3QgZHJhZ2dhYmxlID0gbmV3IERyYWdnYWJsZShoYW5kbGVyLCB0aGlzLmdldFJlc2l6YWJsZU9wdGlvbnMoKSk7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IHN0YXJ0RXZlbnQ7XHJcbiAgICAgICAgICAgICAgICBsZXQgc3RhcnREYXRhO1xyXG4gICAgICAgICAgICAgICAgbGV0IGN1cnNvclRvRWxlbWVudFBvc2l0aW9uO1xyXG5cclxuICAgICAgICAgICAgICAgIGNvbnN0IGRyYWdTdGFydFN1YiA9IGRyYWdnYWJsZS5kcmFnU3RhcnRcclxuICAgICAgICAgICAgICAgICAgICAuc3Vic2NyaWJlKChldmVudDogRHJhZ2dhYmxlRXZlbnQpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy56b25lLnJ1bigoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmlzUmVzaXppbmcgPSB0cnVlO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0RXZlbnQgPSBldmVudDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0RGF0YSA9IHRoaXMuY3JlYXRlUmVzaXplU3RhcnRPYmplY3QoZGlyZWN0aW9uKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1cnNvclRvRWxlbWVudFBvc2l0aW9uID0gZXZlbnQuZ2V0UmVsYXRpdmVDb29yZGluYXRlcyh0aGlzLiRlbGVtZW50KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmdyaWRzdGVyLm9uUmVzaXplU3RhcnQodGhpcy5pdGVtKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMub25TdGFydCgncmVzaXplJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgIGNvbnN0IGRyYWdTdWIgPSBkcmFnZ2FibGUuZHJhZ01vdmVcclxuICAgICAgICAgICAgICAgICAgICAuc3Vic2NyaWJlKChldmVudDogRHJhZ2dhYmxlRXZlbnQpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2Nyb2xsRGF0YSA9IHRoaXMuZ3JpZHN0ZXIuZ3JpZHN0ZXJTY3JvbGxEYXRhO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yZXNpemVFbGVtZW50KHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpcmVjdGlvbixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0RGF0YSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeDogZXZlbnQuY2xpZW50WCAtIGN1cnNvclRvRWxlbWVudFBvc2l0aW9uLnggLSB0aGlzLmdyaWRzdGVyLmdyaWRzdGVyUmVjdC5sZWZ0LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHk6IGV2ZW50LmNsaWVudFkgLSBjdXJzb3JUb0VsZW1lbnRQb3NpdGlvbi55IC0gdGhpcy5ncmlkc3Rlci5ncmlkc3RlclJlY3QudG9wXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnRFdmVudCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1vdmVFdmVudDogZXZlbnQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzY3JvbGxEaWZmWDogc2Nyb2xsRGF0YS5zY3JvbGxMZWZ0IC0gc3RhcnREYXRhLnNjcm9sbExlZnQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzY3JvbGxEaWZmWTogc2Nyb2xsRGF0YS5zY3JvbGxUb3AgLSBzdGFydERhdGEuc2Nyb2xsVG9wXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5ncmlkc3Rlci5vblJlc2l6ZURyYWcodGhpcy5pdGVtKTtcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICBjb25zdCBkcmFnU3RvcFN1YiA9IGRyYWdnYWJsZS5kcmFnU3RvcFxyXG4gICAgICAgICAgICAgICAgICAgIC5zdWJzY3JpYmUoKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnpvbmUucnVuKCgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaXNSZXNpemluZyA9IGZhbHNlO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZ3JpZHN0ZXIub25SZXNpemVTdG9wKHRoaXMuaXRlbSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm9uRW5kKCdyZXNpemUnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy5yZXNpemVTdWJzY3JpcHRpb25zID0gdGhpcy5yZXNpemVTdWJzY3JpcHRpb25zLmNvbmNhdChbZHJhZ1N0YXJ0U3ViLCBkcmFnU3ViLCBkcmFnU3RvcFN1Yl0pO1xyXG5cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGRpc2FibGVSZXNpemFibGUoKSB7XHJcbiAgICAgICAgdGhpcy5yZXNpemVTdWJzY3JpcHRpb25zLmZvckVhY2goKHN1YjogU3Vic2NyaXB0aW9uKSA9PiB7XHJcbiAgICAgICAgICAgIHN1Yi51bnN1YnNjcmliZSgpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHRoaXMucmVzaXplU3Vic2NyaXB0aW9ucyA9IFtdO1xyXG5cclxuICAgICAgICBbXS5mb3JFYWNoLmNhbGwodGhpcy4kZWxlbWVudC5xdWVyeVNlbGVjdG9yQWxsKCcuZ3JpZHN0ZXItaXRlbS1yZXNpemFibGUtaGFuZGxlcicpLCAoaGFuZGxlcikgPT4ge1xyXG4gICAgICAgICAgICBoYW5kbGVyLnN0eWxlLmRpc3BsYXkgPSAnJztcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgZW5hYmxlRHJhZ0Ryb3AoKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuZHJhZ1N1YnNjcmlwdGlvbnMubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy56b25lLnJ1bk91dHNpZGVBbmd1bGFyKCgpID0+IHtcclxuICAgICAgICAgICAgbGV0IGN1cnNvclRvRWxlbWVudFBvc2l0aW9uO1xyXG5cclxuICAgICAgICAgICAgY29uc3QgZHJhZ2dhYmxlID0gbmV3IERyYWdnYWJsZSh0aGlzLiRlbGVtZW50LCB0aGlzLmdldERyYWdnYWJsZU9wdGlvbnMoKSk7XHJcblxyXG4gICAgICAgICAgICBjb25zdCBkcmFnU3RhcnRTdWIgPSBkcmFnZ2FibGUuZHJhZ1N0YXJ0XHJcbiAgICAgICAgICAgICAgICAuc3Vic2NyaWJlKChldmVudDogRHJhZ2dhYmxlRXZlbnQpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnpvbmUucnVuKCgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5ncmlkc3Rlci5vblN0YXJ0KHRoaXMuaXRlbSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaXNEcmFnZ2luZyA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMub25TdGFydCgnZHJhZycpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgY3Vyc29yVG9FbGVtZW50UG9zaXRpb24gPSBldmVudC5nZXRSZWxhdGl2ZUNvb3JkaW5hdGVzKHRoaXMuJGVsZW1lbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICBjb25zdCBkcmFnU3ViID0gZHJhZ2dhYmxlLmRyYWdNb3ZlXHJcbiAgICAgICAgICAgICAgICAuc3Vic2NyaWJlKChldmVudDogRHJhZ2dhYmxlRXZlbnQpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wb3NpdGlvblkgPSAoZXZlbnQuY2xpZW50WSAtIGN1cnNvclRvRWxlbWVudFBvc2l0aW9uLnkgLVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmdyaWRzdGVyLmdyaWRzdGVyUmVjdC50b3ApO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucG9zaXRpb25YID0gKGV2ZW50LmNsaWVudFggLSBjdXJzb3JUb0VsZW1lbnRQb3NpdGlvbi54IC1cclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5ncmlkc3Rlci5ncmlkc3RlclJlY3QubGVmdCk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy51cGRhdGVFbGVtZW5ldFBvc2l0aW9uKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZ3JpZHN0ZXIub25EcmFnKHRoaXMuaXRlbSk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGRyYWdTdG9wU3ViID0gZHJhZ2dhYmxlLmRyYWdTdG9wXHJcbiAgICAgICAgICAgICAgICAuc3Vic2NyaWJlKCgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnpvbmUucnVuKCgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5ncmlkc3Rlci5vblN0b3AodGhpcy5pdGVtKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5ncmlkc3Rlci5kZWJvdW5jZVJlbmRlclN1YmplY3QubmV4dCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmlzRHJhZ2dpbmcgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5vbkVuZCgnZHJhZycpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmRyYWdTdWJzY3JpcHRpb25zID0gdGhpcy5kcmFnU3Vic2NyaXB0aW9ucy5jb25jYXQoW2RyYWdTdGFydFN1YiwgZHJhZ1N1YiwgZHJhZ1N0b3BTdWJdKTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgZGlzYWJsZURyYWdnYWJsZSgpIHtcclxuICAgICAgICB0aGlzLmRyYWdTdWJzY3JpcHRpb25zLmZvckVhY2goKHN1YjogU3Vic2NyaXB0aW9uKSA9PiB7XHJcbiAgICAgICAgICAgIHN1Yi51bnN1YnNjcmliZSgpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHRoaXMuZHJhZ1N1YnNjcmlwdGlvbnMgPSBbXTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGdldFJlc2l6ZUhhbmRsZXJzKCk6IEhUTUxFbGVtZW50W10gIHtcclxuICAgICAgICByZXR1cm4gW10uZmlsdGVyLmNhbGwodGhpcy4kZWxlbWVudC5jaGlsZHJlblswXS5jaGlsZHJlbiwgKGVsKSA9PiB7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gZWwuY2xhc3NMaXN0LmNvbnRhaW5zKCdncmlkc3Rlci1pdGVtLXJlc2l6YWJsZS1oYW5kbGVyJyk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBnZXREcmFnZ2FibGVPcHRpb25zKCkge1xyXG4gICAgICAgIHJldHVybiB7IHNjcm9sbERpcmVjdGlvbjogdGhpcy5ncmlkc3Rlci5vcHRpb25zLmRpcmVjdGlvbiwgLi4udGhpcy5ncmlkc3Rlci5kcmFnZ2FibGVPcHRpb25zIH07XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBnZXRSZXNpemFibGVPcHRpb25zKCkge1xyXG4gICAgICAgIGNvbnN0IHJlc2l6YWJsZU9wdGlvbnM6IGFueSA9IHt9O1xyXG5cclxuICAgICAgICBpZiAodGhpcy5ncmlkc3Rlci5kcmFnZ2FibGVPcHRpb25zLnNjcm9sbCB8fCB0aGlzLmdyaWRzdGVyLmRyYWdnYWJsZU9wdGlvbnMuc2Nyb2xsID09PSBmYWxzZSkge1xyXG4gICAgICAgICAgICByZXNpemFibGVPcHRpb25zLnNjcm9sbCA9IHRoaXMuZ3JpZHN0ZXIuZHJhZ2dhYmxlT3B0aW9ucy5zY3JvbGw7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICh0aGlzLmdyaWRzdGVyLmRyYWdnYWJsZU9wdGlvbnMuc2Nyb2xsRWRnZSkge1xyXG4gICAgICAgICAgICByZXNpemFibGVPcHRpb25zLnNjcm9sbEVkZ2UgPSB0aGlzLmdyaWRzdGVyLmRyYWdnYWJsZU9wdGlvbnMuc2Nyb2xsRWRnZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJlc2l6YWJsZU9wdGlvbnMuc2Nyb2xsRGlyZWN0aW9uID0gdGhpcy5ncmlkc3Rlci5vcHRpb25zLmRpcmVjdGlvbjtcclxuXHJcbiAgICAgICAgcmV0dXJuIHJlc2l6YWJsZU9wdGlvbnM7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBoYXNSZXNpemFibGVIYW5kbGUoZGlyZWN0aW9uOiBzdHJpbmcpOiBib29sZWFuIHtcclxuICAgICAgICBjb25zdCBpc0l0ZW1SZXNpemFibGUgPSB0aGlzLmdyaWRzdGVyLm9wdGlvbnMucmVzaXphYmxlICYmIHRoaXMuaXRlbS5yZXNpemFibGU7XHJcbiAgICAgICAgY29uc3QgcmVzaXplSGFuZGxlcyA9IHRoaXMuZ3JpZHN0ZXIub3B0aW9ucy5yZXNpemVIYW5kbGVzO1xyXG5cclxuICAgICAgICByZXR1cm4gaXNJdGVtUmVzaXphYmxlICYmICghcmVzaXplSGFuZGxlcyB8fCAocmVzaXplSGFuZGxlcyAmJiAhIXJlc2l6ZUhhbmRsZXNbZGlyZWN0aW9uXSkpO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgc2V0UG9zaXRpb25zRm9yR3JpZChvcHRpb25zOiBJR3JpZHN0ZXJPcHRpb25zKSB7XHJcbiAgICAgICAgbGV0IHgsIHk7XHJcblxyXG4gICAgICAgIGNvbnN0IHBvc2l0aW9uID0gdGhpcy5maW5kUG9zaXRpb24ob3B0aW9ucyk7XHJcbiAgICAgICAgeCA9IG9wdGlvbnMuZGlyZWN0aW9uID09PSAnaG9yaXpvbnRhbCcgPyBwb3NpdGlvblswXSA6IHBvc2l0aW9uWzFdO1xyXG4gICAgICAgIHkgPSBvcHRpb25zLmRpcmVjdGlvbiA9PT0gJ2hvcml6b250YWwnID8gcG9zaXRpb25bMV0gOiBwb3NpdGlvblswXTtcclxuXHJcbiAgICAgICAgdGhpcy5pdGVtLnNldFZhbHVlWCh4LCBvcHRpb25zLmJyZWFrcG9pbnQpO1xyXG4gICAgICAgIHRoaXMuaXRlbS5zZXRWYWx1ZVkoeSwgb3B0aW9ucy5icmVha3BvaW50KTtcclxuXHJcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMuaXRlbS50cmlnZ2VyQ2hhbmdlWChvcHRpb25zLmJyZWFrcG9pbnQpO1xyXG4gICAgICAgICAgICB0aGlzLml0ZW0udHJpZ2dlckNoYW5nZVkob3B0aW9ucy5icmVha3BvaW50KTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGZpbmRQb3NpdGlvbihvcHRpb25zOiBJR3JpZHN0ZXJPcHRpb25zKTogQXJyYXk8bnVtYmVyPiB7XHJcbiAgICAgICAgY29uc3QgZ3JpZExpc3QgPSBuZXcgR3JpZExpc3QoXHJcbiAgICAgICAgICAgIHRoaXMuZ3JpZHN0ZXIuaXRlbXMubWFwKGl0ZW0gPT4gaXRlbS5jb3B5Rm9yQnJlYWtwb2ludChvcHRpb25zLmJyZWFrcG9pbnQpKSxcclxuICAgICAgICAgICAgb3B0aW9uc1xyXG4gICAgICAgICk7XHJcblxyXG4gICAgICAgIHJldHVybiBncmlkTGlzdC5maW5kUG9zaXRpb25Gb3JJdGVtKHRoaXMuaXRlbSwge3g6IDAsIHk6IDB9KTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGNyZWF0ZVJlc2l6ZVN0YXJ0T2JqZWN0KGRpcmVjdGlvbjogc3RyaW5nKSB7XHJcbiAgICAgICAgY29uc3Qgc2Nyb2xsRGF0YSA9IHRoaXMuZ3JpZHN0ZXIuZ3JpZHN0ZXJTY3JvbGxEYXRhO1xyXG5cclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICB0b3A6IHRoaXMucG9zaXRpb25ZLFxyXG4gICAgICAgICAgICBsZWZ0OiB0aGlzLnBvc2l0aW9uWCxcclxuICAgICAgICAgICAgaGVpZ2h0OiBwYXJzZUludCh0aGlzLiRlbGVtZW50LnN0eWxlLmhlaWdodCwgMTApLFxyXG4gICAgICAgICAgICB3aWR0aDogcGFyc2VJbnQodGhpcy4kZWxlbWVudC5zdHlsZS53aWR0aCwgMTApLFxyXG4gICAgICAgICAgICBtaW5YOiBNYXRoLm1heCh0aGlzLml0ZW0ueCArIHRoaXMuaXRlbS53IC0gdGhpcy5vcHRpb25zLm1heFdpZHRoLCAwKSxcclxuICAgICAgICAgICAgbWF4WDogdGhpcy5pdGVtLnggKyB0aGlzLml0ZW0udyAtIHRoaXMub3B0aW9ucy5taW5XaWR0aCxcclxuICAgICAgICAgICAgbWluWTogTWF0aC5tYXgodGhpcy5pdGVtLnkgKyB0aGlzLml0ZW0uaCAtIHRoaXMub3B0aW9ucy5tYXhIZWlnaHQsIDApLFxyXG4gICAgICAgICAgICBtYXhZOiB0aGlzLml0ZW0ueSArIHRoaXMuaXRlbS5oIC0gdGhpcy5vcHRpb25zLm1pbkhlaWdodCxcclxuICAgICAgICAgICAgbWluVzogdGhpcy5vcHRpb25zLm1pbldpZHRoLFxyXG4gICAgICAgICAgICBtYXhXOiBNYXRoLm1pbihcclxuICAgICAgICAgICAgICAgIHRoaXMub3B0aW9ucy5tYXhXaWR0aCxcclxuICAgICAgICAgICAgICAgICh0aGlzLmdyaWRzdGVyLm9wdGlvbnMuZGlyZWN0aW9uID09PSAndmVydGljYWwnICYmIGRpcmVjdGlvbi5pbmRleE9mKCd3JykgPCAwKSA/XHJcbiAgICAgICAgICAgICAgICB0aGlzLmdyaWRzdGVyLm9wdGlvbnMubGFuZXMgLSB0aGlzLml0ZW0ueCA6IHRoaXMub3B0aW9ucy5tYXhXaWR0aCxcclxuICAgICAgICAgICAgICAgIGRpcmVjdGlvbi5pbmRleE9mKCd3JykgPj0gMCA/XHJcbiAgICAgICAgICAgICAgICB0aGlzLml0ZW0ueCArIHRoaXMuaXRlbS53IDogdGhpcy5vcHRpb25zLm1heFdpZHRoXHJcbiAgICAgICAgICAgICksXHJcbiAgICAgICAgICAgIG1pbkg6IHRoaXMub3B0aW9ucy5taW5IZWlnaHQsXHJcbiAgICAgICAgICAgIG1heEg6IE1hdGgubWluKFxyXG4gICAgICAgICAgICAgICAgdGhpcy5vcHRpb25zLm1heEhlaWdodCxcclxuICAgICAgICAgICAgICAgICh0aGlzLmdyaWRzdGVyLm9wdGlvbnMuZGlyZWN0aW9uID09PSAnaG9yaXpvbnRhbCcgJiYgZGlyZWN0aW9uLmluZGV4T2YoJ24nKSA8IDApID9cclxuICAgICAgICAgICAgICAgIHRoaXMuZ3JpZHN0ZXIub3B0aW9ucy5sYW5lcyAtIHRoaXMuaXRlbS55IDogdGhpcy5vcHRpb25zLm1heEhlaWdodCxcclxuICAgICAgICAgICAgICAgIGRpcmVjdGlvbi5pbmRleE9mKCduJykgPj0gMCA/XHJcbiAgICAgICAgICAgICAgICB0aGlzLml0ZW0ueSArIHRoaXMuaXRlbS5oIDogdGhpcy5vcHRpb25zLm1heEhlaWdodFxyXG4gICAgICAgICAgICApLFxyXG4gICAgICAgICAgICBzY3JvbGxMZWZ0OiBzY3JvbGxEYXRhLnNjcm9sbExlZnQsXHJcbiAgICAgICAgICAgIHNjcm9sbFRvcDogc2Nyb2xsRGF0YS5zY3JvbGxUb3BcclxuICAgICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgb25FbmQoYWN0aW9uVHlwZTogc3RyaW5nKTogdm9pZCB7XHJcbiAgICAgICAgdGhpcy5lbmQuZW1pdCh7YWN0aW9uOiBhY3Rpb25UeXBlLCBpdGVtOiB0aGlzLml0ZW19KTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIG9uU3RhcnQoYWN0aW9uVHlwZTogc3RyaW5nKTogdm9pZCB7XHJcbiAgICAgICAgdGhpcy5zdGFydC5lbWl0KHthY3Rpb246IGFjdGlvblR5cGUsIGl0ZW06IHRoaXMuaXRlbX0pO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQXNzaWduIGNsYXNzIGZvciBzaG9ydCB3aGlsZSB0byBwcmV2ZW50IGFuaW1hdGlvbiBvZiBncmlkIGl0ZW0gY29tcG9uZW50XHJcbiAgICAgKi9cclxuICAgIHByaXZhdGUgcHJldmVudEFuaW1hdGlvbigpOiBHcmlkc3Rlckl0ZW1Db21wb25lbnQge1xyXG4gICAgICAgIHRoaXMuJGVsZW1lbnQuY2xhc3NMaXN0LmFkZCgnbm8tdHJhbnNpdGlvbicpO1xyXG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLiRlbGVtZW50LmNsYXNzTGlzdC5yZW1vdmUoJ25vLXRyYW5zaXRpb24nKTtcclxuICAgICAgICB9LCA1MDApO1xyXG5cclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGdldFJlc2l6ZURpcmVjdGlvbihoYW5kbGVyOiBFbGVtZW50KTogc3RyaW5nIHtcclxuICAgICAgICBmb3IgKGxldCBpID0gaGFuZGxlci5jbGFzc0xpc3QubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcclxuICAgICAgICAgICAgaWYgKGhhbmRsZXIuY2xhc3NMaXN0W2ldLm1hdGNoKCdoYW5kbGUtJykpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBoYW5kbGVyLmNsYXNzTGlzdFtpXS5zcGxpdCgnLScpWzFdO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgcmVzaXplRWxlbWVudChjb25maWc6IGFueSk6IHZvaWQge1xyXG4gICAgICAgIC8vIG5vcnRoXHJcbiAgICAgICAgaWYgKGNvbmZpZy5kaXJlY3Rpb24uaW5kZXhPZignbicpID49IDApIHtcclxuICAgICAgICAgICAgdGhpcy5yZXNpemVUb05vcnRoKGNvbmZpZyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vIHdlc3RcclxuICAgICAgICBpZiAoY29uZmlnLmRpcmVjdGlvbi5pbmRleE9mKCd3JykgPj0gMCkge1xyXG4gICAgICAgICAgICB0aGlzLnJlc2l6ZVRvV2VzdChjb25maWcpO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvLyBlYXN0XHJcbiAgICAgICAgaWYgKGNvbmZpZy5kaXJlY3Rpb24uaW5kZXhPZignZScpID49IDApIHtcclxuICAgICAgICAgICAgdGhpcy5yZXNpemVUb0Vhc3QoY29uZmlnKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gc291dGhcclxuICAgICAgICBpZiAoY29uZmlnLmRpcmVjdGlvbi5pbmRleE9mKCdzJykgPj0gMCkge1xyXG4gICAgICAgICAgICB0aGlzLnJlc2l6ZVRvU291dGgoY29uZmlnKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSByZXNpemVUb05vcnRoKGNvbmZpZzogYW55KTogdm9pZCB7XHJcbiAgICAgICAgY29uc3QgaGVpZ2h0ID0gY29uZmlnLnN0YXJ0RGF0YS5oZWlnaHQgKyBjb25maWcuc3RhcnRFdmVudC5jbGllbnRZIC1cclxuICAgICAgICAgICAgY29uZmlnLm1vdmVFdmVudC5jbGllbnRZIC0gY29uZmlnLnNjcm9sbERpZmZZO1xyXG5cclxuICAgICAgICBpZiAoaGVpZ2h0IDwgKGNvbmZpZy5zdGFydERhdGEubWluSCAqIHRoaXMuZ3JpZHN0ZXIuY2VsbEhlaWdodCkpIHtcclxuICAgICAgICAgICAgdGhpcy5zZXRNaW5IZWlnaHQoJ24nLCBjb25maWcpO1xyXG4gICAgICAgIH0gZWxzZSBpZiAoaGVpZ2h0ID4gKGNvbmZpZy5zdGFydERhdGEubWF4SCAqIHRoaXMuZ3JpZHN0ZXIuY2VsbEhlaWdodCkpIHtcclxuICAgICAgICAgICAgdGhpcy5zZXRNYXhIZWlnaHQoJ24nLCBjb25maWcpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMucG9zaXRpb25ZID0gY29uZmlnLnBvc2l0aW9uLnk7XHJcbiAgICAgICAgICAgIHRoaXMuJGVsZW1lbnQuc3R5bGUuaGVpZ2h0ID0gaGVpZ2h0ICsgJ3B4JztcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSByZXNpemVUb1dlc3QoY29uZmlnOiBhbnkpOiB2b2lkIHtcclxuICAgICAgICBjb25zdCB3aWR0aCA9IGNvbmZpZy5zdGFydERhdGEud2lkdGggKyBjb25maWcuc3RhcnRFdmVudC5jbGllbnRYIC1cclxuICAgICAgICAgICAgY29uZmlnLm1vdmVFdmVudC5jbGllbnRYIC0gY29uZmlnLnNjcm9sbERpZmZYO1xyXG5cclxuICAgICAgICBpZiAod2lkdGggPCAoY29uZmlnLnN0YXJ0RGF0YS5taW5XICogdGhpcy5ncmlkc3Rlci5jZWxsV2lkdGgpKSB7XHJcbiAgICAgICAgICAgIHRoaXMuc2V0TWluV2lkdGgoJ3cnLCBjb25maWcpO1xyXG4gICAgICAgIH0gZWxzZSBpZiAod2lkdGggPiAoY29uZmlnLnN0YXJ0RGF0YS5tYXhXICogdGhpcy5ncmlkc3Rlci5jZWxsV2lkdGgpKSB7XHJcbiAgICAgICAgICAgIHRoaXMuc2V0TWF4V2lkdGgoJ3cnLCBjb25maWcpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMucG9zaXRpb25YID0gY29uZmlnLnBvc2l0aW9uLng7XHJcbiAgICAgICAgICAgIHRoaXMudXBkYXRlRWxlbWVuZXRQb3NpdGlvbigpO1xyXG4gICAgICAgICAgICB0aGlzLiRlbGVtZW50LnN0eWxlLndpZHRoID0gd2lkdGggKyAncHgnO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHJlc2l6ZVRvRWFzdChjb25maWc6IGFueSk6IHZvaWQge1xyXG4gICAgICAgIGNvbnN0IHdpZHRoID0gY29uZmlnLnN0YXJ0RGF0YS53aWR0aCArIGNvbmZpZy5tb3ZlRXZlbnQuY2xpZW50WCAtXHJcbiAgICAgICAgICAgIGNvbmZpZy5zdGFydEV2ZW50LmNsaWVudFggKyBjb25maWcuc2Nyb2xsRGlmZlg7XHJcblxyXG4gICAgICAgIGlmICh3aWR0aCA+IChjb25maWcuc3RhcnREYXRhLm1heFcgKiB0aGlzLmdyaWRzdGVyLmNlbGxXaWR0aCkpIHtcclxuICAgICAgICAgICAgdGhpcy5zZXRNYXhXaWR0aCgnZScsIGNvbmZpZyk7XHJcbiAgICAgICAgfSBlbHNlIGlmICh3aWR0aCA8IChjb25maWcuc3RhcnREYXRhLm1pblcgKiB0aGlzLmdyaWRzdGVyLmNlbGxXaWR0aCkpIHtcclxuICAgICAgICAgICAgdGhpcy5zZXRNaW5XaWR0aCgnZScsIGNvbmZpZyk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy4kZWxlbWVudC5zdHlsZS53aWR0aCA9IHdpZHRoICsgJ3B4JztcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSByZXNpemVUb1NvdXRoKGNvbmZpZzogYW55KTogdm9pZCB7XHJcbiAgICAgICAgY29uc3QgaGVpZ2h0ID0gY29uZmlnLnN0YXJ0RGF0YS5oZWlnaHQgKyBjb25maWcubW92ZUV2ZW50LmNsaWVudFkgLVxyXG4gICAgICAgICAgICBjb25maWcuc3RhcnRFdmVudC5jbGllbnRZICsgY29uZmlnLnNjcm9sbERpZmZZO1xyXG5cclxuICAgICAgICBpZiAoaGVpZ2h0ID4gY29uZmlnLnN0YXJ0RGF0YS5tYXhIICogdGhpcy5ncmlkc3Rlci5jZWxsSGVpZ2h0KSB7XHJcbiAgICAgICAgICAgIHRoaXMuc2V0TWF4SGVpZ2h0KCdzJywgY29uZmlnKTtcclxuICAgICAgICB9IGVsc2UgaWYgKGhlaWdodCA8IGNvbmZpZy5zdGFydERhdGEubWluSCAqIHRoaXMuZ3JpZHN0ZXIuY2VsbEhlaWdodCkge1xyXG4gICAgICAgICAgICB0aGlzLnNldE1pbkhlaWdodCgncycsIGNvbmZpZyk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy4kZWxlbWVudC5zdHlsZS5oZWlnaHQgPSBoZWlnaHQgKyAncHgnO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHNldE1pbkhlaWdodChkaXJlY3Rpb246IHN0cmluZywgY29uZmlnOiBhbnkpOiB2b2lkIHtcclxuICAgICAgICBpZiAoZGlyZWN0aW9uID09PSAnbicpIHtcclxuICAgICAgICAgICAgdGhpcy4kZWxlbWVudC5zdHlsZS5oZWlnaHQgPSAoY29uZmlnLnN0YXJ0RGF0YS5taW5IICogdGhpcy5ncmlkc3Rlci5jZWxsSGVpZ2h0KSArICdweCc7XHJcbiAgICAgICAgICAgIHRoaXMucG9zaXRpb25ZID0gY29uZmlnLnN0YXJ0RGF0YS5tYXhZICogdGhpcy5ncmlkc3Rlci5jZWxsSGVpZ2h0O1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMuJGVsZW1lbnQuc3R5bGUuaGVpZ2h0ID0gKGNvbmZpZy5zdGFydERhdGEubWluSCAqIHRoaXMuZ3JpZHN0ZXIuY2VsbEhlaWdodCkgKyAncHgnO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHNldE1pbldpZHRoKGRpcmVjdGlvbjogc3RyaW5nLCBjb25maWc6IGFueSk6IHZvaWQge1xyXG4gICAgICAgIGlmIChkaXJlY3Rpb24gPT09ICd3Jykge1xyXG4gICAgICAgICAgICB0aGlzLiRlbGVtZW50LnN0eWxlLndpZHRoID0gKGNvbmZpZy5zdGFydERhdGEubWluVyAqIHRoaXMuZ3JpZHN0ZXIuY2VsbFdpZHRoKSArICdweCc7XHJcbiAgICAgICAgICAgIHRoaXMucG9zaXRpb25YID0gY29uZmlnLnN0YXJ0RGF0YS5tYXhYICogdGhpcy5ncmlkc3Rlci5jZWxsV2lkdGg7XHJcbiAgICAgICAgICAgIHRoaXMudXBkYXRlRWxlbWVuZXRQb3NpdGlvbigpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMuJGVsZW1lbnQuc3R5bGUud2lkdGggPSAoY29uZmlnLnN0YXJ0RGF0YS5taW5XICogdGhpcy5ncmlkc3Rlci5jZWxsV2lkdGgpICsgJ3B4JztcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBzZXRNYXhIZWlnaHQoZGlyZWN0aW9uOiBzdHJpbmcsIGNvbmZpZzogYW55KTogdm9pZCB7XHJcblxyXG4gICAgICAgIGlmIChkaXJlY3Rpb24gPT09ICduJykge1xyXG4gICAgICAgICAgICB0aGlzLiRlbGVtZW50LnN0eWxlLmhlaWdodCA9IChjb25maWcuc3RhcnREYXRhLm1heEggKiB0aGlzLmdyaWRzdGVyLmNlbGxIZWlnaHQpICsgJ3B4JztcclxuICAgICAgICAgICAgdGhpcy5wb3NpdGlvblkgPSBjb25maWcuc3RhcnREYXRhLm1pblkgKiB0aGlzLmdyaWRzdGVyLmNlbGxIZWlnaHQ7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy4kZWxlbWVudC5zdHlsZS5oZWlnaHQgPSAoY29uZmlnLnN0YXJ0RGF0YS5tYXhIICogdGhpcy5ncmlkc3Rlci5jZWxsSGVpZ2h0KSArICdweCc7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgc2V0TWF4V2lkdGgoZGlyZWN0aW9uOiBzdHJpbmcsIGNvbmZpZzogYW55KTogdm9pZCB7XHJcblxyXG4gICAgICAgIGlmIChkaXJlY3Rpb24gPT09ICd3Jykge1xyXG4gICAgICAgICAgICB0aGlzLiRlbGVtZW50LnN0eWxlLndpZHRoID0gKGNvbmZpZy5zdGFydERhdGEubWF4VyAqIHRoaXMuZ3JpZHN0ZXIuY2VsbFdpZHRoKSArICdweCc7XHJcbiAgICAgICAgICAgIHRoaXMucG9zaXRpb25YID0gY29uZmlnLnN0YXJ0RGF0YS5taW5YICogdGhpcy5ncmlkc3Rlci5jZWxsV2lkdGg7XHJcbiAgICAgICAgICAgIHRoaXMudXBkYXRlRWxlbWVuZXRQb3NpdGlvbigpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMuJGVsZW1lbnQuc3R5bGUud2lkdGggPSAoY29uZmlnLnN0YXJ0RGF0YS5tYXhXICogdGhpcy5ncmlkc3Rlci5jZWxsV2lkdGgpICsgJ3B4JztcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuIl19