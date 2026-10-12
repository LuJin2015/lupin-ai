(() => {
  const form=document.querySelector("#chat-form"), input=document.querySelector("#message-input"), send=document.querySelector("#send-button");
  const messages=document.querySelector("#messages"), welcome=document.querySelector("#welcome"), toast=document.querySelector("#toast"), sidebar=document.querySelector("#sidebar");
  const API_URL="https://lupin-ai.lujinsg.workers.dev/api/chat";
  const history=[]; let busy=false, toastTimer;
  const md=window.markdownit ? window.markdownit({html:false,linkify:true,breaks:true,typographer:true}) : null;
  function fallbackMarkdown(text){
    const escape=s=>s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
    let src=escape(String(text)).replace(/\r\n?/g,"\n");
    const blocks=[];
    src=src.replace(/```([\w-]*)\n([\s\S]*?)```/g,(_,lang,code)=>{blocks.push("<pre><code>"+code.replace(/\n$/,"")+"</code></pre>");return "\n@@BLOCK"+(blocks.length-1)+"@@\n"});
    src=src.replace(/^\s*(#{1,6})\s+(.+)$/gm,(_,marks,title)=>"<h"+marks.length+">"+title+"</h"+marks.length+">");
    src=src.replace(/^\s*[-*]\s+(.+)$/gm,"<li>$1</li>");
    src=src.replace(/(?:<li>[\s\S]*?<\/li>\n?)+/g,s=>"<ul>"+s+"</ul>");
    src=src.replace(/^\s*(\d+)\.\s+(.+)$/gm,"<li>$2</li>");
    src=src.replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>").replace(/__(.+?)__/g,"<strong>$1</strong>");
    src=src.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g,"$1<em>$2</em>").replace(/(^|[^_])_([^_\n]+)_(?!_)/g,"$1<em>$2</em>");
    src=src.replace(/`([^`\n]+)`/g,"<code>$1</code>");
    src=src.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,'<a href="$2">$1</a>');
    src=src.split(/\n{2,}/).map(part=>/^<(h[1-6]|ul|pre|blockquote)/.test(part.trim())?part:"<p>"+part.replace(/\n/g,"<br>")+"</p>").join("\n");
    return src.replace(/@@BLOCK(\d+)@@/g,(_,n)=>blocks[Number(n)]||"");
  }
  function notify(text){toast.textContent=text;toast.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove("show"),5000)}
  function renderMarkdown(body,text){
    body.innerHTML=md ? md.render(text) : fallbackMarkdown(text);
    body.querySelectorAll("a").forEach(a=>{a.target="_blank";a.rel="noopener noreferrer nofollow"});
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
    const text=raw.trim();if(!text||busy)return;welcome.hidden=true;addMessage("user",text);history.push({role:"user",content:text});input.value="";input.style.height="auto";
    busy=true;send.disabled=true;send.textContent="…";input.disabled=true;const thinking=addMessage("assistant","",true);
    try{
      const response=await fetch(API_URL,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({messages:history.slice(-20)})});
      const data=await response.json().catch(()=>({}));
      thinking.remove();if(!response.ok)throw new Error(data.error||"The request failed. Please try again.");
      history.push({role:"assistant",content:data.reply});addMessage("assistant",data.reply);
    }catch(error){thinking.remove();history.pop();notify(error.message||"Something went wrong. Try again.")}
    finally{busy=false;send.disabled=false;send.textContent="↑";input.disabled=false;input.focus()}
  }
  form.addEventListener("submit",e=>{e.preventDefault();sendMessage(input.value)});
  input.addEventListener("input",()=>{input.style.height="auto";input.style.height=Math.min(input.scrollHeight,180)+"px"});
  input.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();form.requestSubmit()}});
  document.querySelectorAll("[data-prompt]").forEach(button=>button.addEventListener("click",()=>sendMessage(button.dataset.prompt||"")));
  document.querySelector("#new-chat").addEventListener("click",()=>{history.length=0;messages.replaceChildren();welcome.hidden=false;input.value="";input.focus();sidebar.classList.remove("open")});
  document.querySelector("#menu").addEventListener("click",()=>sidebar.classList.toggle("open"));
})();