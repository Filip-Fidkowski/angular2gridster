import { Directive, Input, Output, EventEmitter } from '@angular/core';
import { fromEvent } from 'rxjs';
import { GridListItem } from '../gridList/GridListItem';
import { Draggable } from '../utils/draggable';
import { utils } from '../utils/utils';
import * as i0 from "@angular/core";
import * as i1 from "./gridster-prototype.service";
export class GridsterItemPrototypeDirective {
    constructor(zone, elementRef, gridsterPrototype) {
        this.zone = zone;
        this.elementRef = elementRef;
        this.gridsterPrototype = gridsterPrototype;
        this.drop = new EventEmitter();
        this.start = new EventEmitter();
        this.cancel = new EventEmitter();
        this.enter = new EventEmitter();
        this.out = new EventEmitter();
        this.config = {};
        this.x = 0;
        this.y = 0;
        this.autoSize = false;
        this.isDragging = false;
        this.subscribtions = [];
        this.item = (new GridListItem()).setFromGridsterItemPrototype(this);
    }
    // must be set to true because of item dragAndDrop configuration
    get dragAndDrop() {
        return true;
    }
    get gridster() {
        return this.dragContextGridster;
    }
    ngOnInit() {
        this.wSm = this.wSm || this.w;
        this.hSm = this.hSm || this.h;
        this.wMd = this.wMd || this.w;
        this.hMd = this.hMd || this.h;
        this.wLg = this.wLg || this.w;
        this.hLg = this.hLg || this.h;
        this.wXl = this.wXl || this.w;
        this.hXl = this.hXl || this.h;
        this.zone.runOutsideAngular(() => {
            this.enableDragDrop();
        });
    }
    ngOnDestroy() {
        this.subscribtions.forEach((sub) => {
            sub.unsubscribe();
        });
    }
    onDrop(gridster) {
        if (!this.config.helper) {
            this.$element.parentNode.removeChild(this.$element);
        }
        this.drop.emit({
            item: this.item,
            gridster: gridster
        });
    }
    onCancel() {
        this.cancel.emit({ item: this.item });
    }
    onEnter(gridster) {
        this.enter.emit({
            item: this.item,
            gridster: gridster
        });
    }
    onOver(gridster) { }
    onOut(gridster) {
        this.out.emit({
            item: this.item,
            gridster: gridster
        });
    }
    getPositionToGridster(gridster) {
        const relativeContainerCoords = this.getContainerCoordsToGridster(gridster);
        return {
            y: this.positionY - relativeContainerCoords.top,
            x: this.positionX - relativeContainerCoords.left
        };
    }
    setDragContextGridster(gridster) {
        this.dragContextGridster = gridster;
    }
    getContainerCoordsToGridster(gridster) {
        return {
            left: gridster.gridsterRect.left - this.parentRect.left,
            top: gridster.gridsterRect.top - this.parentRect.top
        };
    }
    enableDragDrop() {
        let cursorToElementPosition;
        const draggable = new Draggable(this.elementRef.nativeElement);
        const dragStartSub = draggable.dragStart
            .subscribe((event) => {
            this.zone.run(() => {
                this.$element = this.provideDragElement();
                this.containerRectange = this.$element.parentElement.getBoundingClientRect();
                this.updateParentElementData();
                this.onStart(event);
                cursorToElementPosition = event.getRelativeCoordinates(this.$element);
            });
        });
        const dragSub = draggable.dragMove
            .subscribe((event) => {
            this.setElementPosition(this.$element, {
                x: event.clientX - cursorToElementPosition.x - this.parentRect.left,
                y: event.clientY - cursorToElementPosition.y - this.parentRect.top
            });
            this.onDrag(event);
        });
        const dragStopSub = draggable.dragStop
            .subscribe((event) => {
            this.zone.run(() => {
                this.onStop(event);
                this.$element = null;
            });
        });
        const scrollSub = fromEvent(document, 'scroll')
            .subscribe(() => {
            if (this.$element) {
                this.updateParentElementData();
            }
        });
        this.subscribtions = this.subscribtions.concat([dragStartSub, dragSub, dragStopSub, scrollSub]);
    }
    setElementPosition(element, position) {
        this.positionX = position.x;
        this.positionY = position.y;
        utils.setCssElementPosition(element, position);
    }
    updateParentElementData() {
        this.parentRect = this.$element.parentElement.getBoundingClientRect();
        this.parentOffset = {
            left: this.$element.parentElement.offsetLeft,
            top: this.$element.parentElement.offsetTop
        };
    }
    onStart(event) {
        this.isDragging = true;
        this.$element.style.pointerEvents = 'none';
        this.$element.style.position = 'absolute';
        this.gridsterPrototype.dragItemStart(this, event);
        this.start.emit({ item: this.item });
    }
    onDrag(event) {
        this.gridsterPrototype.updatePrototypePosition(this, event);
    }
    onStop(event) {
        this.gridsterPrototype.dragItemStop(this, event);
        this.isDragging = false;
        this.$element.style.pointerEvents = 'auto';
        this.$element.style.position = '';
        utils.resetCSSElementPosition(this.$element);
        if (this.config.helper) {
            this.$element.parentNode.removeChild(this.$element);
        }
    }
    provideDragElement() {
        let dragElement = this.elementRef.nativeElement;
        if (this.config.helper) {
            dragElement = (dragElement).cloneNode(true);
            document.body.appendChild(this.fixStylesForBodyHelper(dragElement));
        }
        else {
            this.fixStylesForRelativeElement(dragElement);
        }
        return dragElement;
    }
    fixStylesForRelativeElement(el) {
        if (window.getComputedStyle(el).position === 'absolute') {
            return el;
        }
        const rect = this.elementRef.nativeElement.getBoundingClientRect();
        this.containerRectange = el.parentElement.getBoundingClientRect();
        el.style.position = 'absolute';
        this.setElementPosition(el, {
            x: rect.left - this.containerRectange.left,
            y: rect.top - this.containerRectange.top
        });
        return el;
    }
    /**
     * When element is cloned and append to body it should have position absolute and coords set by original
     * relative prototype element position.
     */
    fixStylesForBodyHelper(el) {
        const bodyRect = document.body.getBoundingClientRect();
        const rect = this.elementRef.nativeElement.getBoundingClientRect();
        el.style.position = 'absolute';
        this.setElementPosition(el, {
            x: rect.left - bodyRect.left,
            y: rect.top - bodyRect.top
        });
        return el;
    }
}
GridsterItemPrototypeDirective.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "13.1.1", ngImport: i0, type: GridsterItemPrototypeDirective, deps: [{ token: i0.NgZone }, { token: i0.ElementRef }, { token: i1.GridsterPrototypeService }], target: i0.ɵɵFactoryTarget.Directive });
GridsterItemPrototypeDirective.ɵdir = i0.ɵɵngDeclareDirective({ minVersion: "12.0.0", version: "13.1.1", type: GridsterItemPrototypeDirective, selector: "[ngxGridsterItemPrototype]", inputs: { data: "data", config: "config", w: "w", wSm: "wSm", wMd: "wMd", wLg: "wLg", wXl: "wXl", h: "h", hSm: "hSm", hMd: "hMd", hLg: "hLg", hXl: "hXl" }, outputs: { drop: "drop", start: "start", cancel: "cancel", enter: "enter", out: "out" }, ngImport: i0 });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "13.1.1", ngImport: i0, type: GridsterItemPrototypeDirective, decorators: [{
            type: Directive,
            args: [{
                    selector: '[ngxGridsterItemPrototype]'
                }]
        }], ctorParameters: function () { return [{ type: i0.NgZone }, { type: i0.ElementRef }, { type: i1.GridsterPrototypeService }]; }, propDecorators: { drop: [{
                type: Output
            }], start: [{
                type: Output
            }], cancel: [{
                type: Output
            }], enter: [{
                type: Output
            }], out: [{
                type: Output
            }], data: [{
                type: Input
            }], config: [{
                type: Input
            }], w: [{
                type: Input
            }], wSm: [{
                type: Input
            }], wMd: [{
                type: Input
            }], wLg: [{
                type: Input
            }], wXl: [{
                type: Input
            }], h: [{
                type: Input
            }], hSm: [{
                type: Input
            }], hMd: [{
                type: Input
            }], hLg: [{
                type: Input
            }], hXl: [{
                type: Input
            }] } });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3JpZHN0ZXItaXRlbS1wcm90b3R5cGUuZGlyZWN0aXZlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vcHJvamVjdHMvYW5ndWxhcjJncmlkc3Rlci9zcmMvbGliL2dyaWRzdGVyLXByb3RvdHlwZS9ncmlkc3Rlci1pdGVtLXByb3RvdHlwZS5kaXJlY3RpdmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLFNBQVMsRUFBYyxLQUFLLEVBQUUsTUFBTSxFQUFlLFlBQVksRUFDN0QsTUFBTSxlQUFlLENBQUM7QUFDakMsT0FBTyxFQUE0QixTQUFTLEVBQUUsTUFBTSxNQUFNLENBQUM7QUFHM0QsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBR3hELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUMvQyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sZ0JBQWdCLENBQUM7OztBQUt2QyxNQUFNLE9BQU8sOEJBQThCO0lBNkR2QyxZQUFvQixJQUFZLEVBQ1osVUFBc0IsRUFDdEIsaUJBQTJDO1FBRjNDLFNBQUksR0FBSixJQUFJLENBQVE7UUFDWixlQUFVLEdBQVYsVUFBVSxDQUFZO1FBQ3RCLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBMEI7UUE5RHJELFNBQUksR0FBRyxJQUFJLFlBQVksRUFBRSxDQUFDO1FBQzFCLFVBQUssR0FBRyxJQUFJLFlBQVksRUFBRSxDQUFDO1FBQzNCLFdBQU0sR0FBRyxJQUFJLFlBQVksRUFBRSxDQUFDO1FBQzVCLFVBQUssR0FBRyxJQUFJLFlBQVksRUFBRSxDQUFDO1FBQzNCLFFBQUcsR0FBRyxJQUFJLFlBQVksRUFBRSxDQUFDO1FBRzFCLFdBQU0sR0FBUSxFQUFFLENBQUM7UUFFbkIsTUFBQyxHQUFHLENBQUMsQ0FBQztRQUNOLE1BQUMsR0FBRyxDQUFDLENBQUM7UUFlYixhQUFRLEdBQUcsS0FBSyxDQUFDO1FBY2pCLGVB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LEtBQUs7Z0JBQ0csTUFBTTtzQkFBZCxLQUFLO2dCQUlHLENBQUM7c0JBQVQsS0FBSztnQkFDRyxHQUFHO3NCQUFYLEtBQUs7Z0JBQ0csR0FBRztzQkFBWCxLQUFLO2dCQUNHLEdBQUc7c0JBQVgsS0FBSztnQkFDRyxHQUFHO3NCQUFYLEtBQUs7Z0JBQ0csQ0FBQztzQkFBVCxLQUFLO2dCQUNHLEdBQUc7c0JBQVgsS0FBSztnQkFDRyxHQUFHO3NCQUFYLEtBQUs7Z0JBQ0csR0FBRztzQkFBWCxLQUFLO2dCQUNHLEdBQUc7c0JBQVgsS0FBSyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IERpcmVjdGl2ZSwgRWxlbWVudFJlZiwgSW5wdXQsIE91dHB1dCwgSG9zdEJpbmRpbmcsIEV2ZW50RW1pdHRlciwgT25Jbml0LCBPbkRlc3Ryb3ksXHJcbiAgICBOZ1pvbmV9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xyXG5pbXBvcnQgeyBPYnNlcnZhYmxlLCBTdWJzY3JpcHRpb24sIGZyb21FdmVudCB9IGZyb20gJ3J4anMnO1xyXG5cclxuaW1wb3J0IHsgR3JpZHN0ZXJQcm90b3R5cGVTZXJ2aWNlIH0gZnJvbSAnLi9ncmlkc3Rlci1wcm90b3R5cGUuc2VydmljZSc7XHJcbmltcG9ydCB7IEdyaWRMaXN0SXRlbSB9IGZyb20gJy4uL2dyaWRMaXN0L0dyaWRMaXN0SXRlbSc7XHJcbmltcG9ydCB7IEdyaWRzdGVyU2VydmljZSB9IGZyb20gJy4uL2dyaWRzdGVyLnNlcnZpY2UnO1xyXG5pbXBvcnQgeyBEcmFnZ2FibGVFdmVudCB9IGZyb20gJy4uL3V0aWxzL0RyYWdnYWJsZUV2ZW50JztcclxuaW1wb3J0IHsgRHJhZ2dhYmxlIH0gZnJvbSAnLi4vdXRpbHMvZHJhZ2dhYmxlJztcclxuaW1wb3J0IHsgdXRpbHMgfSBmcm9tICcuLi91dGlscy91dGlscyc7XHJcblxyXG5ARGlyZWN0aXZlKHtcclxuICAgIHNlbGVjdG9yOiAnW25neEdyaWRzdGVySXRlbVByb3RvdHlwZV0nXHJcbn0pXHJcbmV4cG9ydCBjbGFzcyBHcmlkc3Rlckl0ZW1Qcm90b3R5cGVEaXJlY3RpdmUgaW1wbGVtZW50cyBPbkluaXQsIE9uRGVzdHJveSB7XHJcbiAgICBAT3V0cHV0KCkgZHJvcCA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcclxuICAgIEBPdXRwdXQoKSBzdGFydCA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcclxuICAgIEBPdXRwdXQoKSBjYW5jZWwgPSBuZXcgRXZlbnRFbWl0dGVyKCk7XHJcbiAgICBAT3V0cHV0KCkgZW50ZXIgPSBuZXcgRXZlbnRFbWl0dGVyKCk7XHJcbiAgICBAT3V0cHV0KCkgb3V0ID0gbmV3IEV2ZW50RW1pdHRlcigpO1xyXG5cclxuICAgIEBJbnB1dCgpIGRhdGE6IGFueTtcclxuICAgIEBJbnB1dCgpIGNvbmZpZzogYW55ID0ge307XHJcblxyXG4gICAgcHVibGljIHggPSAwO1xyXG4gICAgcHVibGljIHkgPSAwO1xyXG4gICAgQElucHV0KCkgdzogbnVtYmVyO1xyXG4gICAgQElucHV0KCkgd1NtOiBudW1iZXI7XHJcbiAgICBASW5wdXQoKSB3TWQ6IG51bWJlcjtcclxuICAgIEBJbnB1dCgpIHdMZzogbnVtYmVyO1xyXG4gICAgQElucHV0KCkgd1hsOiBudW1iZXI7XHJcbiAgICBASW5wdXQoKSBoOiBudW1iZXI7XHJcbiAgICBASW5wdXQoKSBoU206IG51bWJlcjtcclxuICAgIEBJbnB1dCgpIGhNZDogbnVtYmVyO1xyXG4gICAgQElucHV0KCkgaExnOiBudW1iZXI7XHJcbiAgICBASW5wdXQoKSBoWGw6IG51bWJlcjtcclxuXHJcbiAgICBwb3NpdGlvblg6IG51bWJlcjtcclxuICAgIHBvc2l0aW9uWTogbnVtYmVyO1xyXG5cclxuICAgIGF1dG9TaXplID0gZmFsc2U7XHJcblxyXG4gICAgJGVsZW1lbnQ6IEhUTUxFbGVtZW50O1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogTW91c2UgZHJhZyBvYnNlcnZhYmxlXHJcbiAgICAgKi9cclxuICAgIGRyYWc6IE9ic2VydmFibGU8YW55PjtcclxuXHJcbiAgICAvKipcclxuICAgICAqIFN1YnNjcmlidGlvbiBmb3IgZHJhZyBvYnNlcnZhYmxlXHJcbiAgICAgKi9cclxuICAgIGRyYWdTdWJzY3JpcHRpb246IFN1YnNjcmlwdGlvbjtcclxuXHJcbiAgICBpc0RyYWdnaW5nID0gZmFsc2U7XHJcblxyXG4gICAgaXRlbTogR3JpZExpc3RJdGVtO1xyXG5cclxuICAgIGNvbnRhaW5lclJlY3RhbmdlOiBDbGllbnRSZWN0O1xyXG5cclxuICAgIHByaXZhdGUgZHJhZ0NvbnRleHRHcmlkc3RlcjogR3JpZHN0ZXJTZXJ2aWNlO1xyXG4gICAgcHJpdmF0ZSBwYXJlbnRSZWN0OiBDbGllbnRSZWN0O1xyXG4gICAgcHJpdmF0ZSBwYXJlbnRPZmZzZXQ6IHtsZWZ0OiBudW1iZXIsIHRvcDogbnVtYmVyfTtcclxuXHJcbiAgICBwcml2YXRlIHN1YnNjcmlidGlvbnM6IEFycmF5PFN1YnNjcmlwdGlvbj4gPSBbXTtcclxuXHJcbiAgICAvLyBtdXN0IGJlIHNldCB0byB0cnVlIGJlY2F1c2Ugb2YgaXRlbSBkcmFnQW5kRHJvcCBjb25maWd1cmF0aW9uXHJcbiAgICBnZXQgZHJhZ0FuZERyb3AoKTogYm9vbGVhbiB7XHJcbiAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0IGdyaWRzdGVyKCk6IEdyaWRzdGVyU2VydmljZSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZHJhZ0NvbnRleHRHcmlkc3RlcjtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdHJ1Y3Rvcihwcml2YXRlIHpvbmU6IE5nWm9uZSxcclxuICAgICAgICAgICAgICAgIHByaXZhdGUgZWxlbWVudFJlZjogRWxlbWVudFJlZixcclxuICAgICAgICAgICAgICAgIHByaXZhdGUgZ3JpZHN0ZXJQcm90b3R5cGU6IEdyaWRzdGVyUHJvdG90eXBlU2VydmljZSkge1xyXG5cclxuICAgICAgICB0aGlzLml0ZW0gPSAobmV3IEdyaWRMaXN0SXRlbSgpKS5zZXRGcm9tR3JpZHN0ZXJJdGVtUHJvdG90eXBlKHRoaXMpO1xyXG4gICAgfVxyXG5cclxuICAgIG5nT25Jbml0KCkge1xyXG4gICAgICAgIHRoaXMud1NtID0gdGhpcy53U20gfHwgdGhpcy53O1xyXG4gICAgICAgIHRoaXMuaFNtID0gdGhpcy5oU20gfHwgdGhpcy5oO1xyXG4gICAgICAgIHRoaXMud01kID0gdGhpcy53TWQgfHwgdGhpcy53O1xyXG4gICAgICAgIHRoaXMuaE1kID0gdGhpcy5oTWQgfHwgdGhpcy5oO1xyXG4gICAgICAgIHRoaXMud0xnID0gdGhpcy53TGcgfHwgdGhpcy53O1xyXG4gICAgICAgIHRoaXMuaExnID0gdGhpcy5oTGcgfHwgdGhpcy5oO1xyXG4gICAgICAgIHRoaXMud1hsID0gdGhpcy53WGwgfHwgdGhpcy53O1xyXG4gICAgICAgIHRoaXMuaFhsID0gdGhpcy5oWGwgfHwgdGhpcy5oO1xyXG4gICAgICAgIHRoaXMuem9uZS5ydW5PdXRzaWRlQW5ndWxhcigoKSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMuZW5hYmxlRHJhZ0Ryb3AoKTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBuZ09uRGVzdHJveSgpIHtcclxuICAgICAgICB0aGlzLnN1YnNjcmlidGlvbnMuZm9yRWFjaCgoc3ViOiBTdWJzY3JpcHRpb24pID0+IHtcclxuICAgICAgICAgICAgc3ViLnVuc3Vic2NyaWJlKCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgb25Ecm9wIChncmlkc3RlcjogR3JpZHN0ZXJTZXJ2aWNlKTogdm9pZCB7XHJcbiAgICAgICAgaWYgKCF0aGlzLmNvbmZpZy5oZWxwZXIpIHtcclxuICAgICAgICAgICAgdGhpcy4kZWxlbWVudC5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHRoaXMuJGVsZW1lbnQpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5kcm9wLmVtaXQoe1xyXG4gICAgICAgICAgICBpdGVtOiB0aGlzLml0ZW0sXHJcbiAgICAgICAgICAgIGdyaWRzdGVyOiBncmlkc3RlclxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIG9uQ2FuY2VsICgpOiB2b2lkIHtcclxuICAgICAgICB0aGlzLmNhbmNlbC5lbWl0KHtpdGVtOiB0aGlzLml0ZW19KTtcclxuICAgIH1cclxuXHJcbiAgICBvbkVudGVyIChncmlkc3RlcjogR3JpZHN0ZXJTZXJ2aWNlKTogdm9pZCB7XHJcbiAgICAgICAgdGhpcy5lbnRlci5lbWl0KHtcclxuICAgICAgICAgICAgaXRlbTogdGhpcy5pdGVtLFxyXG4gICAgICAgICAgICBncmlkc3RlcjogZ3JpZHN0ZXJcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBvbk92ZXIgKGdyaWRzdGVyOiBHcmlkc3RlclNlcnZpY2UpOiB2b2lkIHt9XHJcblxyXG4gICAgb25PdXQgKGdyaWRzdGVyOiBHcmlkc3RlclNlcnZpY2UpOiB2b2lkIHtcclxuICAgICAgICB0aGlzLm91dC5lbWl0KHtcclxuICAgICAgICAgICAgaXRlbTogdGhpcy5pdGVtLFxyXG4gICAgICAgICAgICBncmlkc3RlcjogZ3JpZHN0ZXJcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBnZXRQb3NpdGlvblRvR3JpZHN0ZXIoZ3JpZHN0ZXI6IEdyaWRzdGVyU2VydmljZSkge1xyXG4gICAgICAgIGNvbnN0IHJlbGF0aXZlQ29udGFpbmVyQ29vcmRzID0gdGhpcy5nZXRDb250YWluZXJDb29yZHNUb0dyaWRzdGVyKGdyaWRzdGVyKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgeTogdGhpcy5wb3NpdGlvblkgLSByZWxhdGl2ZUNvbnRhaW5lckNvb3Jkcy50b3AsXHJcbiAgICAgICAgICAgIHg6IHRoaXMucG9zaXRpb25YIC0gcmVsYXRpdmVDb250YWluZXJDb29yZHMubGVmdFxyXG4gICAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgc2V0RHJhZ0NvbnRleHRHcmlkc3Rlcihncmlkc3RlcjogR3JpZHN0ZXJTZXJ2aWNlKSB7XHJcbiAgICAgICAgdGhpcy5kcmFnQ29udGV4dEdyaWRzdGVyID0gZ3JpZHN0ZXI7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBnZXRDb250YWluZXJDb29yZHNUb0dyaWRzdGVyKGdyaWRzdGVyOiBHcmlkc3RlclNlcnZpY2UpOiB7dG9wOiBudW1iZXIsIGxlZnQ6IG51bWJlcn0ge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIGxlZnQ6IGdyaWRzdGVyLmdyaWRzdGVyUmVjdC5sZWZ0IC0gdGhpcy5wYXJlbnRSZWN0LmxlZnQsXHJcbiAgICAgICAgICAgIHRvcDogZ3JpZHN0ZXIuZ3JpZHN0ZXJSZWN0LnRvcCAtIHRoaXMucGFyZW50UmVjdC50b3BcclxuICAgICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZW5hYmxlRHJhZ0Ryb3AoKSB7XHJcbiAgICAgICAgbGV0IGN1cnNvclRvRWxlbWVudFBvc2l0aW9uO1xyXG4gICAgICAgIGNvbnN0IGRyYWdnYWJsZSA9IG5ldyBEcmFnZ2FibGUodGhpcy5lbGVtZW50UmVmLm5hdGl2ZUVsZW1lbnQpO1xyXG5cclxuICAgICAgICBjb25zdCBkcmFnU3RhcnRTdWIgPSBkcmFnZ2FibGUuZHJhZ1N0YXJ0XHJcbiAgICAgICAgICAgIC5zdWJzY3JpYmUoKGV2ZW50OiBEcmFnZ2FibGVFdmVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy56b25lLnJ1bigoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kZWxlbWVudCA9IHRoaXMucHJvdmlkZURyYWdFbGVtZW50KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jb250YWluZXJSZWN0YW5nZSA9IHRoaXMuJGVsZW1lbnQucGFyZW50RWxlbWVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZVBhcmVudEVsZW1lbnREYXRhKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5vblN0YXJ0KGV2ZW50KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgY3Vyc29yVG9FbGVtZW50UG9zaXRpb24gPSBldmVudC5nZXRSZWxhdGl2ZUNvb3JkaW5hdGVzKHRoaXMuJGVsZW1lbnQpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICBjb25zdCBkcmFnU3ViID0gZHJhZ2dhYmxlLmRyYWdNb3ZlXHJcbiAgICAgICAgICAgIC5zdWJzY3JpYmUoKGV2ZW50OiBEcmFnZ2FibGVFdmVudCkgPT4ge1xyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMuc2V0RWxlbWVudFBvc2l0aW9uKHRoaXMuJGVsZW1lbnQsIHtcclxuICAgICAgICAgICAgICAgICAgICB4OiBldmVudC5jbGllbnRYIC0gY3Vyc29yVG9FbGVtZW50UG9zaXRpb24ueCAgLSB0aGlzLnBhcmVudFJlY3QubGVmdCxcclxuICAgICAgICAgICAgICAgICAgICB5OiBldmVudC5jbGllbnRZIC0gY3Vyc29yVG9FbGVtZW50UG9zaXRpb24ueSAgLSB0aGlzLnBhcmVudFJlY3QudG9wXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLm9uRHJhZyhldmVudCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICBjb25zdCBkcmFnU3RvcFN1YiA9IGRyYWdnYWJsZS5kcmFnU3RvcFxyXG4gICAgICAgICAgICAuc3Vic2NyaWJlKChldmVudDogRHJhZ2dhYmxlRXZlbnQpID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMuem9uZS5ydW4oKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMub25TdG9wKGV2ZW50KTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLiRlbGVtZW50ID0gbnVsbDtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgY29uc3Qgc2Nyb2xsU3ViID0gZnJvbUV2ZW50KGRvY3VtZW50LCAnc2Nyb2xsJylcclxuICAgICAgICAgICAgLnN1YnNjcmliZSgoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy4kZWxlbWVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlUGFyZW50RWxlbWVudERhdGEoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHRoaXMuc3Vic2NyaWJ0aW9ucyA9IHRoaXMuc3Vic2NyaWJ0aW9ucy5jb25jYXQoW2RyYWdTdGFydFN1YiwgZHJhZ1N1YiwgZHJhZ1N0b3BTdWIsIHNjcm9sbFN1Yl0pO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgc2V0RWxlbWVudFBvc2l0aW9uKGVsZW1lbnQ6IEhUTUxFbGVtZW50LCBwb3NpdGlvbjoge3g6IG51bWJlciwgeTogbnVtYmVyfSkge1xyXG4gICAgICAgIHRoaXMucG9zaXRpb25YID0gcG9zaXRpb24ueDtcclxuICAgICAgICB0aGlzLnBvc2l0aW9uWSA9IHBvc2l0aW9uLnk7XHJcbiAgICAgICAgdXRpbHMuc2V0Q3NzRWxlbWVudFBvc2l0aW9uKGVsZW1lbnQsIHBvc2l0aW9uKTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHVwZGF0ZVBhcmVudEVsZW1lbnREYXRhKCkge1xyXG4gICAgICAgIHRoaXMucGFyZW50UmVjdCA9IHRoaXMuJGVsZW1lbnQucGFyZW50RWxlbWVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcclxuICAgICAgICB0aGlzLnBhcmVudE9mZnNldCA9IHtcclxuICAgICAgICAgICAgbGVmdDogdGhpcy4kZWxlbWVudC5wYXJlbnRFbGVtZW50Lm9mZnNldExlZnQsXHJcbiAgICAgICAgICAgIHRvcDogdGhpcy4kZWxlbWVudC5wYXJlbnRFbGVtZW50Lm9mZnNldFRvcFxyXG4gICAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBvblN0YXJ0IChldmVudDogRHJhZ2dhYmxlRXZlbnQpOiB2b2lkIHtcclxuICAgICAgICB0aGlzLmlzRHJhZ2dpbmcgPSB0cnVlO1xyXG5cclxuICAgICAgICB0aGlzLiRlbGVtZW50LnN0eWxlLnBvaW50ZXJFdmVudHMgPSAnbm9uZSc7XHJcbiAgICAgICAgdGhpcy4kZWxlbWVudC5zdHlsZS5wb3NpdGlvbiA9ICdhYnNvbHV0ZSc7XHJcblxyXG4gICAgICAgIHRoaXMuZ3JpZHN0ZXJQcm90b3R5cGUuZHJhZ0l0ZW1TdGFydCh0aGlzLCBldmVudCk7XHJcblxyXG4gICAgICAgIHRoaXMuc3RhcnQuZW1pdCh7aXRlbTogdGhpcy5pdGVtfSk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBvbkRyYWcgKGV2ZW50OiBEcmFnZ2FibGVFdmVudCk6IHZvaWQge1xyXG4gICAgICAgIHRoaXMuZ3JpZHN0ZXJQcm90b3R5cGUudXBkYXRlUHJvdG90eXBlUG9zaXRpb24odGhpcywgZXZlbnQpO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgb25TdG9wIChldmVudDogRHJhZ2dhYmxlRXZlbnQpOiB2b2lkIHtcclxuICAgICAgICB0aGlzLmdyaWRzdGVyUHJvdG90eXBlLmRyYWdJdGVtU3RvcCh0aGlzLCBldmVudCk7XHJcblxyXG4gICAgICAgIHRoaXMuaXNEcmFnZ2luZyA9IGZhbHNlO1xyXG4gICAgICAgIHRoaXMuJGVsZW1lbnQuc3R5bGUucG9pbnRlckV2ZW50cyA9ICdhdXRvJztcclxuICAgICAgICB0aGlzLiRlbGVtZW50LnN0eWxlLnBvc2l0aW9uID0gJyc7XHJcbiAgICAgICAgdXRpbHMucmVzZXRDU1NFbGVtZW50UG9zaXRpb24odGhpcy4kZWxlbWVudCk7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmNvbmZpZy5oZWxwZXIpIHtcclxuICAgICAgICAgICAgdGhpcy4kZWxlbWVudC5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHRoaXMuJGVsZW1lbnQpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHByb3ZpZGVEcmFnRWxlbWVudCAoKTogSFRNTEVsZW1lbnQge1xyXG4gICAgICAgIGxldCBkcmFnRWxlbWVudCA9IHRoaXMuZWxlbWVudFJlZi5uYXRpdmVFbGVtZW50O1xyXG5cclxuICAgICAgICBpZiAodGhpcy5jb25maWcuaGVscGVyKSB7XHJcbiAgICAgICAgICAgIGRyYWdFbGVtZW50ID0gPGFueT4oZHJhZ0VsZW1lbnQpLmNsb25lTm9kZSh0cnVlKTtcclxuXHJcbiAgICAgICAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQodGhpcy5maXhTdHlsZXNGb3JCb2R5SGVscGVyKGRyYWdFbGVtZW50KSk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5maXhTdHlsZXNGb3JSZWxhdGl2ZUVsZW1lbnQoZHJhZ0VsZW1lbnQpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGRyYWdFbGVtZW50O1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZml4U3R5bGVzRm9yUmVsYXRpdmVFbGVtZW50KGVsOiBIVE1MRWxlbWVudCkge1xyXG4gICAgICAgIGlmICh3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZShlbCkucG9zaXRpb24gPT09ICdhYnNvbHV0ZScpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGVsO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjb25zdCByZWN0ID0gdGhpcy5lbGVtZW50UmVmLm5hdGl2ZUVsZW1lbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XHJcbiAgICAgICAgdGhpcy5jb250YWluZXJSZWN0YW5nZSA9IGVsLnBhcmVudEVsZW1lbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XHJcblxyXG4gICAgICAgIGVsLnN0eWxlLnBvc2l0aW9uID0gJ2Fic29sdXRlJztcclxuICAgICAgICB0aGlzLnNldEVsZW1lbnRQb3NpdGlvbihlbCwge1xyXG4gICAgICAgICAgICB4OiByZWN0LmxlZnQgLSB0aGlzLmNvbnRhaW5lclJlY3RhbmdlLmxlZnQsXHJcbiAgICAgICAgICAgIHk6IHJlY3QudG9wIC0gdGhpcy5jb250YWluZXJSZWN0YW5nZS50b3BcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgcmV0dXJuIGVsO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogV2hlbiBlbGVtZW50IGlzIGNsb25lZCBhbmQgYXBwZW5kIHRvIGJvZHkgaXQgc2hvdWxkIGhhdmUgcG9zaXRpb24gYWJzb2x1dGUgYW5kIGNvb3JkcyBzZXQgYnkgb3JpZ2luYWxcclxuICAgICAqIHJlbGF0aXZlIHByb3RvdHlwZSBlbGVtZW50IHBvc2l0aW9uLlxyXG4gICAgICovXHJcbiAgICBwcml2YXRlIGZpeFN0eWxlc0ZvckJvZHlIZWxwZXIgKGVsOiBIVE1MRWxlbWVudCkge1xyXG4gICAgICAgIGNvbnN0IGJvZHlSZWN0ID0gZG9jdW1lbnQuYm9keS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcclxuICAgICAgICBjb25zdCByZWN0ID0gdGhpcy5lbGVtZW50UmVmLm5hdGl2ZUVsZW1lbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XHJcblxyXG4gICAgICAgIGVsLnN0eWxlLnBvc2l0aW9uID0gJ2Fic29sdXRlJztcclxuICAgICAgICB0aGlzLnNldEVsZW1lbnRQb3NpdGlvbihlbCwge1xyXG4gICAgICAgICAgICB4OiByZWN0LmxlZnQgLSBib2R5UmVjdC5sZWZ0LFxyXG4gICAgICAgICAgICB5OiByZWN0LnRvcCAtIGJvZHlSZWN0LnRvcFxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICByZXR1cm4gZWw7XHJcbiAgICB9XHJcblxyXG59XHJcbiJdfQ==