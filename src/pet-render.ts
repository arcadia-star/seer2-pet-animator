import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { ActionState } from "./actionState";
const petContainer = new URL("./assets/petContainer.swf", import.meta.url).href;

let ruffleLoadPromise: Promise<void> | null = null;
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
  private _initialLoadComplete = false;
  private _messageHandler?: (e: MessageEvent) => void;

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
    this._initialLoadComplete = true;
    console.log(`pet-render ${this._instanceId} ready`);
  }

  private async _loadRuffle() {
    if (!(window as any).RufflePlayer) {
      if (!ruffleLoadPromise) {
        ruffleLoadPromise = new Promise<void>((resolve, reject) => {
          const element = document.createElement("script");
          element.src =
            "https://cdn.jsdelivr.net/npm/@ruffle-rs/ruffle/ruffle.min.js";
          element.async = true;
          element.onload = () => {
            console.log("Ruffle loaded");
            resolve();
          };
          element.onerror = () => {
            console.error("Failed to load Ruffle");
            ruffleLoadPromise = null; // Reset on error so it can be tried again
            reject(new Error("Failed to load Ruffle"));
          };
          document.head.appendChild(element);
        });
      }
      try {
        await ruffleLoadPromise;
      } catch (error) {
        console.error("Ruffle loading failed:", error);
        this._ruffleLoaded = false;
        return; 
      }
    }
    this._ruffleLoaded = true;
  }

  private _removeMessageListener() {
    if (this._messageHandler) {
      window.removeEventListener("message", this._messageHandler);
      this._messageHandler = undefined;
    }
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

    // 清理旧的事件监听器
    this._removeMessageListener();

    // 创建新的事件监听器
    this._messageHandler = (e) => this.handleEvent(e);
    window.addEventListener("message", this._messageHandler);
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

  private _updateScale() {
    if (!this._player) return;

    this._player.updateScale(this.scaleX, this.scaleY);
  }

  private _updatePlayerStyles() {
    if (this._player) {
      // CSS层面只处理反转，其他缩放交给ActionScript处理
      this._player.style.transform = this.reverse ? "scaleX(-1)" : "";
      this._player.style.width = "100%";
      this._player.style.height = "100%";
    }
  }

  async updated(changedProperties: Map<string, any>) {
    // 只有在初始加载完成后才等待ready状态
    if (this._initialLoadComplete) {
      await this._readyPromise;
    }

    const reloadProps = [
      "offsetX",
      "offsetY",
      "scale",
      "wmode",
      "salign",
    ];

    if (changedProperties.has("scaleX") || changedProperties.has("scaleY")) {
      this._updateScale();
    }

    // 如果只是url变化，使用loadNewAnimation方法而不是重载整个player
    if (this._initialLoadComplete && changedProperties.has("url") && changedProperties.size === 1) {
      this._loadNewAnimation();
      // URL切换后等待新的ready状态
      await this._readyPromise;
    }
    // 如果是其他需要重载的属性变化，则重载player
    else if (this._initialLoadComplete && reloadProps.some((prop) => changedProperties.has(prop))) {
      this._reloadPlayer();
      // 重载后等待ready状态
      await this._readyPromise;
    }
    // 如果url和其他属性同时变化，也需要重载player
    else if (this._initialLoadComplete && changedProperties.has("url") && reloadProps.some((prop) => changedProperties.has(prop))) {
      this._reloadPlayer();
      // 重载后等待ready状态
      await this._readyPromise;
    }

    if (changedProperties.has("reverse")) {
      this._updatePlayerStyles();
    }
  }

  private _reloadPlayer() {
    // 清理事件监听器
    this._removeMessageListener();

    if (this._player) {
      this.shadowRoot!.querySelector(".container")?.removeChild(this._player);
      this._player = null;
    }

    // 重置ready状态，创建新的Promise
    this._readyPromise = new Promise<void>((resolve) => {
      this.loadedResolve = resolve;
    });

    this._createPlayer();
  }

  private _loadNewAnimation() {
    if (!this._player) {
      console.warn("Player not available for loadNewAnimation");
      return;
    }

    try {
      console.debug("Loading new animation", this.url, this._instanceId);

      // 重置ready状态，创建新的Promise
      // 重要：必须在调用loadNewAnimation之前创建新的Promise
      this._readyPromise = new Promise<void>((resolve) => {
        this.loadedResolve = resolve;
      });

      // 检查player是否有loadNewAnimation方法
      if (typeof this._player.loadNewAnimation !== 'function') {
        console.warn("loadNewAnimation method not available, falling back to reload");
        this._reloadPlayer();
        return;
      }

      this._player.loadNewAnimation(this.url);
    } catch (e) {
      console.error("Failed to load new animation:", e);
      // 如果调用失败，回退到重载player
      this._reloadPlayer();
    }
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
    if (!this._player) {
      throw new Error("Player not available");
    }
    try {
      console.debug("setState", this._instanceId);
      this._player.setState(state);
    } catch (e) {
      throw new Error(`调用setState失败: ${e}`);
    }
  }

  public async getState() {
    await this._readyPromise;
    if (!this._player) {
      throw new Error("Player not available");
    }
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
    if (!this._player) {
      throw new Error("Player not available");
    }
    try {
      console.debug("getAvailableStates", this._instanceId);
      return this._player.getAvailableStates();
    } catch (e) {
      throw new Error(`调用getAvailableStates失败: ${e}`);
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._removeMessageListener();
    this._player?.remove();
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
