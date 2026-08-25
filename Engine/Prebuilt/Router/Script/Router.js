const {ref} = Vue;

/*StackRouter — kept only for backwards compatibility with old callers.
  DialogSheet now has real stack tracking (see Router.OpenDialogSheet /
  Router.CloseDialogSheet below), so this just delegates to Router instead
  of calling openDialogSheet/closeDialogSheet directly. `Router` isn't
  defined yet at this point in the file, but these are only invoked later
  from a tap handler, by which time the whole script has finished loading —
  same pattern already used by ClosePageView referencing `Carbon`.*/
const StackRouter = {
  OpenDialogSheet:(name)=>{
    Router.OpenDialogSheet({Target:name})
  },
  CloseDialogSheet:(name)=>{
    Router.CloseDialogSheet({Target:name})
  }
}
window.StackRouter = StackRouter;

/*StackHistory*/
const _StackHistory = ref({
  StackHistory:[]
});
const _CurrentView = ref()
const InitialPageView = ref("HomeView")

/* GUARD: reactive "is page settled" flag. true = idle, false = mid-transition.
   Exposed on window so Carbon (PageView.js) can toggle it during navigate(),
   and so any Vue template can bind to it (e.g. disable a nav button while
   a transition is running). This is the single source of truth Router uses
   to block fast/double taps (both UI nav calls and physical backpress). */
const isPageViewLoaded = ref(true);
window.isPageViewLoaded = isPageViewLoaded;

/* ===== Alert bridge =====
   Alert.js is a different syntax on purpose: it has no Name attribute, no
   registry, and can't be opened/closed by target name — it's an anonymous
   FIFO queue (Alert/AlertInput/AlertConfirm/BlankAlert) with at most one
   dialog open at a time (isDialogOpen). So it can't plug into Router the
   same way Drawer/ActionSheet/DialogSheet do (there's no OpenAlert() here —
   you keep calling Alert()/AlertConfirm()/etc directly, same as always).
   Instead, Alert.js dispatches 'carbon:alertopen' / 'carbon:alertclose' on
   window right as a dialog shows/hides, and Router just listens and keeps
   a single generic "alert_active" stack entry in sync, so backpress still
   sees it and dismisses it first instead of falling through to the page. */
window.addEventListener('carbon:alertopen', ()=>{
  _StackHistory.value.StackHistory.push('alert_active');
  console.log(_StackHistory.value);
});
window.addEventListener('carbon:alertclose', ()=>{
  const _idx = _StackHistory.value.StackHistory.lastIndexOf('alert_active');
  if(_idx > -1){
    _StackHistory.value.StackHistory.splice(_idx,1);
  }
  console.log(_StackHistory.value);
});

/*HomeView as Initial PageView in CurrentView*/
_StackHistory.value.StackHistory=["pageview_HomeView"]
_CurrentView.value="pageview_HomeView";

const Router = {
  OpenPageView: async (config)=>{
    const _Target = config.Target || "ErrorView";
    const _Ani_Name = config.AnimationName || "SlideIn";
    const _Ani_Duration = config.AnimationTime || "200ms";
    const _Delay =  config.Delay || "0ms";
    const _stackName = "pageview_"+_Target;//Ex: pageview_SettingsView

    /* FIX: bail out early instead of proceeding — if Carbon is still
       mid-animation, any navigate() call right now would just get
       ignored by Carbon's isTransitioning lock, and the code below
       would push a stack entry for a navigation that never actually
       happened. That's exactly what caused the ghost/kill-app bug. */
    if (typeof Carbon !== 'undefined' && Carbon.isTransitioning) {
      console.warn(`Router: Navigation in progress, ignoring open request for "${_Target}".`);
      return;
    }

    /* GUARD: fast/double-tap protection. isPageViewLoaded is flipped false by
       Carbon.navigate() for the full duration of a transition (including
       animation + lifecycle hooks), so this catches repeat calls even in the
       narrow window before Carbon.isTransitioning would technically be set. */
    if (!isPageViewLoaded.value) {
      console.warn(`Router: Page still loading, ignoring open request for "${_Target}".`);
      return;
    }

    /* For Complexe Ui*/
    /*
    Think SettingsView has already opend drawer,actionsheet
    Actionsheet contain Router.OpenPageView()=>AboutView
    so,When click open it open aboutview and before opining
    all drawer and actionsheet is close by core code. But stack remain drawer and actionsheet name.
    So,GostStack problem.
    Ex: ["pageview_SettingsView","drawer_setDrawwr","actionsheet_setAct","pageview_AboutView"]❌
    Fix Example:["pageview_SettingsView","pageview_AboutView"]✅
    */
    const _getLength = _StackHistory.value.StackHistory.length;
    console.log("getLength:",_getLength);
    console.log("CurrentView:",_CurrentView.value)
    const _getIndexOfCurrentView = _StackHistory.value.StackHistory.indexOf(_CurrentView.value);
    console.log("CurrentView Index:",_getIndexOfCurrentView)

    if(_getLength-1==_getIndexOfCurrentView){
      console.log("----No ActionSheet/Drawer Exist----")
      /*OpeningPageView*/
      const _didOpen = await OpenPageView({
        Target:_Target,
        AnimationName:_Ani_Name,
        AnimationTime:_Ani_Duration,
        Delay:_Delay,
      })
      /* FIX: only touch the stack if Carbon actually performed the navigation */
      if(_didOpen === false){
        console.warn(`Router: Carbon ignored open for "${_Target}", stack left unchanged.`);
        return;
      }
      /*Adding stack*/
      _StackHistory.value.StackHistory.push(_stackName);
      /*Update CurrentView to new target*/
      _CurrentView.value = _stackName;
      /*Debug Test*/
      console.log(_StackHistory.value);
    }
    else{
      console.log("---Exist------")
      console.log(_StackHistory.value)
      const _lastIndex = _getLength-1;
      console.log("lastIndex:",_lastIndex)
      const _startIndex = _getIndexOfCurrentView+1;
      console.log("startIndex",_startIndex);
      const _countItem = (_lastIndex-_startIndex)+1;
      console.log("countItem",_countItem);

      /*debug*/
      for(let i = _startIndex; i <= _lastIndex; i++){
        console.log('need cut:', _StackHistory.value.StackHistory[i])
      }

      /* Remove ghost stack entries (drawer/actionsheet) between current view and top*/
      _StackHistory.value.StackHistory.splice(_startIndex, _countItem);
      console.log(_StackHistory.value);

      /*OpeningPageView*/
      const _didOpen = await OpenPageView({
        Target:_Target,
        AnimationName:_Ani_Name,
        AnimationTime:_Ani_Duration,
        Delay:_Delay,
      })
      /* FIX: only touch the stack if Carbon actually performed the navigation */
      if(_didOpen === false){
        console.warn(`Router: Carbon ignored open for "${_Target}", stack left unchanged.`);
        return;
      }
      /*Adding stack*/
      _StackHistory.value.StackHistory.push(_stackName);
      /*Update CurrentView to new target*/
      _CurrentView.value = _stackName;
      console.log(_StackHistory.value);
    }
  },

  ClosePageView: async (config)=>{
    const _Target = config.Target || "ErrorView";
    const _Ani_Name = config.AnimationName || "SlideOut";
    const _Ani_Duration = config.AnimationTime || "200ms";
    const _Delay = config.Delay || "0ms";
    const _stackName = "pageview_"+_Target;

    /* FIX: same guard as OpenPageView — don't let a second backpress/close
       request mutate the stack while a transition is already running. */
    if (typeof Carbon !== 'undefined' && Carbon.isTransitioning) {
      console.warn(`Router: Navigation in progress, ignoring close request for "${_Target}".`);
      return;
    }

    /* GUARD: same fast/double-tap protection as OpenPageView */
    if (!isPageViewLoaded.value) {
      console.warn(`Router: Page still loading, ignoring close request for "${_Target}".`);
      return;
    }

    const _getLength = _StackHistory.value.StackHistory.length;
    console.log("getLength:",_getLength);
    console.log("CurrentView:",_CurrentView.value)
    const _getIndexOfCurrentView = _StackHistory.value.StackHistory.indexOf(_CurrentView.value);
    console.log("CurrentView Index:",_getIndexOfCurrentView)

    if(_getLength-1==_getIndexOfCurrentView){
      console.log("----No ActionSheet/Drawer Exist----")
      const _didClose = await ClosePageView({
        Target:_Target,
        AnimationName:_Ani_Name,
        AnimationTime:_Ani_Duration,
        Delay:_Delay,
      })
      /* FIX: only touch the stack if Carbon actually performed the navigation */
      if(_didClose === false){
        console.warn(`Router: Carbon ignored close for "${_Target}", stack left unchanged.`);
        return;
      }
      /*Remove current pageview*/
      _StackHistory.value.StackHistory.pop();
      /*Update CurrentView to target passed in config*/
      _CurrentView.value = _stackName;
      console.log(_StackHistory.value);
    }
    else{
      console.log("---Exist------")
      console.log(_StackHistory.value)
      const _lastIndex = _getLength-1;
      console.log("lastIndex:",_lastIndex)
      const _startIndex = _getIndexOfCurrentView+1;
      console.log("startIndex",_startIndex);
      const _countItem = (_lastIndex-_startIndex)+1;
      console.log("countItem",_countItem);

      /*debug*/
      for(let i = _startIndex; i <= _lastIndex; i++){
        console.log('need cut:', _StackHistory.value.StackHistory[i])
      }

      /*Remove ghost stack entries first, so current view becomes the top*/
      _StackHistory.value.StackHistory.splice(_startIndex, _countItem);

      const _didClose = await ClosePageView({
        Target:_Target,
        AnimationName:_Ani_Name,
        AnimationTime:_Ani_Duration,
        Delay:_Delay,
      })
      /* FIX: only touch the stack if Carbon actually performed the navigation */
      if(_didClose === false){
        console.warn(`Router: Carbon ignored close for "${_Target}", stack left unchanged.`);
        return;
      }
      /*Then remove the current pageview itself*/
      _StackHistory.value.StackHistory.pop();
      /*Update CurrentView to target passed in config*/
      _CurrentView.value = _stackName;
      console.log(_StackHistory.value);
    }
  },

  /* ===== Drawer / ActionSheet / DialogSheet =====
     These three all share the same shape: a Name-based registry, an
     open/close pair on window, and a clickBackdrop() fluent hook that by
     default does nothing. Router.Open* wires that hook back into
     Router.Close* itself — that's what makes "click backdrop closes it and
     clears the stack" automatic, without touching Drawer.js/ActionSheet.js/
     DialogSheet.js at all. Unlike pageviews these don't move _CurrentView;
     they just sit as ghost entries on top of it, which is exactly what the
     existing ghost-stack cleanup in OpenPageView/ClosePageView already
     expects and prunes when a real page navigation happens. */

  OpenDrawer: (config)=>{
    const _Target = config.Target || config.Name;
    if(!_Target){ console.warn("Router.OpenDrawer: no Target/Name provided."); return; }
    const _stackName = "drawer_"+_Target;

    /* GUARD: fast/double-tap protection — ignore re-opening a drawer
       that's already tracked as open. */
    if(_StackHistory.value.StackHistory.includes(_stackName)){
      console.warn(`Router: Drawer "${_Target}" already open, ignoring.`);
      return;
    }
    /* GUARD: don't open an overlay while a page transition is mid-flight —
       Carbon force-closes all drawers/actionsheets/dialogsheets at the
       start of its own navigate(), so opening one right now would likely
       just get immediately closed out from under the user. */
    if (!isPageViewLoaded.value) {
      console.warn(`Router: Page still loading, ignoring drawer open for "${_Target}".`);
      return;
    }

    window.openDrawer(_Target);

    /* Auto-wire backdrop click to route back through Router.CloseDrawer,
       so a backdrop tap closes the drawer AND clears its stack entry. */
    if(typeof Drawer === 'function'){
      Drawer(_Target).clickBackdrop(()=> Router.CloseDrawer({Target:_Target}));
    }

    _StackHistory.value.StackHistory.push(_stackName);
    console.log(_StackHistory.value);
  },

  CloseDrawer: (config)=>{
    const _Target = config.Target || config.Name;
    if(!_Target){ console.warn("Router.CloseDrawer: no Target/Name provided."); return; }
    const _stackName = "drawer_"+_Target;

    const _idx = _StackHistory.value.StackHistory.lastIndexOf(_stackName);
    if(_idx === -1){
      console.warn(`Router: Drawer "${_Target}" not tracked as open, ignoring close.`);
      return;
    }

    window.closeDrawer(_Target);
    _StackHistory.value.StackHistory.splice(_idx,1);
    console.log(_StackHistory.value);
  },

  OpenActionSheet: (config)=>{
    const _Target = config.Target || config.Name;
    if(!_Target){ console.warn("Router.OpenActionSheet: no Target/Name provided."); return; }
    const _stackName = "actionsheet_"+_Target;

    if(_StackHistory.value.StackHistory.includes(_stackName)){
      console.warn(`Router: ActionSheet "${_Target}" already open, ignoring.`);
      return;
    }
    if (!isPageViewLoaded.value) {
      console.warn(`Router: Page still loading, ignoring actionsheet open for "${_Target}".`);
      return;
    }

    window.openActionSheet(_Target);

    if(typeof ActionSheet === 'function'){
      ActionSheet(_Target).clickBackdrop(()=> Router.CloseActionSheet({Target:_Target}));
    }

    _StackHistory.value.StackHistory.push(_stackName);
    console.log(_StackHistory.value);
  },

  CloseActionSheet: (config)=>{
    const _Target = config.Target || config.Name;
    if(!_Target){ console.warn("Router.CloseActionSheet: no Target/Name provided."); return; }
    const _stackName = "actionsheet_"+_Target;

    const _idx = _StackHistory.value.StackHistory.lastIndexOf(_stackName);
    if(_idx === -1){
      console.warn(`Router: ActionSheet "${_Target}" not tracked as open, ignoring close.`);
      return;
    }

    window.closeActionSheet(_Target);
    _StackHistory.value.StackHistory.splice(_idx,1);
    console.log(_StackHistory.value);
  },

  OpenDialogSheet: (config)=>{
    const _Target = config.Target || config.Name;
    if(!_Target){ console.warn("Router.OpenDialogSheet: no Target/Name provided."); return; }
    const _stackName = "dialogsheet_"+_Target;

    if(_StackHistory.value.StackHistory.includes(_stackName)){
      console.warn(`Router: DialogSheet "${_Target}" already open, ignoring.`);
      return;
    }
    if (!isPageViewLoaded.value) {
      console.warn(`Router: Page still loading, ignoring dialogsheet open for "${_Target}".`);
      return;
    }

    window.openDialogSheet(_Target);

    if(typeof DialogSheet === 'function'){
      DialogSheet(_Target).clickBackdrop(()=> Router.CloseDialogSheet({Target:_Target}));
    }

    _StackHistory.value.StackHistory.push(_stackName);
    console.log(_StackHistory.value);
  },

  CloseDialogSheet: (config)=>{
    const _Target = config.Target || config.Name;
    if(!_Target){ console.warn("Router.CloseDialogSheet: no Target/Name provided."); return; }
    const _stackName = "dialogsheet_"+_Target;

    const _idx = _StackHistory.value.StackHistory.lastIndexOf(_stackName);
    if(_idx === -1){
      console.warn(`Router: DialogSheet "${_Target}" not tracked as open, ignoring close.`);
      return;
    }

    window.closeDialogSheet(_Target);
    _StackHistory.value.StackHistory.splice(_idx,1);
    console.log(_StackHistory.value);
  }
}
window.Router = Router;

/*
Disable Backpress
*/
async function _BackpressController(){
  await Android.disableBackpress(true);
  Android.onBackpress(async ()=>{                       // FIX: added `async` — needed because `await Android.killApp()` is used inside this callback
    /* GUARD: ignore any backpress that arrives while a transition is still
       running — prevents a double-tap from firing ClosePageView twice,
       or racing into the killApp() branch mid-animation. */
    if (!isPageViewLoaded.value) {
      console.warn("Router: Backpress ignored — page transition in progress.");
      return;
    }

    const _stack = _StackHistory.value.StackHistory;
    const _topEntry = _stack[_stack.length-1];
    console.log("Backpress Top Entry:", _topEntry);

    /*Find nearest previous PAGEVIEW entry below the current top,
      skipping any drawer/actionsheet ghost entries sitting in between.
      This is what backpress should reveal/navigate back to.*/
    let _previousPageViewName = null;
    for(let i = _stack.length-2; i >= 0; i--){
      if(_stack[i].startsWith("pageview_")){
        _previousPageViewName = _stack[i].slice("pageview_".length);
        break;
      }
    }
    console.log("Previous PageView:", _previousPageViewName);

    /*Split into type and name*/
    const [_type, ..._nameParts] = _topEntry.split("_");
    const _name = _nameParts.join("_"); // rejoin in case name itself has "_"
    console.log("Type:", _type, "Name:", _name);

    switch(_type){
      case "pageview": {
           /* NEW: per-page Backpress override ("sub router stack"). If the
              currently active page registered a Backpress handler via
              Carbon.PageView({Backpress:...}) and hasn't called
              ctx.BackpressEnd() yet, hand this ENTIRE backpress event to
              that handler instead of running the normal kill/close logic
              below — the page owns its own back behavior until it decides
              it's done. Only applies when the pageview is the literal top
              of the stack (no drawer/actionsheet/dialogsheet/alert open on
              top of it), since those still close first as usual. */
           const _pageConfig = (typeof Carbon !== 'undefined') ? Carbon.pages[_name] : null;
           const _hasOverride = _pageConfig && typeof _pageConfig.Backpress === 'function' && _pageConfig._backpressActive;

           if(_hasOverride){
             console.log(`Router: Delegating backpress to "${_name}"'s own Backpress handler.`);
             /* Support both `function(){ this.BackpressEnd() }` and
                `(ctx)=>{ ctx.BackpressEnd() }` — arrow functions ignore the
                `this` that .call() would bind, so the same context object
                is also passed as the first argument. */
             const _ctx = {
               BackpressEnd: () => {
                 _pageConfig._backpressActive = false;
                 console.log(`Router: Backpress override ended for "${_name}", main stack router re-enabled.`);
               }
             };
             _pageConfig.Backpress.call(_ctx, _ctx);
             break;
           }

           if(_name==InitialPageView.value){
                await Android.killApp();
           }
           else{
                /*Fallback to InitialPageView if, for some reason,
                  no earlier pageview is found in the stack*/
                await Router.ClosePageView({
                     Target:_previousPageViewName || InitialPageView.value,
                })
           }
        break;
      }

      case "drawer":
        Router.CloseDrawer({Target:_name});
        break;

      case "actionsheet":
        Router.CloseActionSheet({Target:_name});
        break;

      case "dialogsheet":
        Router.CloseDialogSheet({Target:_name});
        break;

      case "alert":
        /* Alert has no Target/name — just ask Alert.js to dismiss whatever
           is currently open (same as tapping Cancel/backdrop). The
           'carbon:alertclose' listener above pops the stack entry once it
           actually finishes closing. */
        if(typeof window.dismissAlert === 'function'){
          window.dismissAlert();
        }
        break;

      default:
        console.log("Unhandled backpress stack type:", _type);
        break;
    }
  });//End onBackpress
}//End _BackpressController
_BackpressController();
