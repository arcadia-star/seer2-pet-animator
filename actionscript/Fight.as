package
{
    import flash.display.Loader;
    import flash.display.MovieClip;
    import flash.display.Sprite;
    import flash.events.Event;
    import flash.external.ExternalInterface;
    import flash.net.URLRequest;
    import flash.system.ApplicationDomain;
    import flash.system.Security;
    import FighterActionType;

    public class Fight extends Sprite
    {
        private var mc:MovieClip;
        private var activeAnimationMC:MovieClip;
        private var currentState:String = FighterActionType.BLANK;

        public function Fight()
        {
            Security.allowDomain("*");
            configureStage();
            setupExternalInterface();
            loadAnimation(loaderInfo.parameters.url || "default.swf");
        }

        private function configureStage():void
        {
            stage.scaleMode = loaderInfo.parameters.scale || "noScale";

            var offsetX:Number = Number(loaderInfo.parameters.offsetX) || 120;
            var offsetY:Number = Number(loaderInfo.parameters.offsetY) || 50;

            this.x = offsetX;
            this.y = offsetY;
            this.scaleX = Number(loaderInfo.parameters.scaleX) || 1;
            this.scaleY = Number(loaderInfo.parameters.scaleY) || 1;
        }

        private function setupExternalInterface():void
        {
            try
            {
                ExternalInterface.addCallback("setState", setState);
                ExternalInterface.addCallback("getState", getState);
                ExternalInterface.addCallback("getAvailableStates", getAvailableStates);
                ExternalInterface.addCallback("setOffset", setOffset);
                ExternalInterface.addCallback("updateScale", updateScale);
            }
            catch (e:Error)
            {
                trace("External interface unavailable");
            }
        }

        private function loadAnimation(url:String):void
        {
            var loader:Loader = new Loader();
            loader.contentLoaderInfo.addEventListener(Event.COMPLETE, function(e:Event):void
                {
                    initMovieClip(loader);
                    reportAnimationInfo();
                    setState(FighterActionType.IDLE);
                    ExternalInterface.call("postMessage",
                            {
                                type: 'petRenderCallbacksReady',
                                instanceId: loaderInfo.parameters.instanceId
                            },
                            '*');
                });
            var finalUrl:String = url;
            if (url.indexOf("http://") === 0)
            {
                finalUrl = url.replace("http://", "https://");
            }
            loader.load(new URLRequest(finalUrl));
        }

        private function setState(state:String):void
        {
            if (!mc)
            {
                trace('Error: not has mc');
                return;
            }
            if (state == currentState)
                return;
            if (activeAnimationMC)
            {
                activeAnimationMC.removeEventListener(Event.ENTER_FRAME, handleEnterFrame);
                activeAnimationMC.removeEventListener("hit", handleInternalHit);
                activeAnimationMC.stop();
                activeAnimationMC = null; // 清除引用
            }

            once(Event.FRAME_CONSTRUCTED, function(e:Event):void
                {
                    currentState = state;
                    initAnimateMovieClip(e);
                });
            mc.gotoAndStop(state);
        }

        private function setOffset(x:Number, y:Number):void
        {
            this.x = x;
            this.y = y;
        }
        
        private function updateScale(scaleX:Number, scaleY:Number):void {
            this.scaleX = scaleX;
            this.scaleY = scaleY;
            if (activeAnimationMC) {
                activeAnimationMC.scaleX = scaleX;
                activeAnimationMC.scaleY = scaleY;
            }
        }

        private function initMovieClip(loader:Loader):void
        {
            var domain:ApplicationDomain = loader.contentLoaderInfo.applicationDomain;
            try
            {
                mc = new (domain.getDefinition("pet") as Class)() as MovieClip;
                if (mc)
                {
                    addChild(mc);
                    trace("LoadedPet");
                }
                else
                {
                    trace("Error: 'pet' MovieClip definition not found in SWF");
                }
            }
            catch (e:Error)
            {
                trace("Error loading pet MovieClip:", e.message);
            }
        }

        private function initAnimateMovieClip(e:Event):void
        {
            if (mc.numChildren > 0)
            {
                activeAnimationMC = mc.getChildAt(0) as MovieClip;
                if (activeAnimationMC)
                {
                    activeAnimationMC.removeEventListener(Event.ENTER_FRAME, handleEnterFrame);
                    activeAnimationMC.removeEventListener("hit", handleInternalHit);
                    trace('setupEventListeners');
                    setupEventListeners(activeAnimationMC);
                }
                else
                {
                    trace('Error:no activeAnimationMC');
                }
            }
        }

        public function once(eventType:String, listener:Function):void
        {
            var wrapper:Function = function(e:Event):void
            {
                mc.removeEventListener(eventType, wrapper);
                listener(e);
            };
            mc.addEventListener(eventType, wrapper);
        }

        private function setupEventListeners(animateMC:MovieClip):void
        {
            animateMC.addEventListener("hit", handleInternalHit);
            animateMC.addEventListener(Event.ENTER_FRAME, handleEnterFrame);
        }

        private function handleInternalHit(e:Event):void
        {
            ExternalInterface.call("postMessage", {
                type: 'hit',
                state: getState(),
                instanceId: loaderInfo.parameters.instanceId || ''
            }, '*');
        }

        private function handleEnterFrame(e:Event):void
        {
            if (activeAnimationMC.currentFrame == activeAnimationMC.totalFrames)
            {
                activeAnimationMC.removeEventListener(Event.ENTER_FRAME, handleEnterFrame);
                handleAnimationComplete();
            }
        }

        private function handleAnimationComplete():void
        {
            if (isStopLastFrame(currentState))
            {
                activeAnimationMC.stop();
                return;
            }
            else if (isLoopState(currentState))
            {
                return;
            }
            else
            {
                ExternalInterface.call("postMessage", {
                    type: 'animationComplete', 
                    state: currentState,
                    duration: getAnimationDuration(),
                    instanceId: loaderInfo.parameters.instanceId || ''
                }, '*');
                setState(FighterActionType.IDLE);
            }
        }

        private function getAnimationDuration():Number
        {
            return activeAnimationMC.totalFrames / stage.frameRate;
        }

        private function isLoopState(state:String):Boolean
        {
            return [FighterActionType.IDLE].indexOf(state) != -1;
        }

        private function isStopLastFrame(state:String):Boolean
        {
            return [FighterActionType.ABOUT_TO_DIE, FighterActionType.DEAD, FighterActionType.WIN].indexOf(state) != -1;

        }

        public function getState():String
        {
            return currentState;
        }

        private function reportAnimationInfo():void
        {
            trace("report");
        }

        private function getAvailableStates():Array
        {
            if (!mc)
                return [];

            var availableStates:Array = [];
            var labels:Array = mc.currentLabels;
            var labelNames:Array = labels.map(function(item:Object, index:int, array:Array):String
                {
                    return item.name;
                });

            for each (var state:String in FighterActionType.ALL_TYPES)
            {
                if (labelNames.indexOf(state) != -1)
                {
                    availableStates.push(state);
                }
            }

            return availableStates;
        }
    }
}
