(() => {
  const form=document.querySelector("#chat-form"), input=document.querySelector("#message-input"), send=document.querySelector("#send-button");
  const messages=document.querySelector("#messages"), welcome=document.querySelector("#welcome"), toast=document.querySelector("#toast"), sidebar=document.querySelector("#sidebar");
  const history=[]; let busy=false, toastTimer;
  function notify(text){toast.textContent=text;toast.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove("show"),5000)}
  function addMessage(role,text,typing=false){
    const row=document.createElement("article");row.className="message "+role;
    const avatar=document.createElement("div");avatar.className="avatar";avatar.textContent=role==="user"?"Y":"L";
    const content=document.createElement("div");content.className="message-content";
    const label=document.createElement("div");label.className="label";label.textContent=role==="user"?"You":"Lupin AI";
    const body=document.createElement("div");body.className=typing?"typing":"message-text";
    if(typing){body.setAttribute("aria-label","Lupin AI is thinking");for(let i=0;i<3;i++)body.append(document.createElement("span"))}else body.textContent=text;
    content.append(label,body);row.append(avatar,content);messages.append(row);row.scrollIntoView({behavior:"smooth",block:"end"});return row;
  }
  async function sendMessage(raw){
    const text=raw.trim();if(!text||busy)return;welcome.hidden=true;addMessage("user",text);history.push({role:"user",content:text});input.value="";input.style.height="auto";
    busy=true;send.disabled=true;send.textContent="…";input.disabled=true;const thinking=addMessage("assistant","",true);
    try{
      const response=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({messages:history.slice(-20)})});
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