import { Injectable } from '@angular/core';
import { Subject, merge } from 'rxjs';
import { takeUntil, switchMap, map, scan, filter, share, tap } from 'rxjs/operators';
import { utils } from '../utils/utils';
import * as i0 from "@angular/core";
export class GridsterPrototypeService {
    constructor() {
        this.isDragging = false;
        this.dragSubject = new Subject();
        this.dragStartSubject = new Subject();
        this.dragStopSubject = new Subject();
    }
    observeDropOver(gridster) {
        return this.dragStopSubject.pipe(filter((data) => {
            const gridsterEl = gridster.gridsterComponent.$element;
            const isOverNestedGridster = [].slice.call(gridsterEl.querySelectorAll('gridster'))
                .reduce((isOverGridster, nestedGridsterEl) => {
                return isOverGridster ||
                    this.isOverGridster(data.item, nestedGridsterEl, data.event, gridster.options);
            }, false);
            if (isOverNestedGridster) {
                return false;
            }
            return this.isOverGridster(data.item, gridsterEl, data.event, gridster.options);
        }), tap((data) => {
            // TODO: what we should provide as a param?
            // prototype.drop.emit({item: prototype.item});
            data.item.onDrop(gridster);
        }));
    }
    observeDropOut(gridster) {
        return this.dragStopSubject.pipe(filter((data) => {
            const gridsterEl = gridster.gridsterComponent.$element;
            return !this.isOverGridster(data.item, gridsterEl, data.event, gridster.options);
        }), tap((data) => {
            // TODO: what we should provide as a param?
            data.item.onCancel();
        }));
    }
    observeDragOver(gridster) {
        const over = this.dragSubject.pipe(map((data) => {
            const gridsterEl = gridster.gridsterComponent.$element;
            return {
                item: data.item,
                event: data.event,
                isOver: this.isOverGridster(data.item, gridsterEl, data.event, gridster.options),
                isDrop: false
            };
        }));
        const drop = this.dragStopSubject.pipe(map((data) => {
            const gridsterEl = gridster.gridsterComponent.$element;
            return {
                item: data.item,
                event: data.event,
                isOver: this.isOverGridster(data.item, gridsterEl, data.event, gridster.options),
                isDrop: true
            };
        }));
        const dragExt = merge(
        // dragStartSubject is connected in case when item prototype is placed above gridster
        // and drag enter is not fired
        this.dragStartSubject.pipe(map(() => ({ item: null, isOver: false, isDrop: false }))), over, drop).pipe(scan((prev, next) => {
            return {
                item: next.item,
                event: next.event,
                isOver: next.isOver,
                isEnter: prev.isOver === false && next.isOver === true,
                isOut: prev.isOver === true && next.isOver === false && !prev.isDrop,
                isDrop: next.isDrop
            };
        }), filter((data) => {
            return !data.isDrop;
        }), share());
        const dragEnter = this.createDragEnterObservable(dragExt, gridster);
        const dragOut = this.createDragOutObservable(dragExt, gridster);
        const dragOver = dragEnter
            .pipe(switchMap(() => this.dragSubject.pipe(takeUntil(dragOut))), map((data) => data.item));
        return { dragEnter, dragOut, dragOver };
    }
    dragItemStart(item, event) {
        this.isDragging = true;
        this.dragStartSubject.next({ item, event });
    }
    dragItemStop(item, event) {
        this.isDragging = false;
        this.dragStopSubject.next({ item, event });
    }
    updatePrototypePosition(item, event) {
        this.dragSubject.next({ item, event });
    }
    /**
     * Creates observable that is fired on dragging over gridster container.
     */
    createDragOverObservable(dragIsOver, gridster) {
        return dragIsOver.pipe(filter((data) => data.isOver && !data.isEnter && !data.isOut), map((data) => data.item), tap((item) => item.onOver(gridster)));
    }
    /**
     * Creates observable that is fired on drag enter gridster container.
     */
    createDragEnterObservable(dragIsOver, gridster) {
        return dragIsOver.pipe(filter((data) => data.isEnter), map((data) => data.item), tap((item) => item.onEnter(gridster)));
    }
    /**
     * Creates observable that is fired on drag out gridster container.
     */
    createDragOutObservable(dragIsOver, gridster) {
        return dragIsOver.pipe(filter((data) => data.isOut), map((data) => data.item), tap((item) => item.onOut(gridster)));
    }
    /**
     * Checks whether "element" position fits inside "containerEl" position.
     * It checks if "element" is totally covered by "containerEl" area.
     */
    isOverGridster(item, gridsterEl, event, options) {
        const el = item.$element;
        const parentItem = gridsterEl.parentElement &&
            gridsterEl.parentElement.closest('gridster-item');
        if (parentItem) {
            return this.isOverGridster(item, parentItem, event, options);
        }
        switch (options.tolerance) {
            case 'fit':
                return utils.isElementFitContainer(el, gridsterEl);
            case 'intersect':
                return utils.isElementIntersectContainer(el, gridsterEl);
            case 'touch':
                return utils.isElementTouchContainer(el, gridsterEl);
            default:
                return utils.isCursorAboveElement(event, gridsterEl);
        }
    }
}
GridsterPrototypeService.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "13.1.1", ngImport: i0, type: GridsterPrototypeService, deps: [], target: i0.ɵɵFactoryTarget.Injectable });
GridsterPrototypeService.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "13.1.1", ngImport: i0, type: GridsterPrototypeService });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "13.1.1", ngImport: i0, type: GridsterPrototypeService, decorators: [{
            type: Injectable
        }], ctorParameters: function () { return []; } });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3JpZHN0ZXItcHJvdG90eXBlLnNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9wcm9qZWN0cy9hbmd1bGFyMmdyaWRzdGVyL3NyYy9saWIvZ3JpZHN0ZXItcHJvdG90eXBlL2dyaWRzdGVyLXByb3RvdHlwZS5zZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDM0MsT0FBTyxFQUFjLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxNQUFNLENBQUM7QUFDbEQsT0FBTyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBSXJGLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQzs7QUFJdkMsTUFBTSxPQUFPLHdCQUF3QjtJQVVqQztRQVJRLGVBQVUsR0FBRyxLQUFLLENBQUM7UUFFbkIsZ0JBQVcsR0FBRyxJQUFJLE9BQU8sRUFBTyxDQUFDO1FBRWpDLHFCQUFnQixHQUFHLElBQUksT0FBTyxFQUFPLENBQUM7UUFFdEMsb0JBQWUsR0FBRyxJQUFJLE9BQU8sRUFBTyxDQUFDO0lBRTlCLENBQUM7SUFFaEIsZUFBZSxDQUFFLFFBQXlCO1FBQ3RDLE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQzVCLE1BQU0sQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFO1lBQ1osTUFBTSxVQUFVLEdBQUcsUUFBUSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQztZQUN2RCxNQUFNLG9CQUFvQixHQUFHLEVBQUUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsQ0FBQztpQkFDOUUsTUFBTSxDQUFDLENBQUMsY0FBYyxFQUFFLGdCQUFnQixFQUFFLEVB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LEtBQUssV0FBVztnQkFDWixPQUFPLEtBQUssQ0FBQywyQkFBMkIsQ0FBQyxFQUFFLEVBQUUsVUFBVSxDQUFDLENBQUM7WUFDN0QsS0FBSyxPQUFPO2dCQUNSLE9BQU8sS0FBSyxDQUFDLHVCQUF1QixDQUFDLEVBQUUsRUFBRSxVQUFVLENBQUMsQ0FBQztZQUN6RDtnQkFDSSxPQUFPLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLEVBQUUsVUFBVSxDQUFDLENBQUM7U0FDNUQ7SUFDTCxDQUFDOztxSEFqTVEsd0JBQXdCO3lIQUF4Qix3QkFBd0I7MkZBQXhCLHdCQUF3QjtrQkFEcEMsVUFBVSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEluamVjdGFibGUgfSBmcm9tICdAYW5ndWxhci9jb3JlJztcclxuaW1wb3J0IHsgT2JzZXJ2YWJsZSwgU3ViamVjdCwgbWVyZ2UgfSBmcm9tICdyeGpzJztcclxuaW1wb3J0IHsgdGFrZVVudGlsLCBzd2l0Y2hNYXAsIG1hcCwgc2NhbiwgZmlsdGVyLCBzaGFyZSwgdGFwIH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xyXG5cclxuaW1wb3J0IHsgR3JpZHN0ZXJTZXJ2aWNlIH0gZnJvbSAnLi4vZ3JpZHN0ZXIuc2VydmljZSc7XHJcbmltcG9ydCB7IEdyaWRzdGVySXRlbVByb3RvdHlwZURpcmVjdGl2ZSB9IGZyb20gJy4vZ3JpZHN0ZXItaXRlbS1wcm90b3R5cGUuZGlyZWN0aXZlJztcclxuaW1wb3J0IHsgdXRpbHMgfSBmcm9tICcuLi91dGlscy91dGlscyc7XHJcbmltcG9ydCB7IERyYWdnYWJsZUV2ZW50IH0gZnJvbSAnLi4vdXRpbHMvRHJhZ2dhYmxlRXZlbnQnO1xyXG5cclxuQEluamVjdGFibGUoKVxyXG5leHBvcnQgY2xhc3MgR3JpZHN0ZXJQcm90b3R5cGVTZXJ2aWNlIHtcclxuXHJcbiAgICBwcml2YXRlIGlzRHJhZ2dpbmcgPSBmYWxzZTtcclxuXHJcbiAgICBwcml2YXRlIGRyYWdTdWJqZWN0ID0gbmV3IFN1YmplY3Q8YW55PigpO1xyXG5cclxuICAgIHByaXZhdGUgZHJhZ1N0YXJ0U3ViamVjdCA9IG5ldyBTdWJqZWN0PGFueT4oKTtcclxuXHJcbiAgICBwcml2YXRlIGRyYWdTdG9wU3ViamVjdCA9IG5ldyBTdWJqZWN0PGFueT4oKTtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcigpIHt9XHJcblxyXG4gICAgb2JzZXJ2ZURyb3BPdmVyIChncmlkc3RlcjogR3JpZHN0ZXJTZXJ2aWNlKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZHJhZ1N0b3BTdWJqZWN0LnBpcGUoXHJcbiAgICAgICAgICAgIGZpbHRlcigoZGF0YSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZ3JpZHN0ZXJFbCA9IGdyaWRzdGVyLmdyaWRzdGVyQ29tcG9uZW50LiRlbGVtZW50O1xyXG4gICAgICAgICAgICAgICAgY29uc3QgaXNPdmVyTmVzdGVkR3JpZHN0ZXIgPSBbXS5zbGljZS5jYWxsKGdyaWRzdGVyRWwucXVlcnlTZWxlY3RvckFsbCgnZ3JpZHN0ZXInKSlcclxuICAgICAgICAgICAgICAgICAgICAucmVkdWNlKChpc092ZXJHcmlkc3RlciwgbmVzdGVkR3JpZHN0ZXJFbCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gaXNPdmVyR3JpZHN0ZXIgfHxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaXNPdmVyR3JpZHN0ZXIoZGF0YS5pdGVtLCBuZXN0ZWRHcmlkc3RlckVsLCBkYXRhLmV2ZW50LCBncmlkc3Rlci5vcHRpb25zKTtcclxuICAgICAgICAgICAgICAgICAgICB9LCBmYWxzZSk7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKGlzT3Zlck5lc3RlZEdyaWRzdGVyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmlzT3ZlckdyaWRzdGVyKGRhdGEuaXRlbSwgZ3JpZHN0ZXJFbCwgZGF0YS5ldmVudCwgZ3JpZHN0ZXIub3B0aW9ucyk7XHJcbiAgICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgICB0YXAoKGRhdGEpID0+IHtcclxuICAgICAgICAgICAgICAgIC8vIFRPRE86IHdoYXQgd2Ugc2hvdWxkIHByb3ZpZGUgYXMgYSBwYXJhbT9cclxuICAgICAgICAgICAgICAgIC8vIHByb3RvdHlwZS5kcm9wLmVtaXQoe2l0ZW06IHByb3RvdHlwZS5pdGVtfSk7XHJcbiAgICAgICAgICAgICAgICBkYXRhLml0ZW0ub25Ecm9wKGdyaWRzdGVyKTtcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICApO1xyXG4gICAgfVxyXG5cclxuICAgIG9ic2VydmVEcm9wT3V0IChncmlkc3RlcjogR3JpZHN0ZXJTZXJ2aWNlKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZHJhZ1N0b3BTdWJqZWN0LnBpcGUoXHJcbiAgICAgICAgICAgIGZpbHRlcigoZGF0YSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZ3JpZHN0ZXJFbCA9IGdyaWRzdGVyLmdyaWRzdGVyQ29tcG9uZW50LiRlbGVtZW50O1xyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiAhdGhpcy5pc092ZXJHcmlkc3RlcihkYXRhLml0ZW0sIGdyaWRzdGVyRWwsIGRhdGEuZXZlbnQsIGdyaWRzdGVyLm9wdGlvbnMpO1xyXG4gICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgdGFwKChkYXRhKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAvLyBUT0RPOiB3aGF0IHdlIHNob3VsZCBwcm92aWRlIGFzIGEgcGFyYW0/XHJcbiAgICAgICAgICAgICAgICBkYXRhLml0ZW0ub25DYW5jZWwoKTtcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICApO1xyXG4gICAgfVxyXG5cclxuICAgIG9ic2VydmVEcmFnT3Zlcihncmlkc3RlcjogR3JpZHN0ZXJTZXJ2aWNlKToge1xyXG4gICAgICAgIGRyYWdPdmVyOiBPYnNlcnZhYmxlPEdyaWRzdGVySXRlbVByb3RvdHlwZURpcmVjdGl2ZT4sXHJcbiAgICAgICAgZHJhZ0VudGVyOiBPYnNlcnZhYmxlPEdyaWRzdGVySXRlbVByb3RvdHlwZURpcmVjdGl2ZT4sXHJcbiAgICAgICAgZHJhZ091dDogT2JzZXJ2YWJsZTxHcmlkc3Rlckl0ZW1Qcm90b3R5cGVEaXJlY3RpdmU+XHJcbiAgICB9IHtcclxuICAgICAgICBjb25zdCBvdmVyID0gdGhpcy5kcmFnU3ViamVjdC5waXBlKFxyXG4gICAgICAgICAgICBtYXAoKGRhdGEpID0+IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGdyaWRzdGVyRWwgPSBncmlkc3Rlci5ncmlkc3RlckNvbXBvbmVudC4kZWxlbWVudDtcclxuXHJcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgICBpdGVtOiBkYXRhLml0ZW0sXHJcbiAgICAgICAgICAgICAgICAgIGV2ZW50OiBkYXRhLmV2ZW50LFxyXG4gICAgICAgICAgICAgICAgICBpc092ZXI6IHRoaXMuaXNPdmVyR3JpZHN0ZXIoZGF0YS5pdGVtLCBncmlkc3RlckVsLCBkYXRhLmV2ZW50LCBncmlkc3Rlci5vcHRpb25zKSxcclxuICAgICAgICAgICAgICAgICAgaXNEcm9wOiBmYWxzZVxyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICApO1xyXG5cclxuICAgICAgICBjb25zdCBkcm9wID0gdGhpcy5kcmFnU3RvcFN1YmplY3QucGlwZShcclxuICAgICAgICAgICAgbWFwKChkYXRhKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBncmlkc3RlckVsID0gZ3JpZHN0ZXIuZ3JpZHN0ZXJDb21wb25lbnQuJGVsZW1lbnQ7XHJcblxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgICAgICBpdGVtOiBkYXRhLml0ZW0sXHJcbiAgICAgICAgICAgICAgICAgICAgZXZlbnQ6IGRhdGEuZXZlbnQsXHJcbiAgICAgICAgICAgICAgICAgICAgaXNPdmVyOiB0aGlzLmlzT3ZlckdyaWRzdGVyKGRhdGEuaXRlbSwgZ3JpZHN0ZXJFbCwgZGF0YS5ldmVudCwgZ3JpZHN0ZXIub3B0aW9ucyksXHJcbiAgICAgICAgICAgICAgICAgICAgaXNEcm9wOiB0cnVlXHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICk7XHJcblxyXG4gICAgICAgIGNvbnN0IGRyYWdFeHQgPSBtZXJnZShcclxuICAgICAgICAgICAgICAgIC8vIGRyYWdTdGFydFN1YmplY3QgaXMgY29ubmVjdGVkIGluIGNhc2Ugd2hlbiBpdGVtIHByb3RvdHlwZSBpcyBwbGFjZWQgYWJvdmUgZ3JpZHN0ZXJcclxuICAgICAgICAgICAgICAgIC8vIGFuZCBkcmFnIGVudGVyIGlzIG5vdCBmaXJlZFxyXG4gICAgICAgICAgICAgICAgdGhpcy5kcmFnU3RhcnRTdWJqZWN0LnBpcGUobWFwKCgpID0+ICh7IGl0ZW06IG51bGwsIGlzT3ZlcjogZmFsc2UsIGlzRHJvcDogZmFsc2UgfSkpKSxcclxuICAgICAgICAgICAgICAgIG92ZXIsXHJcbiAgICAgICAgICAgICAgICBkcm9wXHJcbiAgICAgICAgICAgICkucGlwZShcclxuICAgICAgICAgICAgICAgIHNjYW4oKHByZXY6IGFueSwgbmV4dDogYW55KSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbTogbmV4dC5pdGVtLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBldmVudDogbmV4dC5ldmVudCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaXNPdmVyOiBuZXh0LmlzT3ZlcixcclxuICAgICAgICAgICAgICAgICAgICAgICAgaXNFbnRlcjogcHJldi5pc092ZXIgPT09IGZhbHNlICYmIG5leHQuaXNPdmVyID09PSB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpc091dDogcHJldi5pc092ZXIgPT09IHRydWUgJiYgbmV4dC5pc092ZXIgPT09IGZhbHNlICYmICFwcmV2LmlzRHJvcCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaXNEcm9wOiBuZXh0LmlzRHJvcFxyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgICAgIGZpbHRlcigoZGF0YTogYW55KSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICFkYXRhLmlzRHJvcDtcclxuICAgICAgICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgICAgICAgc2hhcmUoKVxyXG4gICAgICAgICAgICApO1xyXG5cclxuICAgICAgICBjb25zdCBkcmFnRW50ZXIgPSB0aGlzLmNyZWF0ZURyYWdFbnRlck9ic2VydmFibGUoZHJhZ0V4dCwgZ3JpZHN0ZXIpO1xyXG4gICAgICAgIGNvbnN0IGRyYWdPdXQgPSB0aGlzLmNyZWF0ZURyYWdPdXRPYnNlcnZhYmxlKGRyYWdFeHQsIGdyaWRzdGVyKTtcclxuICAgICAgICBjb25zdCBkcmFnT3ZlciA9IGRyYWdFbnRlclxyXG4gICAgICAgICAgICAucGlwZShcclxuICAgICAgICAgICAgICAgIHN3aXRjaE1hcCgoKSA9PiB0aGlzLmRyYWdTdWJqZWN0LnBpcGUodGFrZVVudGlsKGRyYWdPdXQpKSksXHJcbiAgICAgICAgICAgICAgICBtYXAoKGRhdGE6IGFueSkgPT4gZGF0YS5pdGVtKVxyXG4gICAgICAgICAgICApO1xyXG5cclxuICAgICAgICByZXR1cm4geyBkcmFnRW50ZXIsIGRyYWdPdXQsIGRyYWdPdmVyIH07XHJcbiAgICB9XHJcblxyXG4gICAgZHJhZ0l0ZW1TdGFydChpdGVtOiBHcmlkc3Rlckl0ZW1Qcm90b3R5cGVEaXJlY3RpdmUsIGV2ZW50OiBEcmFnZ2FibGVFdmVudCkge1xyXG4gICAgICAgIHRoaXMuaXNEcmFnZ2luZyA9IHRydWU7XHJcbiAgICAgICAgdGhpcy5kcmFnU3RhcnRTdWJqZWN0Lm5leHQoeyBpdGVtLCBldmVudCB9KTtcclxuICAgIH1cclxuXHJcbiAgICBkcmFnSXRlbVN0b3AoaXRlbTogR3JpZHN0ZXJJdGVtUHJvdG90eXBlRGlyZWN0aXZlLCBldmVudDogRHJhZ2dhYmxlRXZlbnQpIHtcclxuICAgICAgICB0aGlzLmlzRHJhZ2dpbmcgPSBmYWxzZTtcclxuICAgICAgICB0aGlzLmRyYWdTdG9wU3ViamVjdC5uZXh0KHsgaXRlbSwgZXZlbnQgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgdXBkYXRlUHJvdG90eXBlUG9zaXRpb24oaXRlbTogR3JpZHN0ZXJJdGVtUHJvdG90eXBlRGlyZWN0aXZlLCBldmVudDogRHJhZ2dhYmxlRXZlbnQpIHtcclxuICAgICAgICB0aGlzLmRyYWdTdWJqZWN0Lm5leHQoeyBpdGVtLCBldmVudCB9KTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIENyZWF0ZXMgb2JzZXJ2YWJsZSB0aGF0IGlzIGZpcmVkIG9uIGRyYWdnaW5nIG92ZXIgZ3JpZHN0ZXIgY29udGFpbmVyLlxyXG4gICAgICovXHJcbiAgICBwcml2YXRlIGNyZWF0ZURyYWdPdmVyT2JzZXJ2YWJsZSAoXHJcbiAgICAgICAgZHJhZ0lzT3ZlcjogT2JzZXJ2YWJsZTx7aXRlbTogR3JpZHN0ZXJJdGVtUHJvdG90eXBlRGlyZWN0aXZlLCBpc092ZXI6IGJvb2xlYW59PixcclxuICAgICAgICBncmlkc3RlcjogR3JpZHN0ZXJTZXJ2aWNlXHJcbiAgICApIHtcclxuICAgICAgICByZXR1cm4gZHJhZ0lzT3Zlci5waXBlKFxyXG4gICAgICAgICAgICBmaWx0ZXIoKGRhdGE6IGFueSkgPT4gZGF0YS5pc092ZXIgJiYgIWRhdGEuaXNFbnRlciAmJiAhZGF0YS5pc091dCksXHJcbiAgICAgICAgICAgIG1hcCgoZGF0YTogYW55KTogR3JpZHN0ZXJJdGVtUHJvdG90eXBlRGlyZWN0aXZlID0+IGRhdGEuaXRlbSksXHJcbiAgICAgICAgICAgIHRhcCgoaXRlbSkgPT4gaXRlbS5vbk92ZXIoZ3JpZHN0ZXIpKVxyXG4gICAgICAgICk7XHJcbiAgICB9XHJcbiAgICAvKipcclxuICAgICAqIENyZWF0ZXMgb2JzZXJ2YWJsZSB0aGF0IGlzIGZpcmVkIG9uIGRyYWcgZW50ZXIgZ3JpZHN0ZXIgY29udGFpbmVyLlxyXG4gICAgICovXHJcbiAgICBwcml2YXRlIGNyZWF0ZURyYWdFbnRlck9ic2VydmFibGUgKFxyXG4gICAgICAgIGRyYWdJc092ZXI6IE9ic2VydmFibGU8e2l0ZW06IEdyaWRzdGVySXRlbVByb3RvdHlwZURpcmVjdGl2ZSwgaXNPdmVyOiBib29sZWFufT4sXHJcbiAgICAgICAgZ3JpZHN0ZXI6IEdyaWRzdGVyU2VydmljZVxyXG4gICAgKSB7XHJcbiAgICAgICAgcmV0dXJuIGRyYWdJc092ZXIucGlwZShcclxuICAgICAgICAgICAgZmlsdGVyKChkYXRhOiBhbnkpID0+IGRhdGEuaXNFbnRlciksXHJcbiAgICAgICAgICAgIG1hcCgoZGF0YTogYW55KTogR3JpZHN0ZXJJdGVtUHJvdG90eXBlRGlyZWN0aXZlID0+IGRhdGEuaXRlbSksXHJcbiAgICAgICAgICAgIHRhcCgoaXRlbSkgPT4gaXRlbS5vbkVudGVyKGdyaWRzdGVyKSlcclxuICAgICAgICApO1xyXG4gICAgfVxyXG4gICAgLyoqXHJcbiAgICAgKiBDcmVhdGVzIG9ic2VydmFibGUgdGhhdCBpcyBmaXJlZCBvbiBkcmFnIG91dCBncmlkc3RlciBjb250YWluZXIuXHJcbiAgICAgKi9cclxuICAgIHByaXZhdGUgY3JlYXRlRHJhZ091dE9ic2VydmFibGUgKFxyXG4gICAgICAgIGRyYWdJc092ZXI6IE9ic2VydmFibGU8e2l0ZW06IEdyaWRzdGVySXRlbVByb3RvdHlwZURpcmVjdGl2ZSxcclxuICAgICAgICBpc092ZXI6IGJvb2xlYW59PixcclxuICAgICAgICBncmlkc3RlcjogR3JpZHN0ZXJTZXJ2aWNlXHJcbiAgICApIHtcclxuICAgICAgICByZXR1cm4gZHJhZ0lzT3Zlci5waXBlKFxyXG4gICAgICAgICAgICBmaWx0ZXIoKGRhdGE6IGFueSkgPT4gZGF0YS5pc091dCksXHJcbiAgICAgICAgICAgIG1hcCgoZGF0YTogYW55KTogR3JpZHN0ZXJJdGVtUHJvdG90eXBlRGlyZWN0aXZlID0+IGRhdGEuaXRlbSksXHJcbiAgICAgICAgICAgIHRhcCgoaXRlbSkgPT4gaXRlbS5vbk91dChncmlkc3RlcikpXHJcbiAgICAgICAgKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIENoZWNrcyB3aGV0aGVyIFwiZWxlbWVudFwiIHBvc2l0aW9uIGZpdHMgaW5zaWRlIFwiY29udGFpbmVyRWxcIiBwb3NpdGlvbi5cclxuICAgICAqIEl0IGNoZWNrcyBpZiBcImVsZW1lbnRcIiBpcyB0b3RhbGx5IGNvdmVyZWQgYnkgXCJjb250YWluZXJFbFwiIGFyZWEuXHJcbiAgICAgKi9cclxuICAgIHByaXZhdGUgaXNPdmVyR3JpZHN0ZXIoaXRlbTogR3JpZHN0ZXJJdGVtUHJvdG90eXBlRGlyZWN0aXZlLCBncmlkc3RlckVsOiBIVE1MRWxlbWVudCwgZXZlbnQsIG9wdGlvbnMpOiBib29sZWFuIHtcclxuICAgICAgICBjb25zdCBlbCA9IGl0ZW0uJGVsZW1lbnQ7XHJcbiAgICAgICAgY29uc3QgcGFyZW50SXRlbSA9IDxIVE1MRWxlbWVudD5ncmlkc3RlckVsLnBhcmVudEVsZW1lbnQgJiZcclxuICAgICAgICAgICAgPEhUTUxFbGVtZW50PmdyaWRzdGVyRWwucGFyZW50RWxlbWVudC5jbG9zZXN0KCdncmlkc3Rlci1pdGVtJyk7XHJcblxyXG4gICAgICAgIGlmIChwYXJlbnRJdGVtKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmlzT3ZlckdyaWRzdGVyKGl0ZW0sIHBhcmVudEl0ZW0sIGV2ZW50LCBvcHRpb25zKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHN3aXRjaCAob3B0aW9ucy50b2xlcmFuY2UpIHtcclxuICAgICAgICAgICAgY2FzZSAnZml0JzpcclxuICAgICAgICAgICAgICAgIHJldHVybiB1dGlscy5pc0VsZW1lbnRGaXRDb250YWluZXIoZWwsIGdyaWRzdGVyRWwpO1xyXG4gICAgICAgICAgICBjYXNlICdpbnRlcnNlY3QnOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHV0aWxzLmlzRWxlbWVudEludGVyc2VjdENvbnRhaW5lcihlbCwgZ3JpZHN0ZXJFbCk7XHJcbiAgICAgICAgICAgIGNhc2UgJ3RvdWNoJzpcclxuICAgICAgICAgICAgICAgIHJldHVybiB1dGlscy5pc0VsZW1lbnRUb3VjaENvbnRhaW5lcihlbCwgZ3JpZHN0ZXJFbCk7XHJcbiAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdXRpbHMuaXNDdXJzb3JBYm92ZUVsZW1lbnQoZXZlbnQsIGdyaWRzdGVyRWwpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG4iXX0=