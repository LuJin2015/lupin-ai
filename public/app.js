(() => {
  const form=document.querySelector("#chat-form"), input=document.querySelector("#message-input"), send=document.querySelector("#send-button");
  const messages=document.querySelector("#messages"), welcome=document.querySelector("#welcome"), toast=document.querySelector("#toast"), sidebar=document.querySelector("#sidebar");
  const API_URL="https://lupin-ai.lujinsg.workers.dev/api/chat";
  const HISTORY_URL="https://lupin-ai.lujinsg.workers.dev/api/chats";
  const CLIENT_KEY="lupin-ai-cloud-client-v1";
  let clientId=localStorage.getItem(CLIENT_KEY);
  if(!clientId){clientId="client_"+crypto.randomUUID().replace(/-/g,"");localStorage.setItem(CLIENT_KEY,clientId)}
  const cloudUrl=()=>HISTORY_URL+"?clientId="+encodeURIComponent(clientId);
  async function cloudRequest(url,options={}){const response=await fetch(url,{...options,headers:{"Content-Type":"application/json",...(options.headers||{})}});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||"Cloud history request failed");return data}
  let cloudReady=false;
  async function syncCloudHistory(){
    try{
      const data=await cloudRequest(cloudUrl());
      const cloudChats=Array.isArray(data.chats)?data.chats:[];
      if(!cloudChats.length&&chats.length){
        for(const chat of chats) await cloudRequest(cloudUrl(),{method:"POST",body:JSON.stringify({id:chat.id,title:chat.title,messages:chat.messages})});
      }else if(cloudChats.length){
        const merged=new Map(chats.map(chat=>[chat.id,chat]));
        cloudChats.forEach(chat=>merged.set(chat.id,chat));
        chats=Array.from(merged.values()).sort((a,b)=>(b.updated||0)-(a.updated||0)).slice(0,50);
        saveChats();
      }
      cloudReady=true;renderChatList();
    }catch(error){notify("Cloud history unavailable; this chat stays saved on this device.")}
  }
  const history=[]; let busy=false, toastTimer;
  const STORAGE_KEY="lupin-ai-chat-history-v1";
  let chats=loadChats(), activeChatId=null;
  function loadChats(){try{const v=JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]");return Array.isArray(v)?v:[]}catch{return []}}
  function saveChats(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(chats.slice(0,50)))}catch{notify("Chat history could not be saved in this browser.")}}
  function newId(){return Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,8)}
  function currentChat(){return chats.find(chat=>chat.id===activeChatId)}
  function saveCurrentChat(){
    if(!history.length)return;
    let chat=currentChat();
    if(!chat){chat={id:newId(),title:(history.find(m=>m.role==="user")?.content||"New chat").replace(/\s+/g," ").slice(0,52),messages:[],updated:Date.now()};chats.unshift(chat);activeChatId=chat.id}
    chat.messages=history.map(m=>({role:m.role,content:m.content}));chat.updated=Date.now();
    chats.sort((a,b)=>b.updated-a.updated);chats=chats.slice(0,50);saveChats();renderChatList();
    if(cloudReady) cloudRequest(cloudUrl(),{method:"POST",body:JSON.stringify({id:chat.id,title:chat.title,messages:chat.messages})}).catch(()=>notify("Cloud save failed; local copy kept."));
  }
  function renderChatList(){
    const list=document.querySelector("#chat-list");if(!list)return;list.replaceChildren();
    if(!chats.length){const empty=document.createElement("p");empty.className="history-empty";empty.textContent="Your saved chats will appear here.";list.append(empty);return}
    chats.forEach(chat=>{const button=document.createElement("button");button.className="history-item"+(chat.id===activeChatId?" active":"");button.type="button";button.textContent=chat.title||"Untitled chat";button.title=button.textContent;button.addEventListener("click",()=>openChat(chat.id));list.append(button)});
  }
  function openChat(id){
    const chat=chats.find(item=>item.id===id);if(!chat)return;
    activeChatId=id;history.splice(0,history.length,...chat.messages.map(m=>({role:m.role,content:m.content})));
    messages.replaceChildren();welcome.hidden=history.length>0;
    history.forEach(m=>addMessage(m.role,m.content));renderChatList();sidebar.classList.remove("open");
  }
  const md=window.markdownit ? window.markdownit({html:false,linkify:true,breaks:true,typographer:true}) : null;
  function fallbackMarkdown(text){
    const escape=s=>s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
    let src=escape(String(text)).replace(/\r\n?/g,"\n");
    src=src.replace(/\\([*_`])/g,"$1");
    const blocks=[];
    src=src.replace(/```([\w-]*)\n([\s\S]*?)```/g,(_,lang,code)=>{blocks.push("<pre><code>"+code.replace(/\n$/,"")+"</code></pre>");return "\n@@BLOCK"+(blocks.length-1)+"@@\n"});
    src=src.replace(/^\s*(#{1,6})\s+(.+)$/gm,(_,marks,title)=>"<h"+marks.length+">"+title+"</h"+marks.length+">");
    src=src.replace(/^\s*[-*]\s+(.+)$/gm,"<li>$1</li>");
    src=src.replace(/(?:<li>[\s\S]*?<\/li>\n?)+/g,s=>"<ul>"+s+"</ul>");
    src=src.replace(/^\s*(\d+)\.\s+(.+)$/gm,"<li>$2</li>");
    src=src.replace(/(?:<li>[\s\S]*?<\/li>\n?)+/g,s=>"<ol>"+s+"</ol>");
    src=src.replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>").replace(/__(.+?)__/g,"<strong>$1</strong>");
    src=src.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g,"$1<em>$2</em>").replace(/(^|[^_])_([^_\n]+)_(?!_)/g,"$1<em>$2</em>");
    src=src.replace(/`([^`\n]+)`/g,"<code>$1</code>");
    src=src.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,'<a href="$2">$1</a>');
    src=src.split(/\n{2,}/).map(part=>/^<(h[1-6]|ul|pre|blockquote)/.test(part.trim())?part:"<p>"+part.replace(/\n/g,"<br>")+"</p>").join("\n");
    return src.replace(/@@BLOCK(\d+)@@/g,(_,n)=>blocks[Number(n)]||"");
  }
  function notify(text){toast.textContent=text;toast.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove("show"),5000)}
  function renderMarkdown(body,text){
    const normalized=String(text).replace(/\\([*_`])/g,"$1");
    body.innerHTML=md ? md.render(normalized) : fallbackMarkdown(normalized);
    body.querySelectorAll("a").forEach(a=>{a.target="_blank";a.rel="noopener noreferrer nofollow"});
    body.querySelectorAll("pre").forEach(pre=>{
      if(pre.querySelector(".copy-code"))return;
      const button=document.createElement("button");button.type="button";button.className="copy-code";button.textContent="Copy code";
      button.addEventListener("click",async(event)=>{
        event.preventDefault();event.stopPropagation();
        const code=pre.querySelector("code")?.textContent ?? pre.textContent;
        let copied=false;
        try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(code);copied=true}}catch{}
        if(!copied){
          const area=document.createElement("textarea");area.value=code;area.setAttribute("readonly","");area.style.position="fixed";area.style.left="-9999px";area.style.top="0";document.body.append(area);area.focus();area.select();area.setSelectionRange(0,area.value.length);
          try{copied=document.execCommand("copy")}catch{copied=false}area.remove();
        }
        button.textContent=copied?"Copied!":"Select code";
        if(!copied){
          const codeNode=pre.querySelector("code");if(codeNode){const range=document.createRange();range.selectNodeContents(codeNode);const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);notify("Clipboard blocked by browser. Code selected—press ⌘C to copy.");}
        }
        setTimeout(()=>button.textContent="Copy code",1800);
      });
      pre.append(button);
    });
  }
  function addMessage(role,text,typing=false){
    const row=document.createElement("article");row.className="message "+role;
    const avatar=document.createElement("div");avatar.className="avatar";avatar.textContent=role==="user"?"Y":"L";
    const content=document.createElement("div");content.className="message-content";
    const label=document.createElement("div");label.className="label";label.textContent=role==="user"?"You":"Lupin AI";
    const body=document.createElement("div");body.className=typing?"typing":"message-text";
    if(typing){body.setAttribute("aria-label","Lupin AI is thinking");for(let i=0;i<3;i++)body.append(document.createElement("span"))}else if(role==="assistant"){renderMarkdown(body,text)}else body.textContent=text;
    content.append(label,body);row.append(avatar,content);messages.append(row);row.scrollIntoView({behavior:"smooth",block:"end"});return row;
  }
  async function sendMessage(raw){
    const text=raw.trim();if(!text||busy)return;welcome.hidden=true;addMessage("user",text);history.push({role:"user",content:text});saveCurrentChat();input.value="";input.style.height="auto";
    busy=true;send.disabled=true;send.textContent="…";input.disabled=true;const thinking=addMessage("assistant","",true);
    try{
      const response=await fetch(API_URL,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({messages:history.slice(-20)})});
      const data=await response.json().catch(()=>({}));
      thinking.remove();if(!response.ok)throw new Error(data.error||"The request failed. Please try again.");
      history.push({role:"assistant",content:data.reply});addMessage("assistant",data.reply);saveCurrentChat();
    }catch(error){thinking.remove();history.pop();notify(error.message||"Something went wrong. Try again.")}
    finally{busy=false;send.disabled=false;send.textContent="↑";input.disabled=false;input.focus()}
  }
  form.addEventListener("submit",e=>{e.preventDefault();sendMessage(input.value)});
  input.addEventListener("input",()=>{input.style.height="auto";input.style.height=Math.min(input.scrollHeight,180)+"px"});
  input.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();form.requestSubmit()}});
  document.querySelectorAll("[data-prompt]").forEach(button=>button.addEventListener("click",()=>sendMessage(button.dataset.prompt||"")));
  document.querySelector("#new-chat").addEventListener("click",()=>{history.length=0;activeChatId=null;messages.replaceChildren();welcome.hidden=false;input.value="";input.focus();renderChatList();sidebar.classList.remove("open")});
  document.querySelector("#menu").addEventListener("click",()=>sidebar.classList.toggle("open"));
  renderChatList();
  syncCloudHistory().then(()=>{if(!history.length&&chats.length)openChat(chats[0].id)});
})();