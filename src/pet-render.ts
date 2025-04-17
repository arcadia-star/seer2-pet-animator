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
  private loadedResolve?: () => void;
  private _readyPromise!: Promise<void>;

  render() {
    return html`<div class="container"></div>`;
  }

  async connectedCallback() {
    super.connectedCallback();
    this._readyPromise = new Promise<void>((resolve) => {
      this.loadedResolve = resolve;
    });
    await this._loadRuffle();
    this._createPlayer();
    await this._readyPromise;
    console.log(`pet-render ${this._instanceId} ready`);
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

    window.addEventListener("message", (e) => this.handleEvent(e));
  }

  private handleEvent(e: MessageEvent) {
    if (!e.data || e.data.instanceId !== this._instanceId) return;

    switch (e.data.type) {
      case "animationComplete":
        this.dispatchEvent(
          new CustomEvent("animationComplete", {
            detail: {
              state: e.data.state,
              duration: e.data.duration,
              instanceId: this._instanceId,
            },
          })
        );
        break;
      case "hit":
        this.dispatchEvent(
          new CustomEvent("hit", {
            detail: {
              state: e.data.state,
              instanceId: this._instanceId,
            },
          })
        );
        break;
      case "petRenderCallbacksReady":
        this.dispatchEvent(
          new CustomEvent("ready", {
            detail: {
              instanceId: this._instanceId,
            },
          })
        );
        if (this.loadedResolve) this.loadedResolve();
        break;
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

  public async setState(state: ActionState) {
    await this._readyPromise;
    try {
      console.debug("setState", this._instanceId);
      this._player.setState(state);
    } catch (e) {
      throw new Error(`调用setState失败: ${e}`);
    }
  }

  public async getState() {
    await this._readyPromise;
    try {
      console.debug("getState", this._instanceId);
      return this._player.getState();
    } catch (e) {
      throw new Error(`调用getCurrentState失败: ${e}`);
    }
  }

  // 获取可用状态列表
  public async getAvailableStates() {
    await this._readyPromise;
    try {
      console.debug("getAvailableStates", this._instanceId);
      return this._player.getAvailableStates();
    } catch (e) {
      throw new Error(`调用getAvailableStates失败: ${e}`);
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._player?.remove();
    if (this.handleEvent) window.removeEventListener("message", this.handleEvent);
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
