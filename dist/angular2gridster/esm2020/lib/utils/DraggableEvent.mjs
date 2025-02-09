export class DraggableEvent {
    constructor(event) {
        if (event.touches) {
            this.touchEvent = event;
            this.setDataFromTouchEvent(this.touchEvent);
        }
        else {
            this.mouseEvent = event;
            this.setDataFromMouseEvent(this.mouseEvent);
        }
    }
    isTouchEvent() {
        return !!this.touchEvent;
    }
    pauseEvent() {
        const event = this.touchEvent || this.mouseEvent;
        if (event.stopPropagation) {
            event.stopPropagation();
        }
        if (event.preventDefault) {
            event.preventDefault();
        }
        event.cancelBubble = true;
        event.returnValue = false;
        return false;
    }
    getRelativeCoordinates(container) {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft || document.body.scrollLeft;
        const rect = container.getBoundingClientRect();
        return {
            x: this.pageX - rect.left - scrollLeft,
            y: this.pageY - rect.top - scrollTop,
        };
    }
    setDataFromMouseEvent(event) {
        this.target = event.target;
        this.clientX = event.clientX;
        this.clientY = event.clientY;
        this.pageX = event.pageX;
        this.pageY = event.pageY;
        this.type = event.type;
    }
    setDataFromTouchEvent(event) {
        const touch = event.touches[0] || event.changedTouches[0];
        this.target = event.target;
        this.clientX = touch.clientX;
        this.clientY = touch.clientY;
        this.pageX = touch.pageX;
        this.pageY = touch.pageY;
        this.type = event.type;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRHJhZ2dhYmxlRXZlbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9wcm9qZWN0cy9hbmd1bGFyMmdyaWRzdGVyL3NyYy9saWIvdXRpbHMvRHJhZ2dhYmxlRXZlbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsTUFBTSxPQUFPLGNBQWM7SUFrQnZCLFlBQVksS0FBVTtRQUNsQixJQUFJLEtBQUssQ0FBQyxPQUFPLEVBQUU7WUFDZixJQUFJLENBQUMsVUFBVSxHQUFnQixLQUFNLENBQUM7WUFDdEMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztTQUMvQzthQUFNO1lBQ0gsSUFBSSxDQUFDLFVBQVUsR0FBZ0IsS0FBTSxDQUFDO1lBQ3RDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7U0FDL0M7SUFDTCxDQUFDO0lBRUQsWUFBWTtRQUNSLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUM7SUFDN0IsQ0FBQztJQUVELFVBQVU7UUFDTixNQUFNLEtBQUssR0FBVSxJQUFJLENBQUMsVUFBVSxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUM7UUFFeEQsSUFBSSxLQUFLLENBQUMsZUFBZSxFQUFFO1lBQ3ZCLEtBQUssQ0FBQyxlQUFlLEVBQUUsQ0FBQztTQUMzQjtRQUNELElBQUksS0FBSyxDQUFDLGNBQWMsRUFBRTtZQUN0QixLQUFLLENBQUMsY0FBYyxFQUFFLENBQUM7U0FDMUI7UUFDRCxLQUFLLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQztRQUMxQixLQUFLLENBQUMsV0FBVyxHQUFHLEtBQUssQ0FBQztRQUMxQixPQUFPLEtBQUssQ0FBQztJQUNqQixDQUFDO0lBRUQsc0JBQXNCLENBQUMsU0FBc0I7UUFDekMsTUFBTSxTQUFTLEdBQUcsTUFBTSxDQUFDLFdBQVcsSUFBSSxRQUFRLENBQUMsZUFBZSxDQUFDLFNBQVMsSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQztRQUN0RyxNQUFNLFVBQVUsR0FBRyxNQUFNLENBQUMsV0FBVyxJQUFJLFFBQVEsQ0FBQyxlQUFlLENBQUMsVUFBVSxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDO1FBRXpHLE1BQU0sSUFBSSxHQUFHLFNBQVMsQ0FBQyxxQkFBcUIsRUFBRSxDQUFDO1FBRS9DLE9BQU87WUFDSCxDQUFDLEVBQUUsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsSUFBSSxHQUFHLFVBQVU7WUFDdEMsQ0FBQyxFQUFFLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxTQUFTO1NBQ3ZDLENBQUM7SUFDTixDQUFDO0lBRU8scUJBQXFCLENBQUMsS0FBaUI7UUFDM0MsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDO1FBQzNCLElBQUksQ0FBQyxPQUFPLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQztRQUM3QixJQUFJLENBQUMsT0FBTyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUM7UUFDN0IsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDO1FBQ3pCLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQztRQUN6QixJQUFJLENBQUMsSUFBSSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUM7SUFDM0IsQ0FBQztJQUVPLHFCQUFxQixDQUFDLEtBQWlCO1FBQzNDLE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUUxRCxJQUFJLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUM7UUFDM0IsSUFBSSxDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDO1FBQzdCLElBQUksQ0FBQyxPQUFPLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQztRQUM3QixJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUM7UUFDekIsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDO1FBQ3pCLElBQUksQ0FBQyxJQUFJLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQztJQUUzQixDQUFDO0NBQ0oiLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgY2xhc3MgRHJhZ2dhYmxlRXZlbnQge1xyXG4gICAgY2xpZW50WDogbnVtYmVyO1xyXG5cclxuICAgIGNsaWVudFk6IG51bWJlcjtcclxuXHJcbiAgICBwYWdlWDogbnVtYmVyO1xyXG5cclxuICAgIHBhZ2VZOiBudW1iZXI7XHJcblxyXG4gICAgdGFyZ2V0OiBhbnk7XHJcblxyXG4gICAgdHlwZTogc3RyaW5nO1xyXG5cclxuXHJcbiAgICBwcml2YXRlIHRvdWNoRXZlbnQ6IFRvdWNoRXZlbnQ7XHJcblxyXG4gICAgcHJpdmF0ZSBtb3VzZUV2ZW50OiBNb3VzZUV2ZW50O1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKGV2ZW50OiBhbnkpIHtcclxuICAgICAgICBpZiAoZXZlbnQudG91Y2hlcykge1xyXG4gICAgICAgICAgICB0aGlzLnRvdWNoRXZlbnQgPSAoPFRvdWNoRXZlbnQ+ZXZlbnQpO1xyXG4gICAgICAgICAgICB0aGlzLnNldERhdGFGcm9tVG91Y2hFdmVudCh0aGlzLnRvdWNoRXZlbnQpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMubW91c2VFdmVudCA9ICg8TW91c2VFdmVudD5ldmVudCk7XHJcbiAgICAgICAgICAgIHRoaXMuc2V0RGF0YUZyb21Nb3VzZUV2ZW50KHRoaXMubW91c2VFdmVudCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGlzVG91Y2hFdmVudCgpOiBib29sZWFuIHtcclxuICAgICAgICByZXR1cm4gISF0aGlzLnRvdWNoRXZlbnQ7XHJcbiAgICB9XHJcblxyXG4gICAgcGF1c2VFdmVudCgpIHtcclxuICAgICAgICBjb25zdCBldmVudDogRXZlbnQgPSB0aGlzLnRvdWNoRXZlbnQgfHwgdGhpcy5tb3VzZUV2ZW50O1xyXG5cclxuICAgICAgICBpZiAoZXZlbnQuc3RvcFByb3BhZ2F0aW9uKSB7XHJcbiAgICAgICAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoZXZlbnQucHJldmVudERlZmF1bHQpIHtcclxuICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZXZlbnQuY2FuY2VsQnViYmxlID0gdHJ1ZTtcclxuICAgICAgICBldmVudC5yZXR1cm5WYWx1ZSA9IGZhbHNlO1xyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuXHJcbiAgICBnZXRSZWxhdGl2ZUNvb3JkaW5hdGVzKGNvbnRhaW5lcjogSFRNTEVsZW1lbnQpOiB7eDogbnVtYmVyLCB5OiBudW1iZXJ9IHtcclxuICAgICAgICBjb25zdCBzY3JvbGxUb3AgPSB3aW5kb3cucGFnZVlPZmZzZXQgfHwgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnNjcm9sbFRvcCB8fCBkb2N1bWVudC5ib2R5LnNjcm9sbFRvcDtcclxuICAgICAgICBjb25zdCBzY3JvbGxMZWZ0ID0gd2luZG93LnBhZ2VYT2Zmc2V0IHx8IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zY3JvbGxMZWZ0IHx8IGRvY3VtZW50LmJvZHkuc2Nyb2xsTGVmdDtcclxuXHJcbiAgICAgICAgY29uc3QgcmVjdCA9IGNvbnRhaW5lci5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgeDogdGhpcy5wYWdlWCAtIHJlY3QubGVmdCAtIHNjcm9sbExlZnQsXHJcbiAgICAgICAgICAgIHk6IHRoaXMucGFnZVkgLSByZWN0LnRvcCAtIHNjcm9sbFRvcCxcclxuICAgICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgc2V0RGF0YUZyb21Nb3VzZUV2ZW50KGV2ZW50OiBNb3VzZUV2ZW50KTogdm9pZCB7XHJcbiAgICAgICAgdGhpcy50YXJnZXQgPSBldmVudC50YXJnZXQ7XHJcbiAgICAgICAgdGhpcy5jbGllbnRYID0gZXZlbnQuY2xpZW50WDtcclxuICAgICAgICB0aGlzLmNsaWVudFkgPSBldmVudC5jbGllbnRZO1xyXG4gICAgICAgIHRoaXMucGFnZVggPSBldmVudC5wYWdlWDtcclxuICAgICAgICB0aGlzLnBhZ2VZID0gZXZlbnQucGFnZVk7XHJcbiAgICAgICAgdGhpcy50eXBlID0gZXZlbnQudHlwZTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHNldERhdGFGcm9tVG91Y2hFdmVudChldmVudDogVG91Y2hFdmVudCk6IHZvaWQge1xyXG4gICAgICAgIGNvbnN0IHRvdWNoID0gZXZlbnQudG91Y2hlc1swXSB8fCBldmVudC5jaGFuZ2VkVG91Y2hlc1swXTtcclxuXHJcbiAgICAgICAgdGhpcy50YXJnZXQgPSBldmVudC50YXJnZXQ7XHJcbiAgICAgICAgdGhpcy5jbGllbnRYID0gdG91Y2guY2xpZW50WDtcclxuICAgICAgICB0aGlzLmNsaWVudFkgPSB0b3VjaC5jbGllbnRZO1xyXG4gICAgICAgIHRoaXMucGFnZVggPSB0b3VjaC5wYWdlWDtcclxuICAgICAgICB0aGlzLnBhZ2VZID0gdG91Y2gucGFnZVk7XHJcbiAgICAgICAgdGhpcy50eXBlID0gZXZlbnQudHlwZTtcclxuXHJcbiAgICB9XHJcbn1cclxuIl19