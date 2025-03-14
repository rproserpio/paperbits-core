import { IInjectorModule, IInjector } from "@paperbits/common/injection";
import { PopupViewModel } from "./ko/popup";
import { PopupModelBinder } from "./popupModelBinder";
import { PopupViewModelBinder } from "./ko/popupViewModelBinder";
import { PopupHostViewModelBinder } from "./ko/popupHostViewModelBinder";
import { PopupHost } from "./ko/popupHost";
import { PopupHostModelBinder } from "./popupHostModelBinder";


export class PopupPublishModule implements IInjectorModule {
    public register(injector: IInjector): void {        
        injector.bind("popup", PopupViewModel);
        injector.bind("popupHost", PopupHost);
        injector.bindToCollection("modelBinders", PopupModelBinder, "popupModelBinder");
        injector.bindToCollection("modelBinders", PopupHostModelBinder, "popupHostModelBinder");
        injector.bindToCollection("viewModelBinders", PopupViewModelBinder, "popupViewModelBinder");
        injector.bindToCollection("viewModelBinders", PopupHostViewModelBinder, "popupHostViewModelBinder");
    }
}