﻿import * as ko from "knockout";

export interface StickToConfig {
    target: HTMLElement;

    /**
     * top, bottom, left, right, center
     */
    position: string;

    /**
     * border (default), corner
     */
    placement: string;
}

ko.bindingHandlers["stickTo"] = {
    init(element: HTMLElement, valueAccessor: () => StickToConfig): void {
        const config = valueAccessor();

        const updatePosition = () => {
            if (!config.target) {
                return;
            }

            const frameElement = config.target.ownerDocument.defaultView.frameElement;
            const frameRect = frameElement.getBoundingClientRect();
            const targetRect = config.target.getBoundingClientRect();

            const placement = config.placement || "border";
            let coordX: number;
            let coordY: number;

            element.style.right = null;
            element.style.left = null;

            coordX = targetRect.left + Math.floor((targetRect.width) / 2) - Math.floor(element.clientWidth / 2);
            coordY = targetRect.top + Math.floor((targetRect.height) / 2) - Math.floor(element.clientHeight / 2);

            if (config.position.indexOf("top") >= 0) {
                coordY = targetRect.top;

                if (placement === "border") {
                    coordY = coordY - Math.floor(element.clientHeight / 2);
                }
            }

            if (config.position.indexOf("bottom") >= 0) {
                coordY = targetRect.top + targetRect.height - element.clientHeight;

                if (placement === "border") {
                    coordY = coordY + Math.floor(element.clientHeight / 2);
                }
            }

            element.style.top = frameRect.top + coordY + "px";

            if (config.position.indexOf("left") >= 0) {
                element.style.left = frameRect.left + targetRect.left + 10 + "px";
            }
            else if (config.position.indexOf("right") >= 0) {
                element.style.right = frameRect.right - targetRect.right + 10 + "px";
            }
            else {
                element.style.left = frameRect.left + coordX + "px";
            }

            if (config.position.indexOf("parent-left") >= 0) {
                if (!config.target.parentElement) {
                    return;
                }

                const targetParentRect = config.target.parentElement.getBoundingClientRect();
                element.style.left = targetParentRect.left - Math.floor(element.clientWidth / 2) + "px";
            }

            if (config.position.indexOf("parent-top") >= 0) {
                if (!config.target.parentElement) {
                    return;
                }
                
                const targetParentRect = config.target.parentElement.getBoundingClientRect();
                element.style.top = targetParentRect.top - Math.floor(element.clientHeight / 2) + "px";
            }
        };

        updatePosition();

        const onScroll = async (event: MouseEvent): Promise<void> => {
            requestAnimationFrame(updatePosition);
        };

        window.addEventListener("scroll", onScroll, true);

        ko.utils.domNodeDisposal.addDisposeCallback(element, () => {
            window.removeEventListener("scroll", onScroll, true);
        });
    }
};
