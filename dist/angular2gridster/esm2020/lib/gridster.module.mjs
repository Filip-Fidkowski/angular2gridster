import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GridsterComponent } from './gridster.component';
import { GridsterItemComponent } from './gridster-item/gridster-item.component';
import { GridsterItemPrototypeDirective } from './gridster-prototype/gridster-item-prototype.directive';
import { GridsterPrototypeService } from './gridster-prototype/gridster-prototype.service';
import * as i0 from "@angular/core";
export class GridsterModule {
    static forRoot() {
        return {
            ngModule: GridsterModule,
            providers: [GridsterPrototypeService]
        };
    }
}
GridsterModule.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "13.1.1", ngImport: i0, type: GridsterModule, deps: [], target: i0.ɵɵFactoryTarget.NgModule });
GridsterModule.ɵmod = i0.ɵɵngDeclareNgModule({ minVersion: "12.0.0", version: "13.1.1", ngImport: i0, type: GridsterModule, declarations: [GridsterComponent,
        GridsterItemComponent,
        GridsterItemPrototypeDirective], imports: [CommonModule], exports: [GridsterComponent,
        GridsterItemComponent,
        GridsterItemPrototypeDirective] });
GridsterModule.ɵinj = i0.ɵɵngDeclareInjector({ minVersion: "12.0.0", version: "13.1.1", ngImport: i0, type: GridsterModule, imports: [[
            CommonModule
        ]] });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "13.1.1", ngImport: i0, type: GridsterModule, decorators: [{
            type: NgModule,
            args: [{
                    imports: [
                        CommonModule
                    ],
                    declarations: [
                        GridsterComponent,
                        GridsterItemComponent,
                        GridsterItemPrototypeDirective
                    ],
                    exports: [
                        GridsterComponent,
                        GridsterItemComponent,
                        GridsterItemPrototypeDirective
                    ]
                }]
        }] });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3JpZHN0ZXIubW9kdWxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vcHJvamVjdHMvYW5ndWxhcjJncmlkc3Rlci9zcmMvbGliL2dyaWRzdGVyLm1vZHVsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsUUFBUSxFQUF1QixNQUFNLGVBQWUsQ0FBQztBQUM5RCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFFL0MsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFDekQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDaEYsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDeEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0saURBQWlELENBQUM7O0FBaUIzRixNQUFNLE9BQU8sY0FBYztJQUN2QixNQUFNLENBQUMsT0FBTztRQUNkLE9BQU87WUFDSCxRQUFRLEVBQUUsY0FBYztZQUN4QixTQUFTLEVBQUUsQ0FBQyx3QkFBd0IsQ0FBQztTQUN4QyxDQUFDO0lBQ04sQ0FBQzs7MkdBTlksY0FBYzs0R0FBZCxjQUFjLGlCQVZuQixpQkFBaUI7UUFDakIscUJBQXFCO1FBQ3JCLDhCQUE4QixhQUw5QixZQUFZLGFBUVosaUJBQWlCO1FBQ2pCLHFCQUFxQjtRQUNyQiw4QkFBOEI7NEdBR3pCLGNBQWMsWUFkZDtZQUNMLFlBQVk7U0FDZjsyRkFZUSxjQUFjO2tCQWYxQixRQUFRO21CQUFDO29CQUNOLE9BQU8sRUFBRTt3QkFDTCxZQUFZO3FCQUNmO29CQUNELFlBQVksRUFBRTt3QkFDVixpQkFBaUI7d0JBQ2pCLHFCQUFxQjt3QkFDckIsOEJBQThCO3FCQUNqQztvQkFDRCxPQUFPLEVBQUU7d0JBQ0wsaUJBQWlCO3dCQUNqQixxQkFBcUI7d0JBQ3JCLDhCQUE4QjtxQkFDakM7aUJBQ0oiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBOZ01vZHVsZSwgTW9kdWxlV2l0aFByb3ZpZGVycyB9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xyXG5pbXBvcnQgeyBDb21tb25Nb2R1bGUgfSBmcm9tICdAYW5ndWxhci9jb21tb24nO1xyXG5cclxuaW1wb3J0IHsgR3JpZHN0ZXJDb21wb25lbnQgfSBmcm9tICcuL2dyaWRzdGVyLmNvbXBvbmVudCc7XHJcbmltcG9ydCB7IEdyaWRzdGVySXRlbUNvbXBvbmVudCB9IGZyb20gJy4vZ3JpZHN0ZXItaXRlbS9ncmlkc3Rlci1pdGVtLmNvbXBvbmVudCc7XHJcbmltcG9ydCB7IEdyaWRzdGVySXRlbVByb3RvdHlwZURpcmVjdGl2ZSB9IGZyb20gJy4vZ3JpZHN0ZXItcHJvdG90eXBlL2dyaWRzdGVyLWl0ZW0tcHJvdG90eXBlLmRpcmVjdGl2ZSc7XHJcbmltcG9ydCB7IEdyaWRzdGVyUHJvdG90eXBlU2VydmljZSB9IGZyb20gJy4vZ3JpZHN0ZXItcHJvdG90eXBlL2dyaWRzdGVyLXByb3RvdHlwZS5zZXJ2aWNlJztcclxuXHJcbkBOZ01vZHVsZSh7XHJcbiAgICBpbXBvcnRzOiBbXHJcbiAgICAgICAgQ29tbW9uTW9kdWxlXHJcbiAgICBdLFxyXG4gICAgZGVjbGFyYXRpb25zOiBbXHJcbiAgICAgICAgR3JpZHN0ZXJDb21wb25lbnQsXHJcbiAgICAgICAgR3JpZHN0ZXJJdGVtQ29tcG9uZW50LFxyXG4gICAgICAgIEdyaWRzdGVySXRlbVByb3RvdHlwZURpcmVjdGl2ZVxyXG4gICAgXSxcclxuICAgIGV4cG9ydHM6IFtcclxuICAgICAgICBHcmlkc3RlckNvbXBvbmVudCxcclxuICAgICAgICBHcmlkc3Rlckl0ZW1Db21wb25lbnQsXHJcbiAgICAgICAgR3JpZHN0ZXJJdGVtUHJvdG90eXBlRGlyZWN0aXZlXHJcbiAgICBdXHJcbn0pXHJcbmV4cG9ydCBjbGFzcyBHcmlkc3Rlck1vZHVsZSB7XHJcbiAgICBzdGF0aWMgZm9yUm9vdCgpOiBNb2R1bGVXaXRoUHJvdmlkZXJzPEdyaWRzdGVyTW9kdWxlPiB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIG5nTW9kdWxlOiBHcmlkc3Rlck1vZHVsZSxcclxuICAgICAgICBwcm92aWRlcnM6IFtHcmlkc3RlclByb3RvdHlwZVNlcnZpY2VdXHJcbiAgICB9O1xyXG59XHJcbn1cclxuXHJcbiJdfQ==