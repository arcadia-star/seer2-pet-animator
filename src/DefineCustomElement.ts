import type { HTMLAttributes, PublicProps, EmitFn } from "vue";

// from: https://cn.vuejs.org/guide/extras/web-components.html#non-vue-web-components-and-typescript
export type DefineCustomElement<
  ElementType extends HTMLElement,
  Events extends EventMap = {},
  SelectedAttributes extends keyof ElementType = keyof ElementType
> = new () => ElementType & {
  /** @deprecated 不要在自定义元素引用上使用 $props 属性，
    这仅用于模板属性类型检查 */

  $props: HTMLAttributes &
    Partial<Pick<ElementType, SelectedAttributes>> &
    PublicProps;

  /** @deprecated 不要在自定义元素引用上使用 $emit 属性，
    这仅用于模板属性类型检查 */

  $emit: VueEmit<Events>;
};

type EventMap = {
  [event: string]: Event;
};

type VueEmit<T extends EventMap> = EmitFn<{
  [K in keyof T]: (event: T[K]) => void;
}>;
