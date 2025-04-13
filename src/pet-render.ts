import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { ActionState } from "./actionState";
const petContainer = new URL("./assets/petContainer.swf", import.meta.url).href;
declare global {
  interface Window {
    handleEventFromSWF: (eventName: string, data: any) => void;
  }
  interface HTMLElementTagNameMap {
    "pet-render": PetRenderer;
  }
}

@customElement("pet-render")
export class PetRenderer extends LitElement {
  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
    .container {
      width: 100%;
      height: 100%;
      pointer-events: none;
    }
  `;

  @property({ type: String }) url = "";
  @property({ type: Boolean }) reverse = false;
  @property({ type: String }) scale = "noscale";
  @property({ type: Number }) offsetX = 120;
  @property({ type: Number }) offsetY = 50;
  @property({ type: Number }) scaleX = 1;
  @property({ type: Number }) scaleY = 1;
  @property({ type: String }) wmode = "transparent";
  @property({ type: String }) salign = "";

  @state() private _player: any = null;
  private _instanceId = Math.random().toString(36).substring(2, 15);
  private _ruffleLoaded = false;
  private listener: ((e: Event) => void) | null = null;

  render() {
    return html`<div class="container"></div>`;
  }

  async firstUpdated() {
    await this._loadRuffle();
    this._createPlayer();
  }


  private async _loadRuffle() {
    if (!(window as any).RufflePlayer) {
      const element = document.createElement("script");
      element.src =
        "https://cdn.jsdelivr.net/npm/@ruffle-rs/ruffle/ruffle.min.js";
      element.async = true;
      const loadPromise = new Promise<void>((resolve) => {
        element.onload = () => {
          console.log("Ruffle loaded");
          resolve();
        };
        element.onerror = () => {
          console.error("Failed to load Ruffle");
          resolve();
        };
      });
      document.head.appendChild(element);
      await loadPromise;
    }
    this._ruffleLoaded = true;
  }

  private _createPlayer() {
    if (!this._ruffleLoaded) return;

    const container = this.shadowRoot!.querySelector(".container");
    const Ruffle = (window as any).RufflePlayer!.newest();

    if (!container) {
      console.error("Container element not found");
      return;
    }
    if (this._player) {
      console.error("Player already exists");
      return;
    }
    this._player = Ruffle.createPlayer();
    this._updatePlayerStyles();

    container!.appendChild(this._player);

    this._player.ruffle().load({
      url: this._buildSwfUrl(),
      allowScriptAccess: true,
      wmode: this.wmode,
      autoplay: "on",
      unmuteOverlay: "hidden",
      upgradeToHttps: window.location.protocol === "https:",
      splashScreen: false,
      scale: this.scale,
      salign: this.salign,
      menu: false,
    });

    this.listener = (e) => {
      this.handleEvent.call(this,e)
    }
    window.addEventListener("message", this.listener );

    if (!window.handleEventFromSWF) {
      window.handleEventFromSWF = (eventName, data) => {
        console.debug(`收到 SWF 事件: ${eventName}`, data);
        // 确保所有事件都包含instanceId
        const eventData = {
          ...data,
          instanceId: data?.instanceId || "",
        };

        // 只处理匹配当前实例ID的事件
        if (eventData.instanceId !== this._instanceId) {
          console.debug(
            `忽略不匹配实例的事件: ${eventName} (期望: ${this._instanceId}, 收到: ${eventData.instanceId})`
          );
          return;
        }
        switch (eventName) {
          case "animationComplete":
            this.dispatchEvent(
              new CustomEvent<AnimationCompleteEventDetail>(
                "animationComplete",
                {
                  detail: eventData,
                }
              )
            );
            break;
          case "hit":
            this.dispatchEvent(
              new CustomEvent<HitEventDetail>("hit", {
                detail: eventData,
              })
            );
            break;
          default:
            console.warn(`未知事件: ${eventName}`);
        }
      };
    }
  }

  private handleEvent(e: any){
    if (e.data?.type === "petRenderCallbacksReady") {
      // 确保事件包含instanceId且匹配当前实例
      if (e.data.instanceId === this._instanceId) {
        this.dispatchEvent(new CustomEvent<BasePetEventDetail>("ready"));
      } else {
        console.debug(
          `忽略不匹配实例的回调就绪事件 (期望: ${this._instanceId}, 收到: ${e.data.instanceId})`
        );
      }
    }
  }

  private _buildSwfUrl() {
    const params = new URLSearchParams({
      url: this.url,
      instanceId: this._instanceId,
      scale: this.scale,
      offsetX: this.offsetX.toString(),
      offsetY: this.offsetY.toString(),
      scaleX: this.scaleX.toString(),
      scaleY: this.scaleY.toString(),
    });
    return `${petContainer}?${params}`;
  }

  private _updatePlayerStyles() {
    if (this._player) {
      this._player.style.transform = this.reverse ? "scaleX(-1)" : "";
      this._player.style.width = "100%";
      this._player.style.height = "100%";
    }
  }

  updated(changedProperties: Map<string, any>) {
    const reloadProps = [
      "url",
      "offsetX",
      "offsetY",
      "scaleX",
      "scaleY",
      "scale",
      "wmode",
      "salign",
    ];
    if (reloadProps.some((prop) => changedProperties.has(prop))) {
      this._reloadPlayer();
    }
    if (changedProperties.has("reverse")) {
      this._updatePlayerStyles();
    }
  }

  private _reloadPlayer() {
    if (this._player) {
      this.shadowRoot!.querySelector(".container")?.removeChild(this._player);
      this._player = null;
    }
    this._createPlayer();
  }

  // 公共方法
  play() {
    this._player?.play();
  }

  pause() {
    this._player?.pause();
  }

  public setState(state: ActionState) {
    if (!this._player) return;
    try {
      console.debug("setState", this._instanceId);
      this._player.setState(state);
    } catch (e) {
      console.error("调用setState失败:", e);
    }
  }

  public getState() {
    if (!this._player) return null;
    try {
      console.debug("getState", this._instanceId);
      return this._player.getState();
    } catch (e) {
      console.error("调用getCurrentState失败:", e);
      return null;
    }
  }

  // 获取可用状态列表
  public getAvailableStates() {
    if (!this._player) return [];
    try {
      console.debug("getAvailableStates", this._instanceId);
      return this._player.getAvailableStates();
    } catch (e) {
      console.error("调用getAvailableStates失败:", e);
      return [];
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._player?.remove();
    if(this.listener) window.removeEventListener('hit',this.listener)
  }
}

interface BasePetEventDetail {
  instanceId: string;
}

interface AnimationCompleteEventDetail extends BasePetEventDetail {
  animationName: string;
  loopCount?: number;
}

interface HitEventDetail extends BasePetEventDetail {
  hitType: "click" | "collision";
  position: {
    x: number;
    y: number;
  };
}

export type PetRendererEvent = {
  animationComplete: CustomEvent<AnimationCompleteEventDetail>;
  hit: CustomEvent<HitEventDetail>;
  ready: CustomEvent<BasePetEventDetail>;
};

export type PetRendererAttributes =
  | "url"
  | "reverse"
  | "scale"
  | "offsetX"
  | "offsetY"
  | "scaleX"
  | "scaleY"
  | "wmode"
  | "salign";

export * from "./DefineCustomElement";
export * from "./actionState";
export * from "./pet-render.vue";
