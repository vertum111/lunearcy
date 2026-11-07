// Keyboard focus for the full-screen overlays (the cutscene, the market week): focus moves inside when they open,
// Tab and Shift+Tab cycle within them, and focus goes back to whatever opened them once they close.
const FOCUSABLE='button:not([disabled]),[href],input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])';

/** Traps focus in `root`, focusing `first` (or the first control). Returns a function that releases it. */
export function trapFocus(root,first){
 const before=document.activeElement;
 const keys=e=>{
  if(e.key!=='Tab')return;
  const items=[...root.querySelectorAll(FOCUSABLE)].filter(el=>el.offsetParent!==null);
  if(!items.length){e.preventDefault();return;}
  const a=items[0],z=items.at(-1);
  if(e.shiftKey&&(document.activeElement===a||!root.contains(document.activeElement))){e.preventDefault();z.focus();}
  else if(!e.shiftKey&&(document.activeElement===z||!root.contains(document.activeElement))){e.preventDefault();a.focus();}
 };
 document.addEventListener('keydown',keys,true);
 (first||root.querySelector(FOCUSABLE))?.focus({preventScroll:true});
 // The game re-renders its panels, so the opener may be a fresh copy by now: find it again by its action.
 const action=before?.dataset?.action;
 return ()=>{document.removeEventListener('keydown',keys,true);const back=before?.isConnected?before:action&&document.querySelector(`[data-action="${action}"]`);back?.focus({preventScroll:true});};
}
