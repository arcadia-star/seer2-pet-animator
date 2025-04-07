import type { PetRenderer, PetRendererAttributes, PetRendererEvent } from "./pet-render";
import type { DefineCustomElement } from "./DefineCustomElement";

// 将新元素类型添加到 Vue 的 GlobalComponents 类型中
declare module "vue" {
  interface GlobalComponents {
    "pet-render": DefineCustomElement<PetRenderer,
    PetRendererEvent,
    PetRendererAttributes
    >;
  }
}
