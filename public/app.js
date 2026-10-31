(() => {
  const form=document.querySelector("#chat-form"), input=document.querySelector("#message-input"), send=document.querySelector("#send-button");
  const messages=document.querySelector("#messages"), welcome=document.querySelector("#welcome"), toast=document.querySelector("#toast"), sidebar=document.querySelector("#sidebar");
  const fileInput=document.querySelector("#file-input"), attachButton=document.querySelector("#attach-button"), attachmentList=document.querySelector("#attachment-list");
  let pendingFiles=[];
  const API_URL="https://lupin-ai.lujinsg.workers.dev/api/chat";
  const HISTORY_URL="https://lupin-ai.lujinsg.workers.dev/api/chats";
  const TOKENS_URL="https://lupin-ai.lujinsg.workers.dev/api/tokens";
  const TOKEN_PURCHASE_URL=TOKENS_URL+"/purchase";
  const CLIENT_KEY="lupin-ai-cloud-client-v1";
  let clientId=localStorage.getItem(CLIENT_KEY);
  if(!clientId){clientId="client_"+crypto.randomUUID().replace(/-/g,"");localStorage.setItem(CLIENT_KEY,clientId)}
  const cloudUrl=()=>HISTORY_URL+"?clientId="+encodeURIComponent(clientId);
  const currentChatScope=()=>window.LupinAccount?.user?.id?"user:"+window.LupinAccount.user.id:"anonymous";
  const tokensBackdrop=document.querySelector("#tokens-backdrop");
  let tokenSnapshot={used:0,dailyLimit:10000,credits:0};
  function tokenHeaders(){return {"Content-Type":"application/json",...(window.LupinAccount?.token?{Authorization:"Bearer "+window.LupinAccount.token}:{})}}
  function renderTokenSnapshot(data){
    tokenSnapshot=data;const used=Number(data.used)||0,limit=Number(data.dailyLimit)||10000,credits=Number(data.credits)||0;
    const usedEl=document.querySelector("#tokens-used"),limitEl=document.querySelector("#tokens-limit-label"),progress=document.querySelector("#tokens-progress"),creditsEl=document.querySelector("#tokens-credits");
    if(usedEl)usedEl.textContent=Math.round(used).toLocaleString()+" tokens";
    if(limitEl)limitEl.textContent=limit.toLocaleString();
    if(creditsEl)creditsEl.textContent=credits.toLocaleString();
    if(progress)progress.style.width=Math.min(100,used/Math.max(1,limit)*100)+"%";
  }
  async function refreshLupinTokens(){
    try{
      const response=await fetch(TOKENS_URL+"?clientId="+encodeURIComponent(clientId),{headers:tokenHeaders()});
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data.error||"Could not load LupinTokens.");
      renderTokenSnapshot(data);return data;
    }catch(error){const usedEl=document.querySelector("#tokens-used");if(usedEl)usedEl.textContent="Unavailable";return null}
  }
  async function openLupinTokens(){
    tokensBackdrop.hidden=false;document.querySelector("#tokens-error").textContent="";
    await refreshLupinTokens();
  }
  document.querySelector("#tokens-open")?.addEventListener("click",openLupinTokens);
  document.querySelector("#tokens-close")?.addEventListener("click",()=>tokensBackdrop.hidden=true);
  tokensBackdrop?.addEventListener("click",event=>{if(event.target===tokensBackdrop)tokensBackdrop.hidden=true});
  async function purchaseLupinTokens(pack,button){
    const errorEl=document.querySelector("#tokens-error");errorEl.textContent="";
    const airlineToken=window.LupinAirline?.token;
    if(!window.LupinAccount?.token){errorEl.textContent="Sign in to Lupin AI first.";return}
    if(!airlineToken){errorEl.textContent="Connect your Lupin Airlines account first using Connect airline.";return}
    button.disabled=true;const original=button.textContent;button.textContent="Purchasing…";
    try{
      const response=await fetch(TOKEN_PURCHASE_URL,{method:"POST",headers:tokenHeaders(),body:JSON.stringify({pack,airlineToken})});
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data.error||"Purchase failed.");
      renderTokenSnapshot(data);notify("Purchased "+Number(data.purchased).toLocaleString()+" LupinTokens for "+Number(data.milesSpent).toLocaleString()+" Lupin Miles.");
    }catch(error){errorEl.textContent=error.message||"Purchase failed."}
    finally{button.disabled=false;button.textContent=original}
  }
  document.querySelector("#tokens-buy-1000")?.addEventListener("click",event=>purchaseLupinTokens("1000",event.currentTarget));
  document.querySelector("#tokens-buy-5000")?.addEventListener("click",event=>purchaseLupinTokens("5000",event.currentTarget));


  const apiKeysBackdrop=document.querySelector("#api-keys-backdrop");
  const apiKeysList=document.querySelector("#api-key-list");
  const apiKeysError=document.querySelector("#api-key-error");
  function apiKeyHeaders(){return {Authorization:"Bearer "+(window.LupinAccount?.token||""),"Content-Type":"application/json"}}
  async function loadApiKeys(){
    if(!window.LupinAccount?.token){apiKeysList.textContent="Sign in to Lupin AI to create and manage API keys.";return}
    apiKeysList.textContent="Loading keys…";apiKeysError.textContent="";
    try{
      const response=await fetch("https://lupin-ai.lujinsg.workers.dev/api/keys",{headers:apiKeyHeaders()});const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data.error||"Could not load API keys.");
      apiKeysList.replaceChildren();
      if(!data.keys?.length){apiKeysList.textContent="No active API keys yet.";return}
      data.keys.forEach(key=>{
        const row=document.createElement("div");row.className="api-key-row";
        const details=document.createElement("div");details.className="api-key-details";
        const name=document.createElement("b");name.textContent=key.name;
        const meta=document.createElement("small");meta.textContent=key.key_prefix+" · created "+new Date(key.created_at).toLocaleDateString()+(key.last_used_at?" · used "+new Date(key.last_used_at).toLocaleDateString():" · never used");
        details.append(name,meta);
        const revoke=document.createElement("button");revoke.type="button";revoke.className="api-key-revoke";revoke.textContent="Revoke";
        revoke.addEventListener("click",async()=>{if(!confirm("Revoke this API key? Apps using it will stop working."))return;revoke.disabled=true;try{const res=await fetch("https://lupin-ai.lujinsg.workers.dev/api/keys/"+encodeURIComponent(key.id),{method:"DELETE",headers:apiKeyHeaders()});const result=await res.json().catch(()=>({}));if(!res.ok)throw new Error(result.error||"Could not revoke key.");await loadApiKeys()}catch(error){apiKeysError.textContent=error.message;revoke.disabled=false}});
        row.append(details,revoke);apiKeysList.append(row);
      });
    }catch(error){apiKeysList.textContent="";apiKeysError.textContent=error.message||"Could not load API keys."}
  }
  document.querySelector("#api-keys-open")?.addEventListener("click",()=>{apiKeysBackdrop.hidden=false;document.querySelector("#api-key-created").hidden=true;loadApiKeys()});
  document.querySelector("#api-keys-close")?.addEventListener("click",()=>apiKeysBackdrop.hidden=true);
  apiKeysBackdrop?.addEventListener("click",event=>{if(event.target===apiKeysBackdrop)apiKeysBackdrop.hidden=true});
  document.querySelector("#api-key-form")?.addEventListener("submit",async event=>{
    event.preventDefault();apiKeysError.textContent="";
    if(!window.LupinAccount?.token){apiKeysError.textContent="Sign in to Lupin AI first.";return}
    const button=event.currentTarget.querySelector("button[type=submit]");button.disabled=true;
    try{
      const response=await fetch("https://lupin-ai.lujinsg.workers.dev/api/keys",{method:"POST",headers:apiKeyHeaders(),body:JSON.stringify({name:document.querySelector("#api-key-name").value})});
      const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||"Could not create API key.");
      const box=document.querySelector("#api-key-created");box.hidden=false;box.replaceChildren();
      const warning=document.createElement("p");warning.textContent="Copy this key now. It will not be shown again.";const code=document.createElement("code");code.textContent=data.key;code.style.display="block";code.style.overflowWrap="anywhere";code.style.padding="12px";code.style.margin="8px 0";code.style.background="rgba(128,128,128,.12)";const copy=document.createElement("button");copy.type="button";copy.className="account-submit";copy.textContent="Copy key";copy.addEventListener("click",async()=>{try{await navigator.clipboard.writeText(data.key);copy.textContent="Copied!"}catch{apiKeysError.textContent="Clipboard unavailable. Select and copy the key above."}});
      box.append(warning,code,copy);document.querySelector("#api-key-name").value="";await loadApiKeys();
    }catch(error){apiKeysError.textContent=error.message||"Could not create API key."}
    finally{button.disabled=false}
  });

  async function cloudRequest(url,options={}){const response=await fetch(url,{...options,headers:{"Content-Type":"application/json",...(window.LupinAccount?.token?{Authorization:"Bearer "+window.LupinAccount.token}:{}),...(options.headers||{})}});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||"Cloud history request failed");return data}
  let cloudReady=false;
  async function syncCloudHistory(){
    const scope=currentChatScope();
    try{
      const data=await cloudRequest(cloudUrl());
      const cloudChats=Array.isArray(data.chats)?data.chats:[];
      if(scope.startsWith("user:")){
        let migrated=false;
        for(const chat of chats)if(chat.ownerScope==="legacy"){chat.ownerScope=scope;migrated=true;}
        if(migrated)saveChats();
      }
      const otherScopeChats=chats.filter(chat=>chat.ownerScope!==scope);
      const localScopeChats=chats.filter(chat=>chat.ownerScope===scope);
      const cloudById=new Map(cloudChats.filter(chat=>chat&&typeof chat.id==="string"&&Array.isArray(chat.messages)).map(chat=>[chat.id,{...chat,ownerScope:scope}]));
      const localById=new Map(localScopeChats.map(chat=>[chat.id,chat]));
      const merged=new Map(localById);
      const uploads=[];
      for(const cloudChat of cloudById.values()){
        const local=localById.get(cloudChat.id);
        if(!local||Number(cloudChat.updated||0)>=Number(local.updated||0))merged.set(cloudChat.id,cloudChat);
      }
      for(const local of localById.values()){
        const remote=cloudById.get(local.id);
        if(!remote||Number(local.updated||0)>Number(remote.updated||0))uploads.push(local);
      }
      chats=[...otherScopeChats,...Array.from(merged.values())].sort((a,b)=>(Number(b.updated)||0)-(Number(a.updated)||0)).slice(0,50);
      saveChats();
      for(const chat of uploads){
        await cloudRequest(cloudUrl(),{method:"POST",body:JSON.stringify({id:chat.id,title:chat.title,messages:chat.messages})});
      }
      cloudReady=true;renderChatList();
    }catch(error){cloudReady=false;notify("Cloud history unavailable; your local copy is kept on this device.")}
  }
  const history=[]; let busy=false, toastTimer;
  const STORAGE_KEY="lupin-ai-chat-history-v1";
  let chats=loadChats(), activeChatId=new URLSearchParams(location.search).get("chat");
  function loadChats(){
    try{
      const value=JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]");
      if(!Array.isArray(value))return [];
      return value.filter(chat=>chat&&typeof chat.id==="string"&&/^[a-zA-Z0-9_-]{1,80}$/.test(chat.id)&&Array.isArray(chat.messages))
        .map(chat=>({...chat,ownerScope:chat.ownerScope==="anonymous"||/^user:[a-f0-9-]{36}$/i.test(chat.ownerScope||"")?chat.ownerScope:"legacy",title:String(chat.title||"Untitled chat").slice(0,120),updated:Number(chat.updated)||0,messages:chat.messages.filter(m=>m&&["user","assistant"].includes(m.role)&&typeof m.content==="string").slice(-100).map(m=>({role:m.role,content:m.content.slice(0,6000)}))}))
        .slice(0,50);
    }catch{return []}
  }
  function saveChats(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(chats.slice(0,50)))}catch{notify("Chat history could not be saved in this browser.")}}
  function newId(){return Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,8)}
  function currentChat(){return chats.find(chat=>chat.id===activeChatId&&chat.ownerScope===currentChatScope())}
  function setChatUrl(id,push=false){const url=new URL(location.href);if(id)url.searchParams.set("chat",id);else url.searchParams.delete("chat");const state={chatId:id||null};if(push)window.history.pushState(state,"",url);else window.history.replaceState(state,"",url)}
  async function copyChatUrl(){if(!activeChatId){notify("Send a message first to create a chat link.");return}const url=new URL(location.href);url.searchParams.set("chat",activeChatId);try{await navigator.clipboard.writeText(url.href);notify("Chat link copied.");}catch{window.prompt("Copy this chat link:",url.href)}}
  function saveCurrentChat(){
    if(!history.length)return;
    let chat=currentChat();
    if(!chat){chat={id:newId(),ownerScope:currentChatScope(),title:(history.find(m=>m.role==="user")?.content||"New chat").replace(/\s+/g," ").slice(0,52),messages:[],updated:Date.now()};chats.unshift(chat);activeChatId=chat.id;setChatUrl(chat.id,true)}
    chat.messages=history.map(m=>({role:m.role,content:m.content}));chat.updated=Date.now();
    chats.sort((a,b)=>b.updated-a.updated);chats=chats.slice(0,50);saveChats();renderChatList();
    if(cloudReady) cloudRequest(cloudUrl(),{method:"POST",body:JSON.stringify({id:chat.id,title:chat.title,messages:chat.messages})}).catch(()=>notify("Cloud save failed; local copy kept."));
  }
  function renderChatList(){
    const list=document.querySelector("#chat-list");if(!list)return;list.replaceChildren();
    if(!chats.length){const empty=document.createElement("p");empty.className="history-empty";empty.textContent="Your saved chats will appear here.";list.append(empty);return}
    chats.filter(chat=>chat.ownerScope===currentChatScope()).forEach(chat=>{const button=document.createElement("button");button.className="history-item"+(chat.id===activeChatId?" active":"");button.type="button";button.textContent=chat.title||"Untitled chat";button.title=button.textContent;button.addEventListener("click",()=>openChat(chat.id));list.append(button)});
  }
  function openChat(id){
    if(busy){notify("Wait for the current reply before switching chats.");return}
    const chat=chats.find(item=>item.id===id&&item.ownerScope===currentChatScope());if(!chat)return;
    activeChatId=id;setChatUrl(id,true);history.splice(0,history.length,...chat.messages.map(m=>({role:m.role,content:m.content})));
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
  function humanSize(bytes){return bytes<1024*1024?Math.max(1,Math.round(bytes/1024))+" KB":(bytes/1024/1024).toFixed(1)+" MB"}
  function renderAttachments(){if(!attachmentList)return;attachmentList.replaceChildren();pendingFiles.forEach((file,index)=>{const chip=document.createElement("div");chip.className="attachment-chip";const icon=document.createElement("span");icon.className="attachment-icon";icon.textContent=file.type.startsWith("image/")?"▧":"▤";const details=document.createElement("span");details.className="attachment-details";const name=document.createElement("b");name.textContent=file.name;const meta=document.createElement("small");meta.textContent=humanSize(file.size)+(file.extractedText?" · first 8,000 characters extracted":file.type.startsWith("image/")?" · image ready":"");details.append(name,meta);const remove=document.createElement("button");remove.type="button";remove.className="attachment-remove";remove.textContent="×";remove.setAttribute("aria-label","Remove "+file.name);remove.addEventListener("click",()=>{pendingFiles.splice(index,1);renderAttachments()});chip.append(icon,details,remove);attachmentList.append(chip)});attachmentList.hidden=pendingFiles.length===0}
  function readAsDataUrl(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error("Could not read "+file.name));reader.readAsDataURL(file)})}
  async function extractOfficeText(file){
    const ext=file.name.toLowerCase().split(".").pop();
    if(ext==="docx"){if(!window.mammoth)throw new Error("Word document reader is still loading. Try again in a moment.");const result=await window.mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()});return result.value.slice(0,8000)}
    if(ext==="xlsx"||ext==="xls"){if(!window.XLSX)throw new Error("Excel document reader is still loading. Try again in a moment.");const book=window.XLSX.read(await file.arrayBuffer(),{type:"array"});return book.SheetNames.map(name=>"SHEET: "+name+"\n"+window.XLSX.utils.sheet_to_csv(book.Sheets[name])).join("\n\n").slice(0,8000)}
    if(ext==="pptx"){if(!window.JSZip)throw new Error("PowerPoint document reader is still loading. Try again in a moment.");const zip=await window.JSZip.loadAsync(await file.arrayBuffer());const names=Object.keys(zip.files).filter(name=>/^ppt\/slides\/slide\d+\.xml$/.test(name)).sort((a,b)=>Number(a.match(/slide(\d+)/)[1])-Number(b.match(/slide(\d+)/)[1]));const slides=[];for(const name of names){const xml=await zip.files[name].async("text");const doc=new DOMParser().parseFromString(xml,"application/xml");slides.push("SLIDE "+name.match(/slide(\d+)/)[1]+"\n"+Array.from(doc.getElementsByTagName("a:t")).map(node=>node.textContent||"").join(" "))}return slides.join("\n\n").slice(0,8000)}
    throw new Error("Unsupported file type. Use DOCX, XLSX/XLS, or PPTX (not legacy .doc or .ppt).");
  }
  async function prepareAttachment(file){
    const ext=file.name.toLowerCase().split(".").pop();const image=file.type.startsWith("image/")||["png","jpg","jpeg","webp"].includes(ext);
    if(image){if(!["image/png","image/jpeg","image/webp"].includes(file.type))throw new Error(file.name+": use PNG, JPEG, or WebP images.");if(file.size>4*1024*1024)throw new Error(file.name+": images must be 4 MB or smaller.");return{name:file.name,type:file.type,size:file.size,imageData:await readAsDataUrl(file),extractedText:""}}
    if(file.size>10*1024*1024)throw new Error(file.name+": Office files must be 10 MB or smaller.");
    const extractedText=await extractOfficeText(file);return{name:file.name,type:file.type||"application/octet-stream",size:file.size,imageData:"",extractedText}
  }
  attachButton?.addEventListener("click",()=>fileInput.click());
  fileInput?.addEventListener("change",async()=>{const selected=Array.from(fileInput.files||[]);fileInput.value="";if(pendingFiles.length+selected.length>5){notify("Attach up to 5 files per message.");return}for(const file of selected){try{const ready=await prepareAttachment(file);pendingFiles.push(ready)}catch(error){notify(error.message||"Could not attach file.")}}renderAttachments()});
  async function sendMessage(raw,files=[]){
    const text=raw.trim();if((!text&&!files.length)||busy)return;
    const officeText=files.filter(f=>f.extractedText).map(f=>"\n\n[Attached Office file: "+f.name+"]\n"+f.extractedText).join("");
    const imageLabels=files.filter(f=>f.imageData).map(f=>"[Attached image: "+f.name+"]").join("\n");
    const storedText=(text||"Please inspect the attached files.")+(imageLabels?"\n"+imageLabels:"")+officeText;
    welcome.hidden=true;addMessage("user",storedText);history.push({role:"user",content:storedText});saveCurrentChat();input.value="";input.style.height="auto";pendingFiles=[];renderAttachments();
    busy=true;send.disabled=true;send.textContent="…";input.disabled=true;const thinking=addMessage("assistant","",true);
    try{
      const response=await fetch(API_URL,{method:"POST",headers:tokenHeaders(),body:JSON.stringify({clientId,messages:history.slice(-20),airlineToken:window.LupinAirline?.token||"",attachments:files.filter(f=>f.imageData).map(f=>({name:f.name,type:f.type,data:f.imageData}))})});
      const data=await response.json().catch(()=>({}));
      thinking.remove();if(!response.ok)throw new Error(data.error||"The request failed. Please try again.");
      history.push({role:"assistant",content:data.reply});addMessage("assistant",data.reply);saveCurrentChat();refreshLupinTokens();
    }catch(error){thinking.remove();notify(error.message||"Something went wrong. Try again.")}
    finally{busy=false;send.disabled=false;send.textContent="↑";input.disabled=false;input.focus()}
  }
  form.addEventListener("submit",e=>{e.preventDefault();sendMessage(input.value,pendingFiles.slice())});
  input.addEventListener("input",()=>{input.style.height="auto";input.style.height=Math.min(input.scrollHeight,180)+"px"});
  input.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();form.requestSubmit()}});
  document.querySelectorAll("[data-prompt]").forEach(button=>button.addEventListener("click",()=>sendMessage(button.dataset.prompt||"")));
  document.querySelector("#new-chat").addEventListener("click",()=>{if(busy){notify("Wait for the current reply before starting a new chat.");return}history.length=0;activeChatId=null;setChatUrl(null,true);messages.replaceChildren();welcome.hidden=false;input.value="";input.focus();renderChatList();sidebar.classList.remove("open")});
  window.addEventListener("popstate",()=>{if(busy){notify("Wait for the current reply before navigating between chats.");return}const id=new URLSearchParams(location.search).get("chat");if(id&&chats.some(c=>c.id===id))openChat(id);else if(!id){activeChatId=null;history.length=0;messages.replaceChildren();welcome.hidden=false;renderChatList()}});
  document.querySelector("#share-chat")?.addEventListener("click",copyChatUrl);
  document.querySelector("#menu").addEventListener("click",()=>sidebar.classList.toggle("open"));
  let accountScopeReady=false;
  async function activateCurrentScope(){
    const scope=currentChatScope();
    if(activeChatId&&!chats.some(chat=>chat.id===activeChatId&&chat.ownerScope===scope)){
      activeChatId=null;history.length=0;messages.replaceChildren();welcome.hidden=false;setChatUrl(null); 
    }
    cloudReady=false;
    await syncCloudHistory();
    const requested=new URLSearchParams(location.search).get("chat");
    if(requested&&chats.some(chat=>chat.id===requested&&chat.ownerScope===scope))openChat(requested);
    else if(!history.length){
      const newest=chats.find(chat=>chat.ownerScope===scope);
      if(newest)openChat(newest.id);
      else{activeChatId=null;setChatUrl(null);messages.replaceChildren();welcome.hidden=true;}
    }
    renderChatList();
  }
  window.addEventListener("lupin-account-changed",()=>{
    refreshLupinTokens();
    if(accountScopeReady)activateCurrentScope();
  });
  const accountReady=window.LupinAccount?.ready||Promise.resolve();
  Promise.resolve(accountReady).catch(()=>{}).finally(()=>{
    accountScopeReady=true;
    renderChatList();
    refreshLupinTokens();
    activateCurrentScope();
  });
})();