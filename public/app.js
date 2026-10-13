(() => {
  const form=document.querySelector("#chat-form"), input=document.querySelector("#message-input"), send=document.querySelector("#send-button");
  const messages=document.querySelector("#messages"), welcome=document.querySelector("#welcome"), toast=document.querySelector("#toast"), sidebar=document.querySelector("#sidebar");
  const fileInput=document.querySelector("#file-input"), attachButton=document.querySelector("#attach-button"), attachmentList=document.querySelector("#attachment-list");
  let pendingFiles=[];
  const API_URL="https://lupin-ai.lujinsg.workers.dev/api/chat";
  const HISTORY_URL="https://lupin-ai.lujinsg.workers.dev/api/chats";
  const CLIENT_KEY="lupin-ai-cloud-client-v1";
  let clientId=localStorage.getItem(CLIENT_KEY);
  if(!clientId){clientId="client_"+crypto.randomUUID().replace(/-/g,"");localStorage.setItem(CLIENT_KEY,clientId)}
  const cloudUrl=()=>HISTORY_URL+"?clientId="+encodeURIComponent(clientId);
  async function cloudRequest(url,options={}){const response=await fetch(url,{...options,headers:{"Content-Type":"application/json",...(window.LupinAccount?.token?{Authorization:"Bearer "+window.LupinAccount.token}:{}),...(options.headers||{})}});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||"Cloud history request failed");return data}
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
  let chats=loadChats(), activeChatId=new URLSearchParams(location.search).get("chat");
  function loadChats(){try{const v=JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]");return Array.isArray(v)?v:[]}catch{return []}}
  function saveChats(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(chats.slice(0,50)))}catch{notify("Chat history could not be saved in this browser.")}}
  function newId(){return Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,8)}
  function currentChat(){return chats.find(chat=>chat.id===activeChatId)}
  function setChatUrl(id,push=false){const url=new URL(location.href);if(id)url.searchParams.set("chat",id);else url.searchParams.delete("chat");const state={chatId:id||null};if(push)window.history.pushState(state,"",url);else window.history.replaceState(state,"",url)}
  async function copyChatUrl(){if(!activeChatId){notify("Send a message first to create a chat link.");return}const url=new URL(location.href);url.searchParams.set("chat",activeChatId);try{await navigator.clipboard.writeText(url.href);notify("Chat link copied.");}catch{window.prompt("Copy this chat link:",url.href)}}
  function saveCurrentChat(){
    if(!history.length)return;
    let chat=currentChat();
    if(!chat){chat={id:newId(),title:(history.find(m=>m.role==="user")?.content||"New chat").replace(/\s+/g," ").slice(0,52),messages:[],updated:Date.now()};chats.unshift(chat);activeChatId=chat.id;setChatUrl(chat.id,true)}
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
  function renderAttachments(){if(!attachmentList)return;attachmentList.replaceChildren();pendingFiles.forEach((file,index)=>{const chip=document.createElement("div");chip.className="attachment-chip";const icon=document.createElement("span");icon.className="attachment-icon";icon.textContent=file.type.startsWith("image/")?"▧":"▤";const details=document.createElement("span");details.className="attachment-details";const name=document.createElement("b");name.textContent=file.name;const meta=document.createElement("small");meta.textContent=humanSize(file.size)+(file.extractedText?" · text extracted":file.type.startsWith("image/")?" · image ready":"");details.append(name,meta);const remove=document.createElement("button");remove.type="button";remove.className="attachment-remove";remove.textContent="×";remove.setAttribute("aria-label","Remove "+file.name);remove.addEventListener("click",()=>{pendingFiles.splice(index,1);renderAttachments()});chip.append(icon,details,remove);attachmentList.append(chip)});attachmentList.hidden=pendingFiles.length===0}
  function readAsDataUrl(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error("Could not read "+file.name));reader.readAsDataURL(file)})}
  async function extractOfficeText(file){
    const ext=file.name.toLowerCase().split(".").pop();
    if(ext==="docx"){if(!window.mammoth)throw new Error("Word document reader is still loading. Try again in a moment.");const result=await window.mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()});return result.value.slice(0,80000)}
    if(ext==="xlsx"||ext==="xls"){if(!window.XLSX)throw new Error("Excel document reader is still loading. Try again in a moment.");const book=window.XLSX.read(await file.arrayBuffer(),{type:"array"});return book.SheetNames.map(name=>"SHEET: "+name+"\n"+window.XLSX.utils.sheet_to_csv(book.Sheets[name])).join("\n\n").slice(0,80000)}
    if(ext==="pptx"){if(!window.JSZip)throw new Error("PowerPoint document reader is still loading. Try again in a moment.");const zip=await window.JSZip.loadAsync(await file.arrayBuffer());const names=Object.keys(zip.files).filter(name=>/^ppt\/slides\/slide\d+\.xml$/.test(name)).sort((a,b)=>Number(a.match(/slide(\d+)/)[1])-Number(b.match(/slide(\d+)/)[1]));const slides=[];for(const name of names){const xml=await zip.files[name].async("text");const doc=new DOMParser().parseFromString(xml,"application/xml");slides.push("SLIDE "+name.match(/slide(\d+)/)[1]+"\n"+Array.from(doc.getElementsByTagName("a:t")).map(node=>node.textContent||"").join(" "))}return slides.join("\n\n").slice(0,80000)}
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
      const response=await fetch(API_URL,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({messages:history.slice(-20),attachments:files.filter(f=>f.imageData).map(f=>({name:f.name,type:f.type,data:f.imageData}))})});
      const data=await response.json().catch(()=>({}));
      thinking.remove();if(!response.ok)throw new Error(data.error||"The request failed. Please try again.");
      history.push({role:"assistant",content:data.reply});addMessage("assistant",data.reply);saveCurrentChat();
    }catch(error){thinking.remove();history.pop();notify(error.message||"Something went wrong. Try again.")}
    finally{busy=false;send.disabled=false;send.textContent="↑";input.disabled=false;input.focus()}
  }
  form.addEventListener("submit",e=>{e.preventDefault();sendMessage(input.value,pendingFiles.slice())});
  input.addEventListener("input",()=>{input.style.height="auto";input.style.height=Math.min(input.scrollHeight,180)+"px"});
  input.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();form.requestSubmit()}});
  document.querySelectorAll("[data-prompt]").forEach(button=>button.addEventListener("click",()=>sendMessage(button.dataset.prompt||"")));
  document.querySelector("#new-chat").addEventListener("click",()=>{history.length=0;activeChatId=null;setChatUrl(null,true);messages.replaceChildren();welcome.hidden=false;input.value="";input.focus();renderChatList();sidebar.classList.remove("open")});
  window.addEventListener("popstate",()=>{const id=new URLSearchParams(location.search).get("chat");if(id&&chats.some(c=>c.id===id))openChat(id);else if(!id){activeChatId=null;history.length=0;messages.replaceChildren();welcome.hidden=false;renderChatList()}});
  document.querySelector("#share-chat")?.addEventListener("click",copyChatUrl);
  document.querySelector("#menu").addEventListener("click",()=>sidebar.classList.toggle("open"));
  window.addEventListener("lupin-account-changed",()=>{cloudReady=false;syncCloudHistory().then(()=>{const requested=new URLSearchParams(location.search).get("chat");if(requested&&chats.some(c=>c.id===requested))openChat(requested);else if(!history.length&&chats.length)openChat(chats[0].id)});});
  renderChatList();
  syncCloudHistory().then(()=>{const requested=new URLSearchParams(location.search).get("chat");if(requested&&chats.some(c=>c.id===requested))openChat(requested);else if(!history.length&&chats.length)openChat(chats[0].id)});
})();