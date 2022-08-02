import { Component, ViewChild, Input, Output, EventEmitter, ChangeDetectionStrategy, HostBinding, ViewEncapsulation } from '@angular/core';
import { Subscription, fromEvent } from 'rxjs';
import { debounceTime, filter, publish } from 'rxjs/operators';
import { utils } from './utils/utils';
import { GridsterService } from './gridster.service';
import { GridsterOptions } from './GridsterOptions';
import * as i0 from "@angular/core";
import * as i1 from "./gridster.service";
import * as i2 from "./gridster-prototype/gridster-prototype.service";
export class GridsterComponent {
    constructor(zone, elementRef, gridster, gridsterPrototype) {
        this.zone = zone;
        this.gridsterPrototype = gridsterPrototype;
        this.optionsChange = new EventEmitter();
        this.ready = new EventEmitter();
        this.reflow = new EventEmitter();
        this.prototypeDrop = new EventEmitter();
        this.prototypeEnter = new EventEmitter();
        this.prototypeOut = new EventEmitter();
        this.draggableOptions = {};
        this.isDragging = false;
        this.isResizing = false;
        this.isReady = false;
        this.isPrototypeEntered = false;
        this.isDisabled = false;
        this.subscription = new Subscription();
        this.gridster = gridster;
        this.$element = elementRef.nativeElement;
    }
    ngOnInit() {
        this.gridsterOptions = new GridsterOptions(this.options, this.$element);
        if (this.options.useCSSTransforms) {
            this.$element.classList.add('css-transform');
        }
        this.subscription.add(this.gridsterOptions.change.subscribe(options => {
            this.gridster.options = options;
            if (this.gridster.gridList) {
                this.gridster.gridList.options = options;
            }
            setTimeout(() => this.optionsChange.emit(options));
        }));
        this.gridster.init(this);
        this.subscription.add(fromEvent(window, 'resize')
            .pipe(debounceTime(this.gridster.options.responsiveDebounce || 0), filter(() => this.gridster.options.responsiveView))
            .subscribe(() => this.reload()));
        this.zone.runOutsideAngular(() => {
            this.subscription.add(fromEvent(document, 'scroll', { passive: true }).subscribe(() => this.updateGridsterElementData()));
            const scrollableContainer = utils.getScrollableContainer(this.$element);
            if (scrollableContainer) {
                this.subscription.add(fromEvent(scrollableContainer, 'scroll', { passive: true })
                    .subscribe(() => this.updateGridsterElementData()));
            }
        });
    }
    ngAfterContentInit() {
        this.gridster.start();
        this.updateGridsterElementData();
        this.connectGridsterPrototype();
        this.gridster.$positionHighlight = this.$positionHighlight.nativeElement;
    }
    ngOnDestroy() {
        this.subscription.unsubscribe();
    }
    /**
     * Change gridster config option and rebuild
     * @param string name
     * @param any value
     * @return GridsterComponent
     */
    setOption(name, value) {
        if (name === 'dragAndDrop') {
            if (value) {
                this.enableDraggable();
            }
            else {
                this.disableDraggable();
            }
        }
        if (name === 'resizable') {
            if (value) {
                this.enableResizable();
            }
            else {
                this.disableResizable();
            }
        }
        if (name === 'lanes') {
            this.gridster.options.lanes = value;
            this.gridster.gridList.fixItemsPositions(this.gridster.options);
            this.reflowGridster();
        }
        if (name === 'direction') {
            this.gridster.options.direction = value;
            this.gridster.gridList.pullItemsToLeft();
        }
        if (name === 'widthHeightRatio') {
            this.gridster.options.widthHeightRatio = parseFloat(value || 1);
        }
        if (name === 'responsiveView') {
            this.gridster.options.responsiveView = !!value;
        }
        this.gridster.gridList.setOption(name, value);
        return this;
    }
    reload() {
        setTimeout(() => {
            this.gridster.fixItemsPositions();
            this.reflowGridster();
        });
        return this;
    }
    reflowGridster(isInit = false) {
        this.gridster.reflow();
        this.reflow.emit({
            isInit: isInit,
            gridsterComponent: this
        });
    }
    updateGridsterElementData() {
        this.gridster.gridsterScrollData = this.getScrollPositionFromParents(this.$element);
        this.gridster.gridsterRect = this.$element.getBoundingClientRect();
    }
    setReady() {
        setTimeout(() => (this.isReady = true));
        this.ready.emit();
    }
    adjustItemsHeightToContent(scrollableItemElementSelector = '.gridster-item-inner') {
        this.gridster.items
            // convert each item to object with information about content height and scroll height
            .map((item) => {
            const scrollEl = item.$element.querySelector(scrollableItemElementSelector);
            const contentEl = scrollEl.lastElementChild;
            const scrollElDistance = utils.getRelativeCoordinates(scrollEl, item.$element);
            const scrollElRect = scrollEl.getBoundingClientRect();
            const contentRect = contentEl.getBoundingClientRect();
            return {
                item,
                contentHeight: contentRect.bottom - scrollElRect.top,
                scrollElDistance
            };
        })
            // calculate required height in lanes amount and update item "h"
            .forEach(data => {
            data.item.h = Math.ceil(((data.contentHeight /
                (this.gridster.cellHeight - data.scrollElDistance.top))));
        });
        this.gridster.fixItemsPositions();
        this.gridster.reflow();
    }
    disable(item) {
        const itemIdx = this.gridster.items.indexOf(item.itemComponent);
        this.isDisabled = true;
        if (itemIdx >= 0) {
            delete this.gridster.items[this.gridster.items.indexOf(item.itemComponent)];
        }
        this.gridster.onDragOut(item);
    }
    enable() {
        this.isDisabled = false;
    }
    getScrollPositionFromParents(element, data = { scrollTop: 0, scrollLeft: 0 }) {
        if (element.parentElement && element.parentElement !== document.body) {
            data.scrollTop += element.parentElement.scrollTop;
            data.scrollLeft += element.parentElement.scrollLeft;
            return this.getScrollPositionFromParents(element.parentElement, data);
        }
        return {
            scrollTop: data.scrollTop,
            scrollLeft: data.scrollLeft
        };
    }
    /**
     * Connect gridster prototype item to gridster dragging hooks (onStart, onDrag, onStop).
     */
    connectGridsterPrototype() {
        this.gridsterPrototype.observeDropOut(this.gridster).subscribe();
        const dropOverObservable = (this.gridsterPrototype
            .observeDropOver(this.gridster)
            .pipe(publish()));
        const dragObservable = this.gridsterPrototype.observeDragOver(this.gridster);
        dragObservable.dragOver
            .pipe(filter(() => !this.isDisabled))
            .subscribe((prototype) => {
            if (!this.isPrototypeEntered) {
                return;
            }
            this.gridster.onDrag(prototype.item);
        });
        dragObservable.dragEnter
            .pipe(filter(() => !this.isDisabled))
            .subscribe((prototype) => {
            this.isPrototypeEntered = true;
            if (this.gridster.items.indexOf(prototype.item) < 0) {
                this.gridster.items.push(prototype.item);
            }
            this.gridster.onStart(prototype.item);
            prototype.setDragContextGridster(this.gridster);
            if (this.parent) {
                this.parent.disable(prototype.item);
            }
            this.prototypeEnter.emit({ item: prototype.item });
        });
        dragObservable.dragOut
            .pipe(filter(() => !this.isDisabled))
            .subscribe((prototype) => {
            if (!this.isPrototypeEntered) {
                return;
            }
            this.gridster.onDragOut(prototype.item);
            this.isPrototypeEntered = false;
            this.prototypeOut.emit({ item: prototype.item });
            if (this.parent) {
                this.parent.enable();
                this.parent.isPrototypeEntered = true;
                if (this.parent.gridster.items.indexOf(prototype.item) < 0) {
                    this.parent.gridster.items.push(prototype.item);
                }
                this.parent.gridster.onStart(prototype.item);
                prototype.setDragContextGridster(this.parent.gridster);
                // timeout is needed to be sure that "enter" event is fired after "out"
                setTimeout(() => {
                    this.parent.prototypeEnter.emit({
                        item: prototype.item
                    });
                    prototype.onEnter(this.parent.gridster);
                });
            }
        });
        dropOverObservable
            .pipe(filter(() => !this.isDisabled))
            .subscribe(data => {
            if (!this.isPrototypeEntered) {
                return;
            }
            this.gridster.onStop(data.item.item);
            this.gridster.removeItem(data.item.item);
            this.isPrototypeEntered = false;
            if (this.parent) {
                this.parent.enable();
            }
            this.prototypeDrop.emit({ item: data.item.item });
        });
        dropOverObservable.connect();
    }
    enableDraggable() {
        this.gridster.options.dragAndDrop = true;
        this.gridster.items
            .filter(item => item.itemComponent && item.itemComponent.dragAndDrop)
            .forEach((item) => item.itemComponent.enableDragDrop());
    }
    disableDraggable() {
        this.gridster.options.dragAndDrop = false;
        this.gridster.items
            .filter(item => item.itemComponent)
            .forEach((item) => item.itemComponent.disableDraggable());
    }
    enableResizable() {
        this.gridster.options.resizable = true;
        this.gridster.items
            .filter(item => item.itemComponent && item.itemComponent.resizable)
            .forEach((item) => item.itemComponent.enableResizable());
    }
    disableResizable() {
        this.gridster.options.resizable = false;
        this.gridster.items.forEach((item) => item.itemComponent.disableResizable());
    }
}
GridsterComponent.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "13.1.1", ngImport: i0, type: GridsterComponent, deps: [{ token: i0.NgZone }, { token: i0.ElementRef }, { token: i1.GridsterService }, { token: i2.GridsterPrototypeService }], target: i0.ɵɵFactoryTarget.Component });
GridsterComponent.ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "12.0.0", version: "13.1.1", type: GridsterComponent, selector: "ngx-gridster", inputs: { options: "options", draggableOptions: "draggableOptions", parent: "parent" }, outputs: { optionsChange: "optionsChange", ready: "ready", reflow: "reflow", prototypeDrop: "prototypeDrop", prototypeEnter: "prototypeEnter", prototypeOut: "prototypeOut" }, host: { properties: { "class.gridster--dragging": "this.isDragging", "class.gridster--resizing": "this.isResizing", "class.gridster--ready": "this.isReady" } }, providers: [GridsterService], viewQueries: [{ propertyName: "$positionHighlight", first: true, predicate: ["positionHighlight"], descendants: true, static: true }], ngImport: i0, template: `<div class="gridster-container">
      <ng-content></ng-content>
      <div class="position-highlight" style="display:none;" #positionHighlight>
        <div class="inner"></div>
      </div>
    </div>`, isInline: true, styles: ["ngx-gridster{position:relative;display:block;left:0;width:100%}ngx-gridster.gridster--dragging{-moz-user-select:none;-webkit-user-select:none;-ms-user-select:none;user-select:none}ngx-gridster .gridster-container{position:relative;width:100%;list-style:none;transition:width .2s,height .2s}ngx-gridster .position-highlight{display:block;position:absolute;z-index:1}\n"], changeDetection: i0.ChangeDetectionStrategy.OnPush, encapsulation: i0.ViewEncapsulation.None });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "13.1.1", ngImport: i0, type: GridsterComponent, decorators: [{
            type: Component,
            args: [{
                    selector: 'ngx-gridster',
                    template: `<div class="gridster-container">
      <ng-content></ng-content>
      <div class="position-highlight" style="display:none;" #positionHighlight>
        <div class="inner"></div>
      </div>
    </div>`,
                    styles: [
                        `
            ngx-gridster {
                position: relative;
                display: block;
                left: 0;
                width: 100%;
            }

            ngx-gridster.gridster--dragging {
                -moz-user-select: none;
                -khtml-user-select: none;
                -webkit-user-select: none;
                -ms-user-select: none;
                user-select: none;
            }

            ngx-gridster .gridster-container {
                position: relative;
                width: 100%;
                list-style: none;
                -webkit-transition: width 0.2s, height 0.2s;
                transition: width 0.2s, height 0.2s;
            }

            ngx-gridster .position-highlight {
                display: block;
                position: absolute;
                z-index: 1;
            }
        `
                    ],
                    providers: [GridsterService],
                    changeDetection: ChangeDetectionStrategy.OnPush,
                    encapsulation: ViewEncapsulation.None
                }]
        }], ctorParameters: function () { return [{ type: i0.NgZone }, { type: i0.ElementRef }, { type: i1.GridsterService }, { type: i2.GridsterPrototypeService }]; }, propDecorators: { options: [{
                type: Input
            }], optionsChange: [{
                type: Output
            }], ready: [{
                type: Output
            }], reflow: [{
                type: Output
            }], prototypeDrop: [{
                type: Output
            }], prototypeEnter: [{
                type: Output
            }], prototypeOut: [{
                type: Output
            }], draggableOptions: [{
                type: Input
            }], parent: [{
                type: Input
            }], $positionHighlight: [{
                type: ViewChild,
                args: ['positionHighlight', { static: true }]
            }], isDragging: [{
                type: HostBinding,
                args: ['class.gridster--dragging']
            }], isResizing: [{
                type: HostBinding,
                args: ['class.gridster--resizing']
            }], isReady: [{
                type: HostBinding,
                args: ['class.gridster--ready']
            }] } });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3JpZHN0ZXIuY29tcG9uZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vcHJvamVjdHMvYW5ndWxhcjJncmlkc3Rlci9zcmMvbGliL2dyaWRzdGVyLmNvbXBvbmVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQ0gsU0FBUyxFQUtULFNBQVMsRUFFVCxLQUFLLEVBQ0wsTUFBTSxFQUNOLFlBQVksRUFDWix1QkFBdUIsRUFDdkIsV0FBVyxFQUNYLGlCQUFpQixFQUNwQixNQUFNLGVBQWUsQ0FBQztBQUN2QixPQUFPLEVBRUgsWUFBWSxFQUNaLFNBQVMsRUFFWixNQUFNLE1BQU0sQ0FBQztBQUNkLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBRS9ELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDdEMsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBTXJELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQzs7OztBQThDcEQsTUFBTSxPQUFPLGlCQUFpQjtJQXdCMUIsWUFDWSxJQUFZLEVBQ3BCLFVBQXNCLEVBQ3RCLFFBQXlCLEVBQ2pCLGlCQUEyQztRQUgzQyxTQUFJLEdBQUosSUFBSSxDQUFRO1FBR1osc0JBQWlCLEdBQWpCLGlCQUFpQixDQUEwQjtRQTFCN0Msa0JBQWEsR0FBRyxJQUFJLFlBQVksRUFBTyxDQUFDO1FBQ3hDLFVBQUssR0FBRyxJQUFJLFlBQVksRUFBTyxDQUFDO1FBQ2hDLFdBQU0sR0FBRyxJQUFJLFlBQVksRUFBTyxDQUFDO1FBQ2pDLGtCQUFhLEdBQUcsSUFBSSxZQUFZLEVBQTBCLENBQUM7UUFDM0QsbUJBQWMsR0FBRyxJQUFJLFlBQVksRUFBMEIsQ0FBQztRQUM1RCxpQkFBWSxHQUFHLElBQUksWUFBWSxFQUEwQixDQUFDO1FBQzNELHFCQUFnQixHQUE4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Q0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBa0IsRUFBRSxFQUFFLENBQy9DLElBQUksQ0FBQyxhQUFhLENBQUMsZ0JBQWdCLEVBQUUsQ0FDeEMsQ0FBQztJQUNOLENBQUM7OzhHQWhYUSxpQkFBaUI7a0dBQWpCLGlCQUFpQiwrY0FKZixDQUFDLGVBQWUsQ0FBQyxpS0F0Q2xCOzs7OztXQUtIOzJGQXFDRSxpQkFBaUI7a0JBNUM3QixTQUFTO21CQUFDO29CQUNQLFFBQVEsRUFBRSxjQUFjO29CQUN4QixRQUFRLEVBQUU7Ozs7O1dBS0g7b0JBQ1AsTUFBTSxFQUFFO3dCQUNKOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztTQTZCQztxQkFDSjtvQkFDRCxTQUFTLEVBQUUsQ0FBQyxlQUFlLENBQUM7b0JBQzVCLGVBQWUsRUFBRSx1QkFBdUIsQ0FBQyxNQUFNO29CQUMvQyxhQUFhLEVBQUUsaUJBQWlCLENBQUMsSUFBSTtpQkFDeEM7MkxBRVksT0FBTztzQkFBZixLQUFLO2dCQUNJLGFBQWE7c0JBQXRCLE1BQU07Z0JBQ0csS0FBSztzQkFBZCxNQUFNO2dCQUNHLE1BQU07c0JBQWYsTUFBTTtnQkFDRyxhQUFhO3NCQUF0QixNQUFNO2dCQUNHLGNBQWM7c0JBQXZCLE1BQU07Z0JBQ0csWUFBWTtzQkFBckIsTUFBTTtnQkFDRSxnQkFBZ0I7c0JBQXhCLEtBQUs7Z0JBQ0csTUFBTTtzQkFBZCxLQUFLO2dCQUU0QyxrQkFBa0I7c0JBQW5FLFNBQVM7dUJBQUMsbUJBQW1CLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFO2dCQUNQLFVBQVU7c0JBQWxELFdBQVc7dUJBQUMsMEJBQTBCO2dCQUNFLFVBQVU7c0JBQWxELFdBQVc7dUJBQUMsMEJBQTBCO2dCQUVELE9BQU87c0JBQTVDLFdBQVc7dUJBQUMsdUJBQXVCIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtcclxuICAgIENvbXBvbmVudCxcclxuICAgIE9uSW5pdCxcclxuICAgIEFmdGVyQ29udGVudEluaXQsXHJcbiAgICBPbkRlc3Ryb3ksXHJcbiAgICBFbGVtZW50UmVmLFxyXG4gICAgVmlld0NoaWxkLFxyXG4gICAgTmdab25lLFxyXG4gICAgSW5wdXQsXHJcbiAgICBPdXRwdXQsXHJcbiAgICBFdmVudEVtaXR0ZXIsXHJcbiAgICBDaGFuZ2VEZXRlY3Rpb25TdHJhdGVneSxcclxuICAgIEhvc3RCaW5kaW5nLFxyXG4gICAgVmlld0VuY2Fwc3VsYXRpb25cclxufSBmcm9tICdAYW5ndWxhci9jb3JlJztcclxuaW1wb3J0IHtcclxuICAgIE9ic2VydmFibGUsXHJcbiAgICBTdWJzY3JpcHRpb24sXHJcbiAgICBmcm9tRXZlbnQsXHJcbiAgICBDb25uZWN0YWJsZU9ic2VydmFibGVcclxufSBmcm9tICdyeGpzJztcclxuaW1wb3J0IHsgZGVib3VuY2VUaW1lLCBmaWx0ZXIsIHB1Ymxpc2ggfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XHJcblxyXG5pbXBvcnQgeyB1dGlscyB9IGZyb20gJy4vdXRpbHMvdXRpbHMnO1xyXG5pbXBvcnQgeyBHcmlkc3RlclNlcnZpY2UgfSBmcm9tICcuL2dyaWRzdGVyLnNlcnZpY2UnO1xyXG5pbXBvcnQgeyBJR3JpZHN0ZXJPcHRpb25zIH0gZnJvbSAnLi9JR3JpZHN0ZXJPcHRpb25zJztcclxuaW1wb3J0IHsgSUdyaWRzdGVyRHJhZ2dhYmxlT3B0aW9ucyB9IGZyb20gJy4vSUdyaWRzdGVyRHJhZ2dhYmxlT3B0aW9ucyc7XHJcbmltcG9ydCB7IEdyaWRzdGVyUHJvdG90eXBlU2VydmljZSB9IGZyb20gJy4vZ3JpZHN0ZXItcHJvdG90eXBlL2dyaWRzdGVyLXByb3RvdHlwZS5zZXJ2aWNlJztcclxuaW1wb3J0IHsgR3JpZHN0ZXJJdGVtUHJvdG90eXBlRGlyZWN0aXZlIH0gZnJvbSAnLi9ncmlkc3Rlci1wcm90b3R5cGUvZ3JpZHN0ZXItaXRlbS1wcm90b3R5cGUuZGlyZWN0aXZlJztcclxuaW1wb3J0IHsgR3JpZExpc3RJdGVtIH0gZnJvbSAnLi9ncmlkTGlzdC9HcmlkTGlzdEl0ZW0nO1xyXG5pbXBvcnQgeyBHcmlkc3Rlck9wdGlvbnMgfSBmcm9tICcuL0dyaWRzdGVyT3B0aW9ucyc7XHJcblxyXG5AQ29tcG9uZW50KHtcclxuICAgIHNlbGVjdG9yOiAnbmd4LWdyaWRzdGVyJyxcclxuICAgIHRlbXBsYXRlOiBgPGRpdiBjbGFzcz1cImdyaWRzdGVyLWNvbnRhaW5lclwiPlxyXG4gICAgICA8bmctY29udGVudD48L25nLWNvbnRlbnQ+XHJcbiAgICAgIDxkaXYgY2xhc3M9XCJwb3NpdGlvbi1oaWdobGlnaHRcIiBzdHlsZT1cImRpc3BsYXk6bm9uZTtcIiAjcG9zaXRpb25IaWdobGlnaHQ+XHJcbiAgICAgICAgPGRpdiBjbGFzcz1cImlubmVyXCI+PC9kaXY+XHJcbiAgICAgIDwvZGl2PlxyXG4gICAgPC9kaXY+YCxcclxuICAgIHN0eWxlczogW1xyXG4gICAgICAgIGBcclxuICAgICAgICAgICAgbmd4LWdyaWRzdGVyIHtcclxuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiByZWxhdGl2ZTtcclxuICAgICAgICAgICAgICAgIGRpc3BsYXk6IGJsb2NrO1xyXG4gICAgICAgICAgICAgICAgbGVmdDogMDtcclxuICAgICAgICAgICAgICAgIHdpZHRoOiAxMDAlO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBuZ3gtZ3JpZHN0ZXIuZ3JpZHN0ZXItLWRyYWdnaW5nIHtcclxuICAgICAgICAgICAgICAgIC1tb3otdXNlci1zZWxlY3Q6IG5vbmU7XHJcbiAgICAgICAgICAgICAgICAta2h0bWwtdXNlci1zZWxlY3Q6IG5vbmU7XHJcbiAgICAgICAgICAgICAgICAtd2Via2l0LXVzZXItc2VsZWN0OiBub25lO1xyXG4gICAgICAgICAgICAgICAgLW1zLXVzZXItc2VsZWN0OiBub25lO1xyXG4gICAgICAgICAgICAgICAgdXNlci1zZWxlY3Q6IG5vbmU7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIG5neC1ncmlkc3RlciAuZ3JpZHN0ZXItY29udGFpbmVyIHtcclxuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiByZWxhdGl2ZTtcclxuICAgICAgICAgICAgICAgIHdpZHRoOiAxMDAlO1xyXG4gICAgICAgICAgICAgICAgbGlzdC1zdHlsZTogbm9uZTtcclxuICAgICAgICAgICAgICAgIC13ZWJraXQtdHJhbnNpdGlvbjogd2lkdGggMC4ycywgaGVpZ2h0IDAuMnM7XHJcbiAgICAgICAgICAgICAgICB0cmFuc2l0aW9uOiB3aWR0aCAwLjJzLCBoZWlnaHQgMC4ycztcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgbmd4LWdyaWRzdGVyIC5wb3NpdGlvbi1oaWdobGlnaHQge1xyXG4gICAgICAgICAgICAgICAgZGlzcGxheTogYmxvY2s7XHJcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogYWJzb2x1dGU7XHJcbiAgICAgICAgICAgICAgICB6LWluZGV4OiAxO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgYFxyXG4gICAgXSxcclxuICAgIHByb3ZpZGVyczogW0dyaWRzdGVyU2VydmljZV0sXHJcbiAgICBjaGFuZ2VEZXRlY3Rpb246IENoYW5nZURldGVjdGlvblN0cmF0ZWd5Lk9uUHVzaCxcclxuICAgIGVuY2Fwc3VsYXRpb246IFZpZXdFbmNhcHN1bGF0aW9uLk5vbmVcclxufSlcclxuZXhwb3J0IGNsYXNzIEdyaWRzdGVyQ29tcG9uZW50IGltcGxlbWVudHMgT25Jbml0LCBBZnRlckNvbnRlbnRJbml0LCBPbkRlc3Ryb3kge1xyXG4gICAgQElucHV0KCkgb3B0aW9uczogSUdyaWRzdGVyT3B0aW9ucztcclxuICAgIEBPdXRwdXQoKSBvcHRpb25zQ2hhbmdlID0gbmV3IEV2ZW50RW1pdHRlcjxhbnk+KCk7XHJcbiAgICBAT3V0cHV0KCkgcmVhZHkgPSBuZXcgRXZlbnRFbWl0dGVyPGFueT4oKTtcclxuICAgIEBPdXRwdXQoKSByZWZsb3cgPSBuZXcgRXZlbnRFbWl0dGVyPGFueT4oKTtcclxuICAgIEBPdXRwdXQoKSBwcm90b3R5cGVEcm9wID0gbmV3IEV2ZW50RW1pdHRlcjx7IGl0ZW06IEdyaWRMaXN0SXRlbSB9PigpO1xyXG4gICAgQE91dHB1dCgpIHByb3RvdHlwZUVudGVyID0gbmV3IEV2ZW50RW1pdHRlcjx7IGl0ZW06IEdyaWRMaXN0SXRlbSB9PigpO1xyXG4gICAgQE91dHB1dCgpIHByb3RvdHlwZU91dCA9IG5ldyBFdmVudEVtaXR0ZXI8eyBpdGVtOiBHcmlkTGlzdEl0ZW0gfT4oKTtcclxuICAgIEBJbnB1dCgpIGRyYWdnYWJsZU9wdGlvbnM6IElHcmlkc3RlckRyYWdnYWJsZU9wdGlvbnMgPSB7fTtcclxuICAgIEBJbnB1dCgpIHBhcmVudDogR3JpZHN0ZXJDb21wb25lbnQ7XHJcblxyXG4gICAgQFZpZXdDaGlsZCgncG9zaXRpb25IaWdobGlnaHQnLCB7IHN0YXRpYzogdHJ1ZSB9KSAkcG9zaXRpb25IaWdobGlnaHQ7XHJcbiAgICBASG9zdEJpbmRpbmcoJ2NsYXNzLmdyaWRzdGVyLS1kcmFnZ2luZycpIGlzRHJhZ2dpbmcgPSBmYWxzZTtcclxuICAgIEBIb3N0QmluZGluZygnY2xhc3MuZ3JpZHN0ZXItLXJlc2l6aW5nJykgaXNSZXNpemluZyA9IGZhbHNlO1xyXG5cclxuICAgIEBIb3N0QmluZGluZygnY2xhc3MuZ3JpZHN0ZXItLXJlYWR5JykgaXNSZWFkeSA9IGZhbHNlO1xyXG4gICAgZ3JpZHN0ZXI6IEdyaWRzdGVyU2VydmljZTtcclxuICAgICRlbGVtZW50OiBIVE1MRWxlbWVudDtcclxuXHJcbiAgICBncmlkc3Rlck9wdGlvbnM6IEdyaWRzdGVyT3B0aW9ucztcclxuICAgIGlzUHJvdG90eXBlRW50ZXJlZCA9IGZhbHNlO1xyXG4gICAgcHJpdmF0ZSBpc0Rpc2FibGVkID0gZmFsc2U7XHJcbiAgICBwcml2YXRlIHN1YnNjcmlwdGlvbiA9IG5ldyBTdWJzY3JpcHRpb24oKTtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihcclxuICAgICAgICBwcml2YXRlIHpvbmU6IE5nWm9uZSxcclxuICAgICAgICBlbGVtZW50UmVmOiBFbGVtZW50UmVmLFxyXG4gICAgICAgIGdyaWRzdGVyOiBHcmlkc3RlclNlcnZpY2UsXHJcbiAgICAgICAgcHJpdmF0ZSBncmlkc3RlclByb3RvdHlwZTogR3JpZHN0ZXJQcm90b3R5cGVTZXJ2aWNlXHJcbiAgICApIHtcclxuICAgICAgICB0aGlzLmdyaWRzdGVyID0gZ3JpZHN0ZXI7XHJcbiAgICAgICAgdGhpcy4kZWxlbWVudCA9IGVsZW1lbnRSZWYubmF0aXZlRWxlbWVudDtcclxuICAgIH1cclxuXHJcbiAgICBuZ09uSW5pdCgpIHtcclxuICAgICAgICB0aGlzLmdyaWRzdGVyT3B0aW9ucyA9IG5ldyBHcmlkc3Rlck9wdGlvbnModGhpcy5vcHRpb25zLCB0aGlzLiRlbGVtZW50KTtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMub3B0aW9ucy51c2VDU1NUcmFuc2Zvcm1zKSB7XHJcbiAgICAgICAgICAgIHRoaXMuJGVsZW1lbnQuY2xhc3NMaXN0LmFkZCgnY3NzLXRyYW5zZm9ybScpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5zdWJzY3JpcHRpb24uYWRkKFxyXG4gICAgICAgICAgICB0aGlzLmdyaWRzdGVyT3B0aW9ucy5jaGFuZ2Uuc3Vic2NyaWJlKG9wdGlvbnMgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5ncmlkc3Rlci5vcHRpb25zID0gb3B0aW9ucztcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmdyaWRzdGVyLmdyaWRMaXN0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5ncmlkc3Rlci5ncmlkTGlzdC5vcHRpb25zID0gb3B0aW9ucztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4gdGhpcy5vcHRpb25zQ2hhbmdlLmVtaXQob3B0aW9ucykpO1xyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICk7XHJcblxyXG4gICAgICAgIHRoaXMuZ3JpZHN0ZXIuaW5pdCh0aGlzKTtcclxuXHJcbiAgICAgICAgdGhpcy5zdWJzY3JpcHRpb24uYWRkKFxyXG4gICAgICAgICAgICBmcm9tRXZlbnQod2luZG93LCAncmVzaXplJylcclxuICAgICAgICAgICAgICAgIC5waXBlKFxyXG4gICAgICAgICAgICAgICAgICAgIGRlYm91bmNlVGltZSh0aGlzLmdyaWRzdGVyLm9wdGlvbnMucmVzcG9uc2l2ZURlYm91bmNlIHx8IDApLFxyXG4gICAgICAgICAgICAgICAgICAgIGZpbHRlcigoKSA9PiB0aGlzLmdyaWRzdGVyLm9wdGlvbnMucmVzcG9uc2l2ZVZpZXcpXHJcbiAgICAgICAgICAgICAgICApXHJcbiAgICAgICAgICAgICAgICAuc3Vic2NyaWJlKCgpID0+IHRoaXMucmVsb2FkKCkpXHJcbiAgICAgICAgKTtcclxuXHJcbiAgICAgICAgdGhpcy56b25lLnJ1bk91dHNpZGVBbmd1bGFyKCgpID0+IHtcclxuICAgICAgICAgICAgdGhpcy5zdWJzY3JpcHRpb24uYWRkKFxyXG4gICAgICAgICAgICAgICAgZnJvbUV2ZW50KGRvY3VtZW50LCAnc2Nyb2xsJywgeyBwYXNzaXZlOiB0cnVlIH0pLnN1YnNjcmliZSgoKSA9PlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlR3JpZHN0ZXJFbGVtZW50RGF0YSgpXHJcbiAgICAgICAgICAgICAgICApXHJcbiAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgIGNvbnN0IHNjcm9sbGFibGVDb250YWluZXIgPSB1dGlscy5nZXRTY3JvbGxhYmxlQ29udGFpbmVyKHRoaXMuJGVsZW1lbnQpO1xyXG4gICAgICAgICAgICBpZiAoc2Nyb2xsYWJsZUNvbnRhaW5lcikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zdWJzY3JpcHRpb24uYWRkKFxyXG4gICAgICAgICAgICAgICAgICAgIGZyb21FdmVudChzY3JvbGxhYmxlQ29udGFpbmVyLCAnc2Nyb2xsJywgeyBwYXNzaXZlOiB0cnVlIH0pXHJcbiAgICAgICAgICAgICAgICAgICAgLnN1YnNjcmliZSgoKSA9PlxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZUdyaWRzdGVyRWxlbWVudERhdGEoKVxyXG4gICAgICAgICAgICAgICAgICAgIClcclxuICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBuZ0FmdGVyQ29udGVudEluaXQoKSB7XHJcbiAgICAgICAgdGhpcy5ncmlkc3Rlci5zdGFydCgpO1xyXG5cclxuICAgICAgICB0aGlzLnVwZGF0ZUdyaWRzdGVyRWxlbWVudERhdGEoKTtcclxuXHJcbiAgICAgICAgdGhpcy5jb25uZWN0R3JpZHN0ZXJQcm90b3R5cGUoKTtcclxuXHJcbiAgICAgICAgdGhpcy5ncmlkc3Rlci4kcG9zaXRpb25IaWdobGlnaHQgPSB0aGlzLiRwb3NpdGlvbkhpZ2hsaWdodC5uYXRpdmVFbGVtZW50O1xyXG4gICAgfVxyXG5cclxuICAgIG5nT25EZXN0cm95KCkge1xyXG4gICAgICAgIHRoaXMuc3Vic2NyaXB0aW9uLnVuc3Vic2NyaWJlKCk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBDaGFuZ2UgZ3JpZHN0ZXIgY29uZmlnIG9wdGlvbiBhbmQgcmVidWlsZFxyXG4gICAgICogQHBhcmFtIHN0cmluZyBuYW1lXHJcbiAgICAgKiBAcGFyYW0gYW55IHZhbHVlXHJcbiAgICAgKiBAcmV0dXJuIEdyaWRzdGVyQ29tcG9uZW50XHJcbiAgICAgKi9cclxuICAgIHNldE9wdGlvbihuYW1lOiBzdHJpbmcsIHZhbHVlOiBhbnkpIHtcclxuICAgICAgICBpZiAobmFtZSA9PT0gJ2RyYWdBbmREcm9wJykge1xyXG4gICAgICAgICAgICBpZiAodmFsdWUpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZW5hYmxlRHJhZ2dhYmxlKCk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmRpc2FibGVEcmFnZ2FibGUoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAobmFtZSA9PT0gJ3Jlc2l6YWJsZScpIHtcclxuICAgICAgICAgICAgaWYgKHZhbHVlKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmVuYWJsZVJlc2l6YWJsZSgpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5kaXNhYmxlUmVzaXphYmxlKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKG5hbWUgPT09ICdsYW5lcycpIHtcclxuICAgICAgICAgICAgdGhpcy5ncmlkc3Rlci5vcHRpb25zLmxhbmVzID0gdmFsdWU7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmdyaWRzdGVyLmdyaWRMaXN0LmZpeEl0ZW1zUG9zaXRpb25zKHRoaXMuZ3JpZHN0ZXIub3B0aW9ucyk7XHJcbiAgICAgICAgICAgIHRoaXMucmVmbG93R3JpZHN0ZXIoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKG5hbWUgPT09ICdkaXJlY3Rpb24nKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZ3JpZHN0ZXIub3B0aW9ucy5kaXJlY3Rpb24gPSB2YWx1ZTtcclxuICAgICAgICAgICAgdGhpcy5ncmlkc3Rlci5ncmlkTGlzdC5wdWxsSXRlbXNUb0xlZnQoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKG5hbWUgPT09ICd3aWR0aEhlaWdodFJhdGlvJykge1xyXG4gICAgICAgICAgICB0aGlzLmdyaWRzdGVyLm9wdGlvbnMud2lkdGhIZWlnaHRSYXRpbyA9IHBhcnNlRmxvYXQodmFsdWUgfHwgMSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChuYW1lID09PSAncmVzcG9uc2l2ZVZpZXcnKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZ3JpZHN0ZXIub3B0aW9ucy5yZXNwb25zaXZlVmlldyA9ICEhdmFsdWU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuZ3JpZHN0ZXIuZ3JpZExpc3Quc2V0T3B0aW9uKG5hbWUsIHZhbHVlKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgcmVsb2FkKCkge1xyXG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLmdyaWRzdGVyLmZpeEl0ZW1zUG9zaXRpb25zKCk7XHJcbiAgICAgICAgICAgIHRoaXMucmVmbG93R3JpZHN0ZXIoKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgcmVmbG93R3JpZHN0ZXIoaXNJbml0ID0gZmFsc2UpIHtcclxuICAgICAgICB0aGlzLmdyaWRzdGVyLnJlZmxvdygpO1xyXG4gICAgICAgIHRoaXMucmVmbG93LmVtaXQoe1xyXG4gICAgICAgICAgICBpc0luaXQ6IGlzSW5pdCxcclxuICAgICAgICAgICAgZ3JpZHN0ZXJDb21wb25lbnQ6IHRoaXNcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICB1cGRhdGVHcmlkc3RlckVsZW1lbnREYXRhKCkge1xyXG4gICAgICAgIHRoaXMuZ3JpZHN0ZXIuZ3JpZHN0ZXJTY3JvbGxEYXRhID0gdGhpcy5nZXRTY3JvbGxQb3NpdGlvbkZyb21QYXJlbnRzKFxyXG4gICAgICAgICAgICB0aGlzLiRlbGVtZW50XHJcbiAgICAgICAgKTtcclxuICAgICAgICB0aGlzLmdyaWRzdGVyLmdyaWRzdGVyUmVjdCA9IHRoaXMuJGVsZW1lbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XHJcbiAgICB9XHJcblxyXG4gICAgc2V0UmVhZHkoKSB7XHJcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiAodGhpcy5pc1JlYWR5ID0gdHJ1ZSkpO1xyXG4gICAgICAgIHRoaXMucmVhZHkuZW1pdCgpO1xyXG4gICAgfVxyXG5cclxuICAgIGFkanVzdEl0ZW1zSGVpZ2h0VG9Db250ZW50KFxyXG4gICAgICAgIHNjcm9sbGFibGVJdGVtRWxlbWVudFNlbGVjdG9yOiBzdHJpbmcgPSAnLmdyaWRzdGVyLWl0ZW0taW5uZXInXHJcbiAgICApIHtcclxuICAgICAgICB0aGlzLmdyaWRzdGVyLml0ZW1zXHJcbiAgICAgICAgICAgIC8vIGNvbnZlcnQgZWFjaCBpdGVtIHRvIG9iamVjdCB3aXRoIGluZm9ybWF0aW9uIGFib3V0IGNvbnRlbnQgaGVpZ2h0IGFuZCBzY3JvbGwgaGVpZ2h0XHJcbiAgICAgICAgICAgIC5tYXAoKGl0ZW06IEdyaWRMaXN0SXRlbSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgY29uc3Qgc2Nyb2xsRWwgPSBpdGVtLiRlbGVtZW50LnF1ZXJ5U2VsZWN0b3IoXHJcbiAgICAgICAgICAgICAgICAgICAgc2Nyb2xsYWJsZUl0ZW1FbGVtZW50U2VsZWN0b3JcclxuICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBjb250ZW50RWwgPSBzY3JvbGxFbC5sYXN0RWxlbWVudENoaWxkO1xyXG4gICAgICAgICAgICAgICAgY29uc3Qgc2Nyb2xsRWxEaXN0YW5jZSA9IHV0aWxzLmdldFJlbGF0aXZlQ29vcmRpbmF0ZXMoXHJcbiAgICAgICAgICAgICAgICAgICAgc2Nyb2xsRWwsXHJcbiAgICAgICAgICAgICAgICAgICAgaXRlbS4kZWxlbWVudFxyXG4gICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHNjcm9sbEVsUmVjdCA9IHNjcm9sbEVsLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgY29udGVudFJlY3QgPSBjb250ZW50RWwuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XHJcblxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgICAgICBpdGVtLFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnRIZWlnaHQ6IGNvbnRlbnRSZWN0LmJvdHRvbSAtIHNjcm9sbEVsUmVjdC50b3AsXHJcbiAgICAgICAgICAgICAgICAgICAgc2Nyb2xsRWxEaXN0YW5jZVxyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgLy8gY2FsY3VsYXRlIHJlcXVpcmVkIGhlaWdodCBpbiBsYW5lcyBhbW91bnQgYW5kIHVwZGF0ZSBpdGVtIFwiaFwiXHJcbiAgICAgICAgICAgIC5mb3JFYWNoKGRhdGEgPT4ge1xyXG4gICAgICAgICAgICAgICAgZGF0YS5pdGVtLmggPSBNYXRoLmNlaWwoPGFueT4oXHJcbiAgICAgICAgICAgICAgICAgICAgKGRhdGEuY29udGVudEhlaWdodCAvXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICh0aGlzLmdyaWRzdGVyLmNlbGxIZWlnaHQgLSBkYXRhLnNjcm9sbEVsRGlzdGFuY2UudG9wKSlcclxuICAgICAgICAgICAgICAgICkpO1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgdGhpcy5ncmlkc3Rlci5maXhJdGVtc1Bvc2l0aW9ucygpO1xyXG4gICAgICAgIHRoaXMuZ3JpZHN0ZXIucmVmbG93KCk7XHJcbiAgICB9XHJcblxyXG4gICAgZGlzYWJsZShpdGVtKSB7XHJcbiAgICAgICAgY29uc3QgaXRlbUlkeCA9IHRoaXMuZ3JpZHN0ZXIuaXRlbXMuaW5kZXhPZihpdGVtLml0ZW1Db21wb25lbnQpO1xyXG5cclxuICAgICAgICB0aGlzLmlzRGlzYWJsZWQgPSB0cnVlO1xyXG4gICAgICAgIGlmIChpdGVtSWR4ID49IDApIHtcclxuICAgICAgICAgICAgZGVsZXRlIHRoaXMuZ3JpZHN0ZXIuaXRlbXNbXHJcbiAgICAgICAgICAgICAgICB0aGlzLmdyaWRzdGVyLml0ZW1zLmluZGV4T2YoaXRlbS5pdGVtQ29tcG9uZW50KVxyXG4gICAgICAgICAgICBdO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLmdyaWRzdGVyLm9uRHJhZ091dChpdGVtKTtcclxuICAgIH1cclxuXHJcbiAgICBlbmFibGUoKSB7XHJcbiAgICAgICAgdGhpcy5pc0Rpc2FibGVkID0gZmFsc2U7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBnZXRTY3JvbGxQb3NpdGlvbkZyb21QYXJlbnRzKFxyXG4gICAgICAgIGVsZW1lbnQ6IEVsZW1lbnQsXHJcbiAgICAgICAgZGF0YSA9IHsgc2Nyb2xsVG9wOiAwLCBzY3JvbGxMZWZ0OiAwIH1cclxuICAgICk6IHsgc2Nyb2xsVG9wOiBudW1iZXI7IHNjcm9sbExlZnQ6IG51bWJlciB9IHtcclxuICAgICAgICBpZiAoZWxlbWVudC5wYXJlbnRFbGVtZW50ICYmIGVsZW1lbnQucGFyZW50RWxlbWVudCAhPT0gZG9jdW1lbnQuYm9keSkge1xyXG4gICAgICAgICAgICBkYXRhLnNjcm9sbFRvcCArPSBlbGVtZW50LnBhcmVudEVsZW1lbnQuc2Nyb2xsVG9wO1xyXG4gICAgICAgICAgICBkYXRhLnNjcm9sbExlZnQgKz0gZWxlbWVudC5wYXJlbnRFbGVtZW50LnNjcm9sbExlZnQ7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRTY3JvbGxQb3NpdGlvbkZyb21QYXJlbnRzKFxyXG4gICAgICAgICAgICAgICAgZWxlbWVudC5wYXJlbnRFbGVtZW50LFxyXG4gICAgICAgICAgICAgICAgZGF0YVxyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgc2Nyb2xsVG9wOiBkYXRhLnNjcm9sbFRvcCxcclxuICAgICAgICAgICAgc2Nyb2xsTGVmdDogZGF0YS5zY3JvbGxMZWZ0XHJcbiAgICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIENvbm5lY3QgZ3JpZHN0ZXIgcHJvdG90eXBlIGl0ZW0gdG8gZ3JpZHN0ZXIgZHJhZ2dpbmcgaG9va3MgKG9uU3RhcnQsIG9uRHJhZywgb25TdG9wKS5cclxuICAgICAqL1xyXG4gICAgcHJpdmF0ZSBjb25uZWN0R3JpZHN0ZXJQcm90b3R5cGUoKSB7XHJcbiAgICAgICAgdGhpcy5ncmlkc3RlclByb3RvdHlwZS5vYnNlcnZlRHJvcE91dCh0aGlzLmdyaWRzdGVyKS5zdWJzY3JpYmUoKTtcclxuXHJcbiAgICAgICAgY29uc3QgZHJvcE92ZXJPYnNlcnZhYmxlID0gPENvbm5lY3RhYmxlT2JzZXJ2YWJsZTxhbnk+PihcclxuICAgICAgICAgICAgdGhpcy5ncmlkc3RlclByb3RvdHlwZVxyXG4gICAgICAgICAgICAgICAgLm9ic2VydmVEcm9wT3Zlcih0aGlzLmdyaWRzdGVyKVxyXG4gICAgICAgICAgICAgICAgLnBpcGUocHVibGlzaCgpKVxyXG4gICAgICAgICk7XHJcblxyXG4gICAgICAgIGNvbnN0IGRyYWdPYnNlcnZhYmxlID0gdGhpcy5ncmlkc3RlclByb3RvdHlwZS5vYnNlcnZlRHJhZ092ZXIoXHJcbiAgICAgICAgICAgIHRoaXMuZ3JpZHN0ZXJcclxuICAgICAgICApO1xyXG5cclxuICAgICAgICBkcmFnT2JzZXJ2YWJsZS5kcmFnT3ZlclxyXG4gICAgICAgICAgICAucGlwZShmaWx0ZXIoKCkgPT4gIXRoaXMuaXNEaXNhYmxlZCkpXHJcbiAgICAgICAgICAgIC5zdWJzY3JpYmUoKHByb3RvdHlwZTogR3JpZHN0ZXJJdGVtUHJvdG90eXBlRGlyZWN0aXZlKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuaXNQcm90b3R5cGVFbnRlcmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgdGhpcy5ncmlkc3Rlci5vbkRyYWcocHJvdG90eXBlLml0ZW0pO1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgZHJhZ09ic2VydmFibGUuZHJhZ0VudGVyXHJcbiAgICAgICAgICAgIC5waXBlKGZpbHRlcigoKSA9PiAhdGhpcy5pc0Rpc2FibGVkKSlcclxuICAgICAgICAgICAgLnN1YnNjcmliZSgocHJvdG90eXBlOiBHcmlkc3Rlckl0ZW1Qcm90b3R5cGVEaXJlY3RpdmUpID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMuaXNQcm90b3R5cGVFbnRlcmVkID0gdHJ1ZTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5ncmlkc3Rlci5pdGVtcy5pbmRleE9mKHByb3RvdHlwZS5pdGVtKSA8IDApIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmdyaWRzdGVyLml0ZW1zLnB1c2gocHJvdG90eXBlLml0ZW0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgdGhpcy5ncmlkc3Rlci5vblN0YXJ0KHByb3RvdHlwZS5pdGVtKTtcclxuICAgICAgICAgICAgICAgIHByb3RvdHlwZS5zZXREcmFnQ29udGV4dEdyaWRzdGVyKHRoaXMuZ3JpZHN0ZXIpO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLnBhcmVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucGFyZW50LmRpc2FibGUocHJvdG90eXBlLml0ZW0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgdGhpcy5wcm90b3R5cGVFbnRlci5lbWl0KHsgaXRlbTogcHJvdG90eXBlLml0ZW0gfSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICBkcmFnT2JzZXJ2YWJsZS5kcmFnT3V0XHJcbiAgICAgICAgICAgIC5waXBlKGZpbHRlcigoKSA9PiAhdGhpcy5pc0Rpc2FibGVkKSlcclxuICAgICAgICAgICAgLnN1YnNjcmliZSgocHJvdG90eXBlOiBHcmlkc3Rlckl0ZW1Qcm90b3R5cGVEaXJlY3RpdmUpID0+IHtcclxuICAgICAgICAgICAgICAgIGlmICghdGhpcy5pc1Byb3RvdHlwZUVudGVyZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB0aGlzLmdyaWRzdGVyLm9uRHJhZ091dChwcm90b3R5cGUuaXRlbSk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmlzUHJvdG90eXBlRW50ZXJlZCA9IGZhbHNlO1xyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMucHJvdG90eXBlT3V0LmVtaXQoeyBpdGVtOiBwcm90b3R5cGUuaXRlbSB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5wYXJlbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnBhcmVudC5lbmFibGUoKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wYXJlbnQuaXNQcm90b3R5cGVFbnRlcmVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGFyZW50LmdyaWRzdGVyLml0ZW1zLmluZGV4T2YocHJvdG90eXBlLml0ZW0pIDwgMFxyXG4gICAgICAgICAgICAgICAgICAgICkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBhcmVudC5ncmlkc3Rlci5pdGVtcy5wdXNoKHByb3RvdHlwZS5pdGVtKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wYXJlbnQuZ3JpZHN0ZXIub25TdGFydChwcm90b3R5cGUuaXRlbSk7XHJcbiAgICAgICAgICAgICAgICAgICAgcHJvdG90eXBlLnNldERyYWdDb250ZXh0R3JpZHN0ZXIodGhpcy5wYXJlbnQuZ3JpZHN0ZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIHRpbWVvdXQgaXMgbmVlZGVkIHRvIGJlIHN1cmUgdGhhdCBcImVudGVyXCIgZXZlbnQgaXMgZmlyZWQgYWZ0ZXIgXCJvdXRcIlxyXG4gICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBhcmVudC5wcm90b3R5cGVFbnRlci5lbWl0KHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW06IHByb3RvdHlwZS5pdGVtXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm90b3R5cGUub25FbnRlcih0aGlzLnBhcmVudC5ncmlkc3Rlcik7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICBkcm9wT3Zlck9ic2VydmFibGVcclxuICAgICAgICAgICAgLnBpcGUoZmlsdGVyKCgpID0+ICF0aGlzLmlzRGlzYWJsZWQpKVxyXG4gICAgICAgICAgICAuc3Vic2NyaWJlKGRhdGEgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLmlzUHJvdG90eXBlRW50ZXJlZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLmdyaWRzdGVyLm9uU3RvcChkYXRhLml0ZW0uaXRlbSk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmdyaWRzdGVyLnJlbW92ZUl0ZW0oZGF0YS5pdGVtLml0ZW0pO1xyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMuaXNQcm90b3R5cGVFbnRlcmVkID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5wYXJlbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnBhcmVudC5lbmFibGUoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHRoaXMucHJvdG90eXBlRHJvcC5lbWl0KHsgaXRlbTogZGF0YS5pdGVtLml0ZW0gfSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICBkcm9wT3Zlck9ic2VydmFibGUuY29ubmVjdCgpO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZW5hYmxlRHJhZ2dhYmxlKCkge1xyXG4gICAgICAgIHRoaXMuZ3JpZHN0ZXIub3B0aW9ucy5kcmFnQW5kRHJvcCA9IHRydWU7XHJcblxyXG4gICAgICAgIHRoaXMuZ3JpZHN0ZXIuaXRlbXNcclxuICAgICAgICAgICAgLmZpbHRlcihcclxuICAgICAgICAgICAgICAgIGl0ZW0gPT4gaXRlbS5pdGVtQ29tcG9uZW50ICYmIGl0ZW0uaXRlbUNvbXBvbmVudC5kcmFnQW5kRHJvcFxyXG4gICAgICAgICAgICApXHJcbiAgICAgICAgICAgIC5mb3JFYWNoKChpdGVtOiBHcmlkTGlzdEl0ZW0pID0+XHJcbiAgICAgICAgICAgICAgICBpdGVtLml0ZW1Db21wb25lbnQuZW5hYmxlRHJhZ0Ryb3AoKVxyXG4gICAgICAgICAgICApO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZGlzYWJsZURyYWdnYWJsZSgpIHtcclxuICAgICAgICB0aGlzLmdyaWRzdGVyLm9wdGlvbnMuZHJhZ0FuZERyb3AgPSBmYWxzZTtcclxuXHJcbiAgICAgICAgdGhpcy5ncmlkc3Rlci5pdGVtc1xyXG4gICAgICAgICAgICAuZmlsdGVyKGl0ZW0gPT4gaXRlbS5pdGVtQ29tcG9uZW50KVxyXG4gICAgICAgICAgICAuZm9yRWFjaCgoaXRlbTogR3JpZExpc3RJdGVtKSA9PlxyXG4gICAgICAgICAgICAgICAgaXRlbS5pdGVtQ29tcG9uZW50LmRpc2FibGVEcmFnZ2FibGUoKVxyXG4gICAgICAgICAgICApO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZW5hYmxlUmVzaXphYmxlKCkge1xyXG4gICAgICAgIHRoaXMuZ3JpZHN0ZXIub3B0aW9ucy5yZXNpemFibGUgPSB0cnVlO1xyXG5cclxuICAgICAgICB0aGlzLmdyaWRzdGVyLml0ZW1zXHJcbiAgICAgICAgICAgIC5maWx0ZXIoaXRlbSA9PiBpdGVtLml0ZW1Db21wb25lbnQgJiYgaXRlbS5pdGVtQ29tcG9uZW50LnJlc2l6YWJsZSlcclxuICAgICAgICAgICAgLmZvckVhY2goKGl0ZW06IEdyaWRMaXN0SXRlbSkgPT5cclxuICAgICAgICAgICAgICAgIGl0ZW0uaXRlbUNvbXBvbmVudC5lbmFibGVSZXNpemFibGUoKVxyXG4gICAgICAgICAgICApO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZGlzYWJsZVJlc2l6YWJsZSgpIHtcclxuICAgICAgICB0aGlzLmdyaWRzdGVyLm9wdGlvbnMucmVzaXphYmxlID0gZmFsc2U7XHJcblxyXG4gICAgICAgIHRoaXMuZ3JpZHN0ZXIuaXRlbXMuZm9yRWFjaCgoaXRlbTogR3JpZExpc3RJdGVtKSA9PlxyXG4gICAgICAgICAgICBpdGVtLml0ZW1Db21wb25lbnQuZGlzYWJsZVJlc2l6YWJsZSgpXHJcbiAgICAgICAgKTtcclxuICAgIH1cclxufVxyXG4iXX0=