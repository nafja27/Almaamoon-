(()=>{
'use strict';
const API='/api/mamoun-realtime';
const STATUS_API='/api/ai-status';
const MAX_MS=5*60*1000;
let pc=null,dc=null,stream=null,audioEl=null,sessionTimer=null,connected=false,muted=false,lastAssistant='',lastUser='';

function el(tag,cls,html){const x=document.createElement(tag);if(cls)x.className=cls;if(html!=null)x.innerHTML=html;return x}
function safe(t){return String(t??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function activeScreen(){return document.querySelector('.screen.active')?.id||''}
function contextText(){
 const screen=activeScreen();
 const bits=[];
 if(screen==='labScreen'){
   bits.push('الطالب الآن في مختبر الحروف.');
   const sel=document.querySelector('.alpha-btn.sel');if(sel)bits.push(`الحرف المختار: ${sel.textContent.trim()}.`);
   const card=document.getElementById('letterCard');
   if(card){const word=card.querySelector('.lc-word .ar-text')?.textContent?.trim();if(word)bits.push(`كلمة المثال الظاهرة: ${word}.`)}
 } else if(screen==='stageScreen'){
   const title=document.getElementById('stageTitle')?.textContent?.trim();
   const coach=document.getElementById('coachText')?.textContent?.trim();
   bits.push('الطالب داخل مهمة تعليمية في المغامرة.');if(title)bits.push(`المهارة الحالية: ${title}.`);if(coach)bits.push(`التوجيه الظاهر: ${coach}.`);
 } else if(screen==='worldScreen'){
   const place=document.getElementById('missionPlace')?.textContent?.trim();const skill=document.getElementById('missionSkill')?.textContent?.trim();
   bits.push('الطالب على خريطة مغامرة المأمون.');if(place)bits.push(`المحطة المحددة: ${place}.`);if(skill)bits.push(`المهارة: ${skill}.`);
 } else if(screen==='writeScreen') bits.push('الطالب في ورشة الكتابة.');
 else if(screen==='checkScreen') bits.push('الطالب في فحص الحروف.');
 else bits.push('الطالب في الصفحة الرئيسية لمغامرة المأمون.');
 return bits.join(' ');
}
function baseInstruction(){return `أنت شخصية "المأمون"، رفيق تعليمي لطفل يتعلم العربية كلغة ثانية داخل منصة مغامرة المأمون. تحدث بالعربية الفصحى المبسطة فقط. لا تستخدم أي لهجة عامية مطلقًا. قل "أهلًا يا بطل" ولا تقل "هلا". استخدم جملًا قصيرة وواضحة ومشجعة، غالبًا جملة أو جملتين فقط. لا تسأل الطفل عن اسمه أو عمره أو مدرسته أو موقعه أو أي معلومة شخصية. لا تناقش موضوعات خارج تعلم العربية؛ أعد الحوار بلطف إلى الحروف والكلمات والجمل والقراءة. افهم الإنجليزية إذا احتاج الطفل إليها، لكن اجعل ردك الأساسي بالعربية، ويمكنك إعطاء كلمة إنجليزية قصيرة جدًا عند الضرورة. عند الخطأ قل مثلًا: "أحسنت المحاولة. استمع مرة أخرى ثم حاول." عند النجاح قل مثلًا: "أحسنت! نطقك واضح." استخدم نبرة دافئة ومرحة وبطيئة نسبيًا تناسب طفلًا في المرحلة الابتدائية. السياق الحالي في المنصة: ${contextText()}`}

const launcher=el('button','mamoun-buddy-launcher','<span class="mb-badge" id="mbAiBadge">AI</span><span class="mb-label" id="mbLauncherLabel">تحدّث مع المأمون AI</span><img src="assets/mascot.webp?v=365" alt="المأمون">');
launcher.type='button';launcher.setAttribute('aria-label','تحدّث مع المأمون');
const backdrop=el('div','mamoun-buddy-backdrop');
backdrop.innerHTML=`<section class="mamoun-buddy-panel" role="dialog" aria-modal="true" aria-label="التحدث مع المأمون">
 <div class="mb-scene">
   <div class="mb-avatar-wrap"><div class="mb-avatar" id="mbAvatar"><img id="mbBuddyImage" src="assets/mascot.webp?v=365" data-full-src="assets/mamoun-buddy.png?v=3610" alt="شخصية المأمون"><span class="mb-mouth"></span></div><span class="mb-listen-ring"></span></div>
   <div class="mb-scene-status" id="mbSceneStatus"><i></i><span>المأمون جاهز للتحدث معك</span></div>
 </div>
 <div class="mb-console">
   <header class="mb-head"><div class="mb-head-mark">🎙️</div><div class="mb-head-copy"><b>تحدّث مع المأمون</b><span>رفيقك الذكي لتعلّم العربية</span></div><button class="mb-close" id="mbClose" aria-label="إغلاق">×</button></header>
   <div class="mb-transcript" id="mbTranscript"><div class="mb-welcome"><h3>أهلًا يا بطل! 👋</h3><p>اضغط «ابدأ الحديث»، ثم تحدث بصورة طبيعية. سيستمع إليك المأمون ويرد عليك بصوته.</p></div></div>
   <footer class="mb-controls"><button class="mb-main-action" id="mbStart">🎙️ <span>ابدأ الحديث</span></button><div class="mb-control-row"><button class="mb-mini" id="mbMute" disabled>🔇 كتم الميكروفون</button><button class="mb-mini" id="mbContext" disabled>✨ ساعدني في هذه المهمة</button></div><div class="mb-privacy"><b>AI</b> صوت المأمون مولّد بالذكاء الاصطناعي. لا يحتاج إلى اسمك أو أي معلومات شخصية. تحدّث فقط عن نشاط التعلّم.</div></footer>
 </div>
 <audio id="mbAudio" autoplay playsinline></audio>
</section>`;
document.body.append(launcher,backdrop);
const $=id=>document.getElementById(id),avatar=$('mbAvatar'),status=$('mbSceneStatus'),transcript=$('mbTranscript'),start=$('mbStart'),mute=$('mbMute'),contextBtn=$('mbContext'),audio=$('mbAudio');audioEl=audio;
const aiBadge=$('mbAiBadge'),launcherLabel=$('mbLauncherLabel');
async function checkAiReady(){
 try{const r=await fetch(STATUS_API,{cache:'no-store'});const j=await r.json();const ok=!!j.ok;launcher.classList.toggle('ai-ready',ok);launcher.classList.toggle('ai-off',!ok);if(aiBadge)aiBadge.textContent=ok?'AI ✓':'AI !';if(launcherLabel)launcherLabel.textContent=ok?'تحدّث مع المأمون AI':'المأمون AI يحتاج تفعيل';return ok}catch{launcher.classList.add('ai-off');if(aiBadge)aiBadge.textContent='AI !';return false}}
checkAiReady();window.addEventListener('maamoon-ai-voice',e=>{const ok=!!e.detail?.ok;launcher.classList.toggle('ai-ready',ok);launcher.classList.toggle('ai-off',!ok);if(aiBadge)aiBadge.textContent=ok?'AI ✓':'AI !'});


function setAvatar(mode){avatar.classList.remove('talking','listening','thinking');if(mode)avatar.classList.add(mode)}
function setStatus(text,kind=''){status.className='mb-scene-status'+(kind?' '+kind:'');status.querySelector('span').textContent=text}
function addMsg(who,text){if(!text||!text.trim())return;const m=el('div','mb-msg '+who,safe(text.trim()));transcript.appendChild(m);transcript.scrollTop=transcript.scrollHeight}
function clearWelcome(){const w=transcript.querySelector('.mb-welcome');if(w)w.remove()}
function send(obj){if(dc?.readyState==='open')dc.send(JSON.stringify(obj))}
function refreshContext(){if(!connected)return;send({type:'session.update',session:{instructions:baseInstruction()}})}
function askContext(){if(!connected)return;refreshContext();send({type:'response.create',response:{instructions:`ساعد الطفل الآن في النشاط الظاهر. ${contextText()} أعط توجيهًا قصيرًا جدًا بالعربية الفصحى، ثم اسأله سؤالًا واحدًا بسيطًا مرتبطًا بالنشاط.`}})}

function onEvent(e){let ev;try{ev=JSON.parse(e.data)}catch{return}
 switch(ev.type){
  case 'session.created':
  case 'session.updated': break;
  case 'input_audio_buffer.speech_started': setAvatar('listening');setStatus('أنا أستمع إليك…','listening');break;
  case 'input_audio_buffer.speech_stopped': setAvatar('thinking');setStatus('أفكر في إجابتك…','live');break;
  case 'conversation.item.input_audio_transcription.completed':
    lastUser=ev.transcript||'';if(lastUser){clearWelcome();addMsg('child',lastUser)}break;
  case 'response.created': setAvatar('thinking');setStatus('أفكر…','live');lastAssistant='';break;
  case 'response.output_audio_transcript.delta':
    lastAssistant+=(ev.delta||'');setAvatar('talking');setStatus('المأمون يتحدث…','live');break;
  case 'response.output_audio_transcript.done':
    if(ev.transcript)lastAssistant=ev.transcript; if(lastAssistant){clearWelcome();addMsg('mamoun',lastAssistant);lastAssistant=''}break;
  case 'response.output_audio.done': setAvatar('');setStatus('تحدّث الآن، أنا أستمع إليك','live');break;
  case 'response.done': if(ev.response?.status==='failed'){addMsg('system','تعذر إكمال الرد. حاول مرة أخرى.');setAvatar('');}break;
  case 'error': addMsg('system','حدث خطأ في الاتصال. جرّب إنهاء الحديث ثم ابدأ من جديد.');setAvatar('');break;
 }
}

async function connect(){
 if(connected)return disconnect();
 start.disabled=true;start.classList.add('connecting');start.querySelector('span').textContent='جاري الاتصال…';setStatus('جاري تجهيز الميكروفون…');
 try{
  if(!navigator.mediaDevices?.getUserMedia)throw new Error('microphone_unsupported');
  stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
  pc=new RTCPeerConnection();
  pc.ontrack=e=>{audioEl.srcObject=e.streams[0];audioEl.play().catch(()=>{})};
  stream.getTracks().forEach(t=>pc.addTrack(t,stream));
  dc=pc.createDataChannel('oai-events');dc.addEventListener('message',onEvent);
  dc.addEventListener('open',()=>{
    connected=true;start.disabled=false;start.classList.remove('connecting');start.classList.add('stop');start.innerHTML='⏹️ <span>إنهاء الحديث</span>';mute.disabled=false;contextBtn.disabled=false;setStatus('تحدّث الآن، أنا أستمع إليك','live');
    refreshContext();
    send({type:'response.create',response:{instructions:'ابدأ الجلسة الآن بقول: "أهلًا يا بطل! أنا المأمون. هيا نتعلم العربية معًا. هل أنت مستعد؟" قلها بصوت دافئ وبطيء، ولا تضف سؤالًا آخر.'}});
    clearTimeout(sessionTimer);sessionTimer=setTimeout(()=>{addMsg('system','انتهت جلسة التدريب القصيرة. يمكنك بدء جلسة جديدة متى شئت.');disconnect()},MAX_MS);
  });
  pc.onconnectionstatechange=()=>{if(['failed','closed','disconnected'].includes(pc.connectionState)&&connected)disconnect(false)};
  const offer=await pc.createOffer();await pc.setLocalDescription(offer);
  const res=await fetch(API,{method:'POST',headers:{'content-type':'application/sdp'},body:offer.sdp});
  if(!res.ok){let msg='';try{msg=(await res.json()).error||''}catch{}throw new Error(msg||`HTTP_${res.status}`)}
  const answer={type:'answer',sdp:await res.text()};await pc.setRemoteDescription(answer);
 }catch(err){
  cleanup();start.disabled=false;start.classList.remove('connecting','stop');start.innerHTML='🎙️ <span>ابدأ الحديث</span>';setStatus('تعذر بدء المحادثة');
  const m=String(err?.message||err);
  if(m.includes('missing_api_key'))addMsg('system','لم تتم إضافة مفتاح OpenAI إلى Netlify بعد.');
  else if(m.includes('NotAllowedError')||m.includes('Permission'))addMsg('system','اسمح باستخدام الميكروفون من إعدادات المتصفح، ثم حاول مرة أخرى.');
  else addMsg('system','تعذر الاتصال بالمأمون الآن. تحقق من الإنترنت وإعداد OpenAI ثم حاول مرة أخرى.');
 }
}
function cleanup(){clearTimeout(sessionTimer);sessionTimer=null;try{dc?.close()}catch{};try{pc?.close()}catch{};try{stream?.getTracks().forEach(t=>t.stop())}catch{};pc=dc=stream=null;connected=false;muted=false;setAvatar('')}
function disconnect(showMsg=true){cleanup();start.disabled=false;start.classList.remove('connecting','stop');start.innerHTML='🎙️ <span>ابدأ الحديث</span>';mute.disabled=true;contextBtn.disabled=true;mute.textContent='🔇 كتم الميكروفون';setStatus('المأمون جاهز للتحدث معك');if(showMsg)addMsg('system','تم إنهاء الحديث.')}
function toggleMute(){if(!stream)return;muted=!muted;stream.getAudioTracks().forEach(t=>t.enabled=!muted);mute.textContent=muted?'🎙️ تشغيل الميكروفون':'🔇 كتم الميكروفون';setStatus(muted?'الميكروفون مكتوم':'تحدّث الآن، أنا أستمع إليك',muted?'':'live')}
function open(){backdrop.classList.add('open');document.body.style.overflow='hidden';const img=document.getElementById('mbBuddyImage');if(img&&img.dataset.fullSrc&&img.src.indexOf('mamoun-buddy.png')<0){const full=new Image();full.onload=()=>{img.src=img.dataset.fullSrc};full.src=img.dataset.fullSrc}}
function close(){backdrop.classList.remove('open');document.body.style.overflow='';if(connected)disconnect(false)}
launcher.onclick=open;const heroAiBtn=document.getElementById('heroAiBtn');if(heroAiBtn)heroAiBtn.onclick=open;$('mbClose').onclick=close;backdrop.addEventListener('click',e=>{if(e.target===backdrop)close()});start.onclick=connect;mute.onclick=toggleMute;contextBtn.onclick=askContext;
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&backdrop.classList.contains('open'))close()});
// Keep the AI aware of page changes while a session is open.
const obs=new MutationObserver(()=>{if(connected){clearTimeout(obs._t);obs._t=setTimeout(refreshContext,350)}});obs.observe(document.getElementById('app')||document.body,{subtree:true,attributes:true,attributeFilter:['class']});
})();
