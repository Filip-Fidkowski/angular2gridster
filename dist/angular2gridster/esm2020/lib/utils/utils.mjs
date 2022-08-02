export const utils = {
    setCssElementPosition: function ($element, position) {
        $element.style.left = position.x + 'px';
        $element.style.top = position.y + 'px';
    },
    resetCSSElementPosition: function ($element) {
        $element.style.left = '';
        $element.style.top = '';
    },
    setTransform: function ($element, position) {
        const left = position.x;
        const top = position.y;
        // Replace unitless items with px
        const translate = `translate(${left}px,${top}px)`;
        $element.style['transform'] = translate;
        $element.style['WebkitTransform'] = translate;
        $element.style['MozTransform'] = translate;
        $element.style['msTransform'] = translate;
        $element.style['OTransform'] = translate;
    },
    resetTransform: function ($element) {
        $element.style['transform'] = '';
        $element.style['WebkitTransform'] = '';
        $element.style['MozTransform'] = '';
        $element.style['msTransform'] = '';
        $element.style['OTransform'] = '';
    },
    clearSelection: () => {
        if (document['selection']) {
            document['selection'].empty();
        }
        else if (window.getSelection) {
            window.getSelection().removeAllRanges();
        }
    },
    isElementFitContainer: function (element, containerEl) {
        const containerRect = containerEl.getBoundingClientRect();
        const elRect = element.getBoundingClientRect();
        return elRect.left > containerRect.left &&
            elRect.right < containerRect.right &&
            elRect.top > containerRect.top &&
            elRect.bottom < containerRect.bottom;
    },
    isElementIntersectContainer: function (element, containerEl) {
        const containerRect = containerEl.getBoundingClientRect();
        const elRect = element.getBoundingClientRect();
        const elWidth = elRect.right - elRect.left;
        const elHeight = elRect.bottom - elRect.top;
        return (elRect.left + (elWidth / 2)) > containerRect.left &&
            (elRect.right - (elWidth / 2)) < containerRect.right &&
            (elRect.top + (elHeight / 2)) > containerRect.top &&
            (elRect.bottom - (elHeight / 2)) < containerRect.bottom;
    },
    isElementTouchContainer: function (element, containerEl) {
        const containerRect = containerEl.getBoundingClientRect();
        const elRect = element.getBoundingClientRect();
        return elRect.right > containerRect.left &&
            elRect.bottom > containerRect.top &&
            elRect.left < containerRect.right &&
            elRect.top < containerRect.bottom;
    },
    isCursorAboveElement: function (event, element) {
        const elRect = element.getBoundingClientRect();
        return event.pageX > elRect.left &&
            event.pageX < elRect.right &&
            event.pageY > elRect.top &&
            event.pageY < elRect.bottom;
    },
    getElementOuterHeight: function ($element) {
        const styleObj = window.getComputedStyle($element);
        // NOTE: Manually calculating height because IE's `clientHeight` isn't always
        // reliable.
        return parseFloat(styleObj.getPropertyValue('height')) +
            parseFloat(styleObj.getPropertyValue('padding-top')) +
            parseFloat(styleObj.getPropertyValue('padding-bottom'));
    },
    getRelativeCoordinates: (element, parentElement) => {
        const parentElementRect = parentElement.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        return {
            top: elementRect.top - parentElementRect.top,
            left: elementRect.left - parentElementRect.left
        };
    },
    getScrollableContainer(node) {
        const regex = /(auto|scroll)/;
        const parents = (_node, ps) => {
            if (_node.parentNode === null) {
                return ps;
            }
            return parents(_node.parentNode, ps.concat([_node]));
        };
        const style = (_node, prop) => {
            return getComputedStyle(_node, null).getPropertyValue(prop);
        };
        const overflow = _node => {
            return (style(_node, 'overflow') + style(_node, 'overflow-y') + style(_node, 'overflow-x'));
        };
        const scroll = _node => regex.test(overflow(_node));
        /* eslint-disable consistent-return */
        const scrollParent = _node => {
            if (!(_node instanceof HTMLElement || _node instanceof SVGElement)) {
                return;
            }
            const ps = parents(_node.parentNode, []);
            for (let i = 0; i < ps.length; i += 1) {
                if (scroll(ps[i])) {
                    return ps[i];
                }
            }
            return document.scrollingElement || document.documentElement;
        };
        return scrollParent(node);
    }
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9wcm9qZWN0cy9hbmd1bGFyMmdyaWRzdGVyL3NyYy9saWIvdXRpbHMvdXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBR0EsTUFBTSxDQUFDLE1BQU0sS0FBSyxHQUFHO0lBQ2pCLHFCQUFxQixFQUFFLFVBQVUsUUFBcUIsRUFBRSxRQUFnQztRQUNwRixRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksR0FBRyxRQUFRLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQztRQUN4QyxRQUFRLENBQUMsS0FBSyxDQUFDLEdBQUcsR0FBRyxRQUFRLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQztJQUMzQyxDQUFDO0lBQ0QsdUJBQXVCLEVBQUUsVUFBVSxRQUFxQjtRQUNwRCxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksR0FBRyxFQUFFLENBQUM7UUFDekIsUUFBUSxDQUFDLEtBQUssQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDO0lBQzVCLENBQUM7SUFDRCxZQUFZLEVBQUUsVUFBVSxRQUFxQixFQUFFLFFBQWdDO1FBQzNFLE1BQU0sSUFBSSxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUM7UUFDeEIsTUFBTSxHQUFHLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQztRQUV2QixpQ0FBaUM7UUFDakMsTUFBTSxTQUFTLEdBQUcsYUFBYSxJQUFJLE1BQU0sR0FBRyxLQUFLLENBQUM7UUFFbEQsUUFBUSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsR0FBRyxTQUFTLENBQUM7UUFDeEMsUUFBUSxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLFNBQVMsQ0FBQztRQUM5QyxRQUFRLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxHQUFHLFNBQVMsQ0FBQztRQUMzQyxRQUFRLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxHQUFHLFNBQVMsQ0FBQztRQUMxQyxRQUFRLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxHQUFHLFNBQVMsQ0FBQztJQUM3QyxDQUFDO0lBQ0QsY0FBYyxFQUFFLFVBQVUsUUFBcUI7UUFDM0MsUUFBUSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDakMsUUFBUSxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUN2QyxRQUFRLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUNwQyxRQUFRLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUNuQyxRQUFRLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUUsQ0FBQztJQUN0QyxDQUFDO0lBQ0QsY0FBYyxFQUFFLEdBQUcsRUFBRTtRQUNqQixJQUFJLFFBQVEsQ0FBQyxXQUFXLENBQUMsRUFBRTtZQUN2QixRQUFRLENBQUMsV0FBVyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUM7U0FDakM7YUFBTSxJQUFJLE1BQU0sQ0FBQyxZQUFZLEVBQUU7WUFDNUIsTUFBTSxDQUFDLFlBQVksRUFBRSxDQUFDLGVBQWUsRUFBRSxDQUFDO1NBQzNDO0lBQ0wsQ0FBQztJQUNELHFCQUFxQixFQUFFLFVBQVUsT0FBb0IsRUFBRSxXQUF3QjtRQUMzRSxNQUFNLGFBQWEsR0FBRyxXQUFXLENBQUMscUJBQXFCLEVBQUUsQ0FBQztRQUMxRCxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMscUJBQXFCLEVBQUUsQ0FBQztRQUUvQyxPQUFPLE1BQU0sQ0FBQyxJQUFJLEdBQUcsYUFBYSxDQUFDLElBQUk7WUFDbkMsTUFBTSxDQUFDLEtBQUssR0FBRyxhQUFhLENBQUMsS0FBSztZQUNsQyxNQUFNLENBQUMsR0FBRyxHQUFHLGFBQWEsQ0FBQyxHQUFHO1lBQzlCLE1BQU0sQ0FBQyxNQUFNLEdBQUcsYUFBYSxDQUFDLE1BQU0sQ0FBQztJQUM3QyxDQUFDO0lBQ0QsMkJBQTJCLEVBQUUsVUFBVSxPQUFvQixFQUFFLFdBQXdCO1FBQ2pGLE1BQU0sYUFBYSxHQUFHLFdBQVcsQ0FBQyxxQkFBcUIsRUFBRSxDQUFDO1FBQzFELE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxxQkFBcUIsRUFBRSxDQUFDO1FBRS9DLE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxLQUFLLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQztRQUMzQyxNQUFNLFFBQVEsR0FBRyxNQUFNLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUM7UUFFNUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEdBQUcsQ0FBQyxPQUFPLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxhQUFhLENBQUMsSUFBSTtZQUNyRCxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsQ0FBQyxPQUFPLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxhQUFhLENBQUMsS0FBSztZQUNwRCxDQUFDLE1BQU0sQ0FBQyxHQUFHLEdBQUcsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxhQUFhLENBQUMsR0FBRztZQUNqRCxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxhQUFhLENBQUMsTUFBTSxDQUFDO0lBQ2hFLENBQUM7SUFDRCx1QkFBdUIsRUFBRSxVQUFVLE9BQW9CLEVBQUUsV0FBd0I7UUFDN0UsTUFBTSxhQUFhLEdBQUcsV0FBVyxDQUFDLHFCQUFxQixFQUFFLENBQUM7UUFDMUQsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLHFCQUFxQixFQUFFLENBQUM7UUFFL0MsT0FBTyxNQUFNLENBQUMsS0FBSyxHQUFHLGFBQWEsQ0FBQyxJQUFJO1lBQ3BDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsYUFBYSxDQUFDLEdBQUc7WUFDakMsTUFBTSxDQUFDLElBQUksR0FBRyxhQUFhLENBQUMsS0FBSztZQUNqQyxNQUFNLENBQUMsR0FBRyxHQUFHLGFBQWEsQ0FBQyxNQUFNLENBQUM7SUFDMUMsQ0FBQztJQUNELG9CQUFvQixFQUFFLFVBQVUsS0FBcUIsRUFBRSxPQUFPO1FBQzFELE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxxQkFBcUIsRUFBRSxDQUFDO1FBRS9DLE9BQU8sS0FBSyxDQUFDLEtBQUssR0FBRyxNQUFNLENBQUMsSUFBSTtZQUM1QixLQUFLLENBQUMsS0FBSyxHQUFHLE1BQU0sQ0FBQyxLQUFLO1lBQzFCLEtBQUssQ0FBQyxLQUFLLEdBQUcsTUFBTSxDQUFDLEdBQUc7WUFDeEIsS0FBSyxDQUFDLEtBQUssR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDO0lBQ3BDLENBQUM7SUFDRCxxQkFBcUIsRUFBRSxVQUFVLFFBQXFCO1FBQ2xELE1BQU0sUUFBUSxHQUFHLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNuRCw2RUFBNkU7UUFDN0UsWUFBWTtRQUNaLE9BQU8sVUFBVSxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUNsRCxVQUFVLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLGFBQWEsQ0FBQyxDQUFDO1lBQ3BELFVBQVUsQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDO0lBQ2hFLENBQUM7SUFDRCxzQkFBc0IsRUFBRSxDQUFDLE9BQU8sRUFBRSxhQUFhLEVBQStCLEVBQUU7UUFDNUUsTUFBTSxpQkFBaUIsR0FBRyxhQUFhLENBQUMscUJBQXFCLEVBQUUsQ0FBQztRQUNoRSxNQUFNLFdBQVcsR0FBRyxPQUFPLENBQUMscUJBQXFCLEVBQUUsQ0FBQztRQUVwRCxPQUFPO1lBQ0gsR0FBRyxFQUFFLFdBQVcsQ0FBQyxHQUFHLEdBQUcsaUJBQWlCLENBQUMsR0FBRztZQUM1QyxJQUFJLEVBQUUsV0FBVyxDQUFDLElBQUksR0FBRyxpQkFBaUIsQ0FBQyxJQUFJO1NBQ2xELENBQUM7SUFDTixDQUFDO0lBQ0Qsc0JBQXNCLENBQUMsSUFBSTtRQUN2QixNQUFNLEtBQUssR0FBRyxlQUFlLENBQUM7UUFDOUIsTUFBTSxPQUFPLEdBQUcsQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEVBQUU7WUFDMUIsSUFBSSxLQUFLLENBQUMsVUFBVSxLQUFLLElBQUksRUFBRTtnQkFDM0IsT0FBTyxFQUFFLENBQUM7YUFDYjtZQUNELE9BQU8sT0FBTyxDQUFDLEtBQUssQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN6RCxDQUFDLENBQUM7UUFFRixNQUFNLEtBQUssR0FBRyxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsRUFBRTtZQUMxQixPQUFPLGdCQUFnQixDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNoRSxDQUFDLENBQUM7UUFDRixNQUFNLFFBQVEsR0FBRyxLQUFLLENBQUMsRUFBRTtZQUNyQixPQUFPLENBQ0gsS0FBSyxDQUFDLEtBQUssRUFBRSxVQUFVLENBQUMsR0FBRyxLQUFLLENBQUMsS0FBSyxFQUFFLFlBQVksQ0FBQyxHQUFHLEtBQUssQ0FBQyxLQUFLLEVBQUUsWUFBWSxDQUFDLENBQ3JGLENBQUM7UUFDTixDQUFDLENBQUM7UUFDRixNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFFcEQsc0NBQXNDO1FBQ3RDLE1BQU0sWUFBWSxHQUFHLEtBQUssQ0FBQyxFQUFFO1lBQ3pCLElBQUksQ0FBQyxDQUFDLEtBQUssWUFBWSxXQUFXLElBQUksS0FBSyxZQUFZLFVBQVUsQ0FBQyxFQUFFO2dCQUNoRSxPQUFPO2FBQ1Y7WUFFRCxNQUFNLEVBQUUsR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUV6QyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUNuQyxJQUFJLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtvQkFDZixPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztpQkFDaEI7YUFDSjtZQUVELE9BQU8sUUFBUSxDQUFDLGdCQUFnQixJQUFJLFFBQVEsQ0FBQyxlQUFlLENBQUM7UUFDakUsQ0FBQyxDQUFDO1FBRUYsT0FBTyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDOUIsQ0FBQztDQUNKLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJcclxuaW1wb3J0IHsgRHJhZ2dhYmxlRXZlbnQgfSBmcm9tICcuL0RyYWdnYWJsZUV2ZW50JztcclxuXHJcbmV4cG9ydCBjb25zdCB1dGlscyA9IHtcclxuICAgIHNldENzc0VsZW1lbnRQb3NpdGlvbjogZnVuY3Rpb24gKCRlbGVtZW50OiBIVE1MRWxlbWVudCwgcG9zaXRpb246IHt4OiBudW1iZXIsIHk6IG51bWJlcn0pIHtcclxuICAgICAgICAkZWxlbWVudC5zdHlsZS5sZWZ0ID0gcG9zaXRpb24ueCArICdweCc7XHJcbiAgICAgICAgJGVsZW1lbnQuc3R5bGUudG9wID0gcG9zaXRpb24ueSArICdweCc7XHJcbiAgICB9LFxyXG4gICAgcmVzZXRDU1NFbGVtZW50UG9zaXRpb246IGZ1bmN0aW9uICgkZWxlbWVudDogSFRNTEVsZW1lbnQpIHtcclxuICAgICAgICAkZWxlbWVudC5zdHlsZS5sZWZ0ID0gJyc7XHJcbiAgICAgICAgJGVsZW1lbnQuc3R5bGUudG9wID0gJyc7XHJcbiAgICB9LFxyXG4gICAgc2V0VHJhbnNmb3JtOiBmdW5jdGlvbiAoJGVsZW1lbnQ6IEhUTUxFbGVtZW50LCBwb3NpdGlvbjoge3g6IG51bWJlciwgeTogbnVtYmVyfSkge1xyXG4gICAgICAgIGNvbnN0IGxlZnQgPSBwb3NpdGlvbi54O1xyXG4gICAgICAgIGNvbnN0IHRvcCA9IHBvc2l0aW9uLnk7XHJcblxyXG4gICAgICAgIC8vIFJlcGxhY2UgdW5pdGxlc3MgaXRlbXMgd2l0aCBweFxyXG4gICAgICAgIGNvbnN0IHRyYW5zbGF0ZSA9IGB0cmFuc2xhdGUoJHtsZWZ0fXB4LCR7dG9wfXB4KWA7XHJcblxyXG4gICAgICAgICRlbGVtZW50LnN0eWxlWyd0cmFuc2Zvcm0nXSA9IHRyYW5zbGF0ZTtcclxuICAgICAgICAkZWxlbWVudC5zdHlsZVsnV2Via2l0VHJhbnNmb3JtJ10gPSB0cmFuc2xhdGU7XHJcbiAgICAgICAgJGVsZW1lbnQuc3R5bGVbJ01velRyYW5zZm9ybSddID0gdHJhbnNsYXRlO1xyXG4gICAgICAgICRlbGVtZW50LnN0eWxlWydtc1RyYW5zZm9ybSddID0gdHJhbnNsYXRlO1xyXG4gICAgICAgICRlbGVtZW50LnN0eWxlWydPVHJhbnNmb3JtJ10gPSB0cmFuc2xhdGU7XHJcbiAgICB9LFxyXG4gICAgcmVzZXRUcmFuc2Zvcm06IGZ1bmN0aW9uICgkZWxlbWVudDogSFRNTEVsZW1lbnQpIHtcclxuICAgICAgICAkZWxlbWVudC5zdHlsZVsndHJhbnNmb3JtJ10gPSAnJztcclxuICAgICAgICAkZWxlbWVudC5zdHlsZVsnV2Via2l0VHJhbnNmb3JtJ10gPSAnJztcclxuICAgICAgICAkZWxlbWVudC5zdHlsZVsnTW96VHJhbnNmb3JtJ10gPSAnJztcclxuICAgICAgICAkZWxlbWVudC5zdHlsZVsnbXNUcmFuc2Zvcm0nXSA9ICcnO1xyXG4gICAgICAgICRlbGVtZW50LnN0eWxlWydPVHJhbnNmb3JtJ10gPSAnJztcclxuICAgIH0sXHJcbiAgICBjbGVhclNlbGVjdGlvbjogKCkgPT4ge1xyXG4gICAgICAgIGlmIChkb2N1bWVudFsnc2VsZWN0aW9uJ10pIHtcclxuICAgICAgICAgICAgZG9jdW1lbnRbJ3NlbGVjdGlvbiddLmVtcHR5KCk7XHJcbiAgICAgICAgfSBlbHNlIGlmICh3aW5kb3cuZ2V0U2VsZWN0aW9uKSB7XHJcbiAgICAgICAgICAgIHdpbmRvdy5nZXRTZWxlY3Rpb24oKS5yZW1vdmVBbGxSYW5nZXMoKTtcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG4gICAgaXNFbGVtZW50Rml0Q29udGFpbmVyOiBmdW5jdGlvbiAoZWxlbWVudDogSFRNTEVsZW1lbnQsIGNvbnRhaW5lckVsOiBIVE1MRWxlbWVudCk6IGJvb2xlYW4ge1xyXG4gICAgICAgIGNvbnN0IGNvbnRhaW5lclJlY3QgPSBjb250YWluZXJFbC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcclxuICAgICAgICBjb25zdCBlbFJlY3QgPSBlbGVtZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xyXG5cclxuICAgICAgICByZXR1cm4gZWxSZWN0LmxlZnQgPiBjb250YWluZXJSZWN0LmxlZnQgJiZcclxuICAgICAgICAgICAgZWxSZWN0LnJpZ2h0IDwgY29udGFpbmVyUmVjdC5yaWdodCAmJlxyXG4gICAgICAgICAgICBlbFJlY3QudG9wID4gY29udGFpbmVyUmVjdC50b3AgJiZcclxuICAgICAgICAgICAgZWxSZWN0LmJvdHRvbSA8IGNvbnRhaW5lclJlY3QuYm90dG9tO1xyXG4gICAgfSxcclxuICAgIGlzRWxlbWVudEludGVyc2VjdENvbnRhaW5lcjogZnVuY3Rpb24gKGVsZW1lbnQ6IEhUTUxFbGVtZW50LCBjb250YWluZXJFbDogSFRNTEVsZW1lbnQpOiBib29sZWFuIHtcclxuICAgICAgICBjb25zdCBjb250YWluZXJSZWN0ID0gY29udGFpbmVyRWwuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XHJcbiAgICAgICAgY29uc3QgZWxSZWN0ID0gZWxlbWVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcclxuXHJcbiAgICAgICAgY29uc3QgZWxXaWR0aCA9IGVsUmVjdC5yaWdodCAtIGVsUmVjdC5sZWZ0O1xyXG4gICAgICAgIGNvbnN0IGVsSGVpZ2h0ID0gZWxSZWN0LmJvdHRvbSAtIGVsUmVjdC50b3A7XHJcblxyXG4gICAgICAgIHJldHVybiAoZWxSZWN0LmxlZnQgKyAoZWxXaWR0aCAvIDIpKSA+IGNvbnRhaW5lclJlY3QubGVmdCAmJlxyXG4gICAgICAgICAgICAoZWxSZWN0LnJpZ2h0IC0gKGVsV2lkdGggLyAyKSkgPCBjb250YWluZXJSZWN0LnJpZ2h0ICYmXHJcbiAgICAgICAgICAgIChlbFJlY3QudG9wICsgKGVsSGVpZ2h0IC8gMikpID4gY29udGFpbmVyUmVjdC50b3AgJiZcclxuICAgICAgICAgICAgKGVsUmVjdC5ib3R0b20gLSAoZWxIZWlnaHQgLyAyKSkgPCBjb250YWluZXJSZWN0LmJvdHRvbTtcclxuICAgIH0sXHJcbiAgICBpc0VsZW1lbnRUb3VjaENvbnRhaW5lcjogZnVuY3Rpb24gKGVsZW1lbnQ6IEhUTUxFbGVtZW50LCBjb250YWluZXJFbDogSFRNTEVsZW1lbnQpOiBib29sZWFuIHtcclxuICAgICAgICBjb25zdCBjb250YWluZXJSZWN0ID0gY29udGFpbmVyRWwuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XHJcbiAgICAgICAgY29uc3QgZWxSZWN0ID0gZWxlbWVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIGVsUmVjdC5yaWdodCA+IGNvbnRhaW5lclJlY3QubGVmdCAmJlxyXG4gICAgICAgICAgICBlbFJlY3QuYm90dG9tID4gY29udGFpbmVyUmVjdC50b3AgJiZcclxuICAgICAgICAgICAgZWxSZWN0LmxlZnQgPCBjb250YWluZXJSZWN0LnJpZ2h0ICYmXHJcbiAgICAgICAgICAgIGVsUmVjdC50b3AgPCBjb250YWluZXJSZWN0LmJvdHRvbTtcclxuICAgIH0sXHJcbiAgICBpc0N1cnNvckFib3ZlRWxlbWVudDogZnVuY3Rpb24gKGV2ZW50OiBEcmFnZ2FibGVFdmVudCwgZWxlbWVudCk6IGJvb2xlYW4ge1xyXG4gICAgICAgIGNvbnN0IGVsUmVjdCA9IGVsZW1lbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XHJcblxyXG4gICAgICAgIHJldHVybiBldmVudC5wYWdlWCA+IGVsUmVjdC5sZWZ0ICYmXHJcbiAgICAgICAgICAgIGV2ZW50LnBhZ2VYIDwgZWxSZWN0LnJpZ2h0ICYmXHJcbiAgICAgICAgICAgIGV2ZW50LnBhZ2VZID4gZWxSZWN0LnRvcCAmJlxyXG4gICAgICAgICAgICBldmVudC5wYWdlWSA8IGVsUmVjdC5ib3R0b207XHJcbiAgICB9LFxyXG4gICAgZ2V0RWxlbWVudE91dGVySGVpZ2h0OiBmdW5jdGlvbiAoJGVsZW1lbnQ6IEhUTUxFbGVtZW50KSB7XHJcbiAgICAgICAgY29uc3Qgc3R5bGVPYmogPSB3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZSgkZWxlbWVudCk7XHJcbiAgICAgICAgLy8gTk9URTogTWFudWFsbHkgY2FsY3VsYXRpbmcgaGVpZ2h0IGJlY2F1c2UgSUUncyBgY2xpZW50SGVpZ2h0YCBpc24ndCBhbHdheXNcclxuICAgICAgICAvLyByZWxpYWJsZS5cclxuICAgICAgICByZXR1cm4gcGFyc2VGbG9hdChzdHlsZU9iai5nZXRQcm9wZXJ0eVZhbHVlKCdoZWlnaHQnKSkgK1xyXG4gICAgICAgICAgICBwYXJzZUZsb2F0KHN0eWxlT2JqLmdldFByb3BlcnR5VmFsdWUoJ3BhZGRpbmctdG9wJykpICtcclxuICAgICAgICAgICAgcGFyc2VGbG9hdChzdHlsZU9iai5nZXRQcm9wZXJ0eVZhbHVlKCdwYWRkaW5nLWJvdHRvbScpKTtcclxuICAgIH0sXHJcbiAgICBnZXRSZWxhdGl2ZUNvb3JkaW5hdGVzOiAoZWxlbWVudCwgcGFyZW50RWxlbWVudCk6IHt0b3A6IG51bWJlciwgbGVmdDogbnVtYmVyfSA9PiB7XHJcbiAgICAgICAgY29uc3QgcGFyZW50RWxlbWVudFJlY3QgPSBwYXJlbnRFbGVtZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xyXG4gICAgICAgIGNvbnN0IGVsZW1lbnRSZWN0ID0gZWxlbWVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgdG9wOiBlbGVtZW50UmVjdC50b3AgLSBwYXJlbnRFbGVtZW50UmVjdC50b3AsXHJcbiAgICAgICAgICAgIGxlZnQ6IGVsZW1lbnRSZWN0LmxlZnQgLSBwYXJlbnRFbGVtZW50UmVjdC5sZWZ0XHJcbiAgICAgICAgfTtcclxuICAgIH0sXHJcbiAgICBnZXRTY3JvbGxhYmxlQ29udGFpbmVyKG5vZGUpIHtcclxuICAgICAgICBjb25zdCByZWdleCA9IC8oYXV0b3xzY3JvbGwpLztcclxuICAgICAgICBjb25zdCBwYXJlbnRzID0gKF9ub2RlLCBwcykgPT4ge1xyXG4gICAgICAgICAgICBpZiAoX25vZGUucGFyZW50Tm9kZSA9PT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHBzO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBwYXJlbnRzKF9ub2RlLnBhcmVudE5vZGUsIHBzLmNvbmNhdChbX25vZGVdKSk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgY29uc3Qgc3R5bGUgPSAoX25vZGUsIHByb3ApID0+IHtcclxuICAgICAgICAgICAgcmV0dXJuIGdldENvbXB1dGVkU3R5bGUoX25vZGUsIG51bGwpLmdldFByb3BlcnR5VmFsdWUocHJvcCk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICBjb25zdCBvdmVyZmxvdyA9IF9ub2RlID0+IHtcclxuICAgICAgICAgICAgcmV0dXJuIChcclxuICAgICAgICAgICAgICAgIHN0eWxlKF9ub2RlLCAnb3ZlcmZsb3cnKSArIHN0eWxlKF9ub2RlLCAnb3ZlcmZsb3cteScpICsgc3R5bGUoX25vZGUsICdvdmVyZmxvdy14JylcclxuICAgICAgICAgICAgKTtcclxuICAgICAgICB9O1xyXG4gICAgICAgIGNvbnN0IHNjcm9sbCA9IF9ub2RlID0+IHJlZ2V4LnRlc3Qob3ZlcmZsb3coX25vZGUpKTtcclxuXHJcbiAgICAgICAgLyogZXNsaW50LWRpc2FibGUgY29uc2lzdGVudC1yZXR1cm4gKi9cclxuICAgICAgICBjb25zdCBzY3JvbGxQYXJlbnQgPSBfbm9kZSA9PiB7XHJcbiAgICAgICAgICAgIGlmICghKF9ub2RlIGluc3RhbmNlb2YgSFRNTEVsZW1lbnQgfHwgX25vZGUgaW5zdGFuY2VvZiBTVkdFbGVtZW50KSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCBwcyA9IHBhcmVudHMoX25vZGUucGFyZW50Tm9kZSwgW10pO1xyXG5cclxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBwcy5sZW5ndGg7IGkgKz0gMSkge1xyXG4gICAgICAgICAgICAgICAgaWYgKHNjcm9sbChwc1tpXSkpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcHNbaV07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybiBkb2N1bWVudC5zY3JvbGxpbmdFbGVtZW50IHx8IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudDtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICByZXR1cm4gc2Nyb2xsUGFyZW50KG5vZGUpO1xyXG4gICAgfVxyXG59O1xyXG4iXX0=