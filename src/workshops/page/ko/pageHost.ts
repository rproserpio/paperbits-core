import * as ko from "knockout";
import { Contract } from "@paperbits/common";
import { EventManager } from "@paperbits/common/events";
import { Component, OnDestroyed, OnMounted, Param } from "@paperbits/common/ko/decorators";
import { ILayoutService } from "@paperbits/common/layouts";
import { IPageService } from "@paperbits/common/pages";
import { Route, Router } from "@paperbits/common/routing";
import { StyleCompiler, StyleManager } from "@paperbits/common/styles";
import { ViewManager, ViewManagerMode } from "@paperbits/common/ui";
import { ContentViewModel, ContentViewModelBinder } from "../../../content/ko";
import { PopupHostViewModelBinder } from "../../../popup/ko/popupHostViewModelBinder";
import { PopupHost } from "../../../popup/ko/popupHost";


@Component({
    selector: "page-host",
    template: "<!-- ko if: popupHostViewModel --><!-- ko widget: popupHostViewModel --><!-- /ko --><!-- /ko -->      <!-- ko if: contentViewModel --><!-- ko widget: contentViewModel, grid: {} --><!-- /ko --><!-- /ko -->"
})
export class PageHost {
    public readonly contentViewModel: ko.Observable<ContentViewModel>;
    public readonly popupHostViewModel: ko.Observable<PopupHost>;

    constructor(
        private readonly contentViewModelBinder: ContentViewModelBinder,
        private readonly popupHostViewModelBinder: PopupHostViewModelBinder,
        private readonly router: Router,
        private readonly eventManager: EventManager,
        private readonly viewManager: ViewManager,
        private readonly layoutService: ILayoutService,
        private readonly pageService: IPageService,
        private readonly styleCompiler: StyleCompiler
    ) {
        this.contentViewModel = ko.observable();
        this.popupHostViewModel = ko.observable();
        this.pageKey = ko.observable();
    }

    @Param()
    public pageKey: ko.Observable<string>;

    @OnMounted()
    public async initialize(): Promise<void> {
        await this.refreshContent();

        this.router.addRouteChangeListener(this.onRouteChange);
        this.eventManager.addEventListener("onDataPush", () => this.onDataPush());
        this.eventManager.addEventListener("onLocaleChange", () => this.onLocaleUpdate());
    }

    /**
     * This event occurs when data gets pushed to the storage. For example, "Undo" command restores the previous state.
     */
    private async onDataPush(): Promise<void> {
        if (this.viewManager.mode === ViewManagerMode.selecting || this.viewManager.mode === ViewManagerMode.selected) {
            await this.refreshContent();
        }
    }

    private async onLocaleUpdate(): Promise<void> {
        await this.refreshContent();
    }

    private async refreshContent(): Promise<void> {
        this.viewManager.setShutter();

        const route = this.router.getCurrentRoute();
        let pageContract = await this.pageService.getPageByPermalink(route.path);

        if (!pageContract) {
            pageContract = await this.pageService.getPageByPermalink("/404");

            if (!pageContract) {
                this.viewManager.removeShutter();
                return;
            }
        }

        const pageContentContract = await this.pageService.getPageContent(pageContract.key);

        this.pageKey(pageContract.key);

        const styleManager = new StyleManager(this.eventManager);
        const styleSheet = await this.styleCompiler.getStyleSheet();
        styleManager.setStyleSheet(styleSheet);

        const pageBindingContext = {
            contentItemKey: pageContract.key,
            styleManager: styleManager,
            navigationPath: route.path,
            contentType: "page",
            template: { // Template here describes what fields of particular content type.
                page: {
                    value: pageContentContract,
                    onValueUpdate: async (updatedContentContract: Contract) => {
                        await this.pageService.updatePageContent(pageContract.key, updatedContentContract);
                    }
                }
            }
        };

        const layoutContract = await this.layoutService.getLayoutByPermalink(route.path);

        if (!layoutContract) {
            throw new Error(`No matching layouts found for page with permalink "${route.path}".`);
        }

        const layoutContentContract = await this.layoutService.getLayoutContent(layoutContract.key);
        const layoutContentViewModel = await this.contentViewModelBinder.contractToViewModel(layoutContentContract, pageBindingContext);
        layoutContentViewModel["widgetBinding"].provides = ["html", "js", "interaction"];

        this.contentViewModel(layoutContentViewModel);


        /* Popups */
        const popupBindingContext = {
            styleManager: styleManager,
            navigationPath: route.path,
            contentType: "popup"
        };

        const popupHostViewModel = await this.popupHostViewModelBinder.contractToViewModel(popupBindingContext);
        popupHostViewModel["widgetBinding"].provides = ["html", "js", "interaction"];

        this.popupHostViewModel(popupHostViewModel);

        this.viewManager.removeShutter();

        if (!location.hash) {
            return;
        }

        this.jumpToAnchor();
    }

    private async onRouteChange(route: Route): Promise<void> {
        if (route.previous && route.previous.path === route.path) {
            return;
        }

        await this.refreshContent();
    }

    private jumpToAnchor(): void {
        const hostDocument = this.viewManager.getHostDocument();
        const anchorElementSelector = location.hash;
        const anchorElement = hostDocument.querySelector(anchorElementSelector);

        if (anchorElement) {
            anchorElement.scrollIntoView();
        }
    }

    @OnDestroyed()
    public dispose(): void {
        this.router.removeRouteChangeListener(this.onRouteChange);
    }
}