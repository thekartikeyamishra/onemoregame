/**
 * Inline UI for AI hosts that render MCP app widgets (ChatGPT Apps SDK and the MCP Apps standard).
 * Self-contained HTML: no external scripts, fonts, images or network calls, so it needs no CSP allowances.
 * It renders the structuredContent of get_daily_arena, get_leaderboard, list_levels and get_level, and opens the game
 * in a new tab via the host (window.openai.openExternal, or the MCP Apps "ui/open-link" request).
 */
export const WIDGET_URI = "ui://onemore/card-v1.html";
/** Legacy ChatGPT Apps SDK template (text/html+skybridge); same markup. */
export const WIDGET_URI_SKYBRIDGE = "ui://onemore/card-v1.skybridge.html";
export const MIME_MCP_APP = "text/html;profile=mcp-app";
export const MIME_SKYBRIDGE = "text/html+skybridge";

export const WIDGET_HTML = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
:root{color-scheme:dark}
*{box-sizing:border-box}
body{margin:0;font:14px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#eef1fa;background:transparent}
.card{background:#0a0f1f;border:1px solid rgba(160,180,255,.16);border-radius:16px;padding:16px 18px;max-width:640px}
.eyebrow{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#3ee6f0;margin:0 0 4px}
h1{font-size:20px;margin:0 0 6px;line-height:1.2}
.muted{color:rgba(238,241,250,.65);margin:0 0 12px}
.pill{display:inline-block;border:1px solid rgba(255,191,71,.5);color:#ffbf47;border-radius:999px;padding:2px 10px;font-size:12px;margin-bottom:10px}
ol{list-style:none;margin:0 0 14px;padding:0}
li{display:flex;justify-content:space-between;gap:12px;padding:6px 0;border-bottom:1px solid rgba(160,180,255,.08)}
li b{color:#ffbf47;font-variant-numeric:tabular-nums}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;margin:0 0 14px}
.lv{border:1px solid rgba(160,180,255,.14);border-radius:10px;padding:8px 10px}
.lv small{display:block;color:rgba(238,241,250,.6)}
.lv.boss{border-color:rgba(255,191,71,.45)}
.stars{color:#ffbf47;letter-spacing:2px}
ul{margin:0 0 14px;padding-left:18px}
button{font:inherit;font-weight:700;border:0;border-radius:10px;padding:10px 16px;background:#ffbf47;color:#0a0f1f;cursor:pointer}
button:focus-visible{outline:2px solid #3ee6f0;outline-offset:2px}
.foot{font-size:12px;color:rgba(238,241,250,.5);margin:10px 0 0}
</style></head>
<body><div class="card" id="root"><p class="muted">Loading ONE MORE…</p></div>
<script>
(function(){
  var root=document.getElementById("root"), nextId=1, pending={}, rendered=false;
  function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;","'":"&#39;"}[c];});}
  function num(n){return Number(n||0).toLocaleString("en-IN");}
  function safeUrl(u){return typeof u==="string"&&/^https:\\/\\/(www\\.)?onemoregame\\.me(\\/|$)/.test(u)?u:"https://onemoregame.me/play";}
  function post(msg){try{window.parent.postMessage(msg,"*");}catch(e){}}
  function request(method,params){var id=nextId++;post({jsonrpc:"2.0",id:id,method:method,params:params||{}});return new Promise(function(res){pending[id]=res;setTimeout(function(){if(pending[id]){delete pending[id];res(null);}},4000);});}
  function size(){post({jsonrpc:"2.0",method:"ui/notifications/size-changed",params:{width:document.body.scrollWidth,height:document.body.scrollHeight}});}
  function open(url){
    url=safeUrl(url);
    if(window.openai&&typeof window.openai.openExternal==="function"){window.openai.openExternal({href:url});return;}
    request("ui/open-link",{url:url}).then(function(r){if(!r)window.open(url,"_blank","noopener");});
  }
  function render(d){
    if(!d||typeof d!=="object")return;
    rendered=true;
    var h="", play=safeUrl(d.playUrl);
    if(d.twist&&d.day){
      h+='<p class="eyebrow">Daily Arena · '+esc(d.day)+'</p><h1>Today\\'s ONE MORE arena</h1>';
      h+='<span class="pill">'+esc(d.twist.name)+'</span><p class="muted">'+esc(d.twist.description)+' Same arena for everyone today; 60 seconds; free, no sign-up.</p>';
      h+=list(d.top);
    }else if(Array.isArray(d.entries)){
      h+='<p class="eyebrow">Leaderboard · '+esc(d.day)+'</p><h1>Today\\'s top scores</h1>'+list(d.entries);
    }else if(Array.isArray(d.levels)){
      h+='<p class="eyebrow">Levels</p><h1>30-level campaign</h1><p class="muted">Reach each target to unlock the next level. Every 5th level is a Boss Arena.</p><div class="grid">';
      d.levels.forEach(function(l){h+='<div class="lv'+(l.kind==="boss"?" boss":"")+'"><b>L'+esc(l.level)+' '+esc(l.name)+'</b><small>'+esc(l.seconds)+'s · target '+num(l.target)+'</small><small class="stars">★★ '+num(l.twoStars)+' · ★★★ '+num(l.threeStars)+'</small></div>';});
      h+='</div>';
    }else if(d.level&&d.target){
      h+='<p class="eyebrow">Level '+esc(d.level)+' · '+esc(d.seconds)+'s</p><h1>'+esc(d.name)+'</h1><p class="muted">'+esc(d.description)+'</p>';
      h+='<p>Target <b style="color:#ffbf47">'+num(d.target)+'</b> · <span class="stars">★★</span> '+num(d.stars&&d.stars[1])+' · <span class="stars">★★★</span> '+num(d.stars&&d.stars[2])+'</p>';
      if(Array.isArray(d.tips))h+='<ul>'+d.tips.map(function(t){return '<li style="display:list-item;border:0;padding:2px 0">'+esc(t)+'</li>';}).join("")+'</ul>';
    }else{rendered=false;return;}
    h+='<button type="button" id="play">Play ONE MORE</button><p class="foot">Skill-based 60-second arcade game · scores verified by replay · onemoregame.me</p>';
    root.innerHTML=h;
    document.getElementById("play").addEventListener("click",function(){open(play);});
    size();
  }
  function list(rows){
    if(!Array.isArray(rows)||!rows.length)return '<p class="muted">No scores yet today. Be the first.</p>';
    return '<ol>'+rows.map(function(e){return '<li><span>'+esc(e.rank)+'. '+esc(e.name)+'</span><b>'+num(e.score)+'</b></li>';}).join("")+'</ol>';
  }
  // ChatGPT Apps SDK
  function fromOpenAI(){if(window.openai&&window.openai.toolOutput)render(window.openai.toolOutput);}
  window.addEventListener("openai:set_globals",fromOpenAI);
  fromOpenAI();
  // MCP Apps standard (postMessage JSON-RPC)
  window.addEventListener("message",function(ev){
    var m=ev.data; if(!m||m.jsonrpc!=="2.0")return;
    if(m.id!=null&&pending[m.id]){var r=pending[m.id];delete pending[m.id];r(m.result||null);return;}
    if(m.method==="ui/notifications/tool-result"&&m.params){render(m.params.structuredContent);}
  });
  if(!window.openai){
    request("ui/initialize",{protocolVersion:"2025-11-21",appInfo:{name:"onemore-card",version:"1.0.0"},appCapabilities:{}}).then(function(r){
      if(r){post({jsonrpc:"2.0",method:"ui/notifications/initialized",params:{}});}
    });
  }
  setTimeout(function(){if(!rendered)root.innerHTML='<p class="eyebrow">ONE MORE</p><h1>One minute. One challenge. One more.</h1><p class="muted">Free skill-based browser arcade game.</p><button type="button" id="play">Play ONE MORE</button>',document.getElementById("play").addEventListener("click",function(){open("https://onemoregame.me/play");}),size();},5000);
})();
</script></body></html>`;
