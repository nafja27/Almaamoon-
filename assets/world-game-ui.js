(()=>{
'use strict';
const $=id=>document.getElementById(id);
const aiBtn=$('worldAiObject');
const aiState=$('worldAiState');
const quick=$('worldQuickStart');

function openAI(){
  const launcher=document.querySelector('.mamoun-buddy-launcher');
  if(launcher) launcher.click();
}
function quickStart(){
  const b=$('enterStageBtn');
  if(b&&!b.disabled) b.click();
}
function syncWorldClass(){
  const active=$('worldScreen')?.classList.contains('active');
  document.body.classList.toggle('world-ui-active',!!active);
}
function syncAi(){
  if(!aiBtn)return;
  const l=document.querySelector('.mamoun-buddy-launcher');
  const ready=!!l?.classList.contains('ai-ready');
  const off=!!l?.classList.contains('ai-off');
  aiBtn.classList.toggle('ready',ready);
  aiBtn.classList.toggle('offline',off&&!ready);
  if(aiState) aiState.textContent=ready?'جاهز الآن ✓':off?'يحتاج تفعيل':'جاري التحقق…';
}
function syncSpeech(){
  const place=$('missionPlace')?.textContent?.trim();
  const box=document.querySelector('.world-mamoun-speech span');
  if(box&&place) box.textContent=`اخترت ${place}. اضغط «ابدأ المهمة» عندما تكون مستعدًا.`;
}

aiBtn?.addEventListener('click',openAI);
quick?.addEventListener('click',quickStart);

const root=$('app')||document.body;
const obs=new MutationObserver(()=>{syncWorldClass();syncAi();syncSpeech()});
obs.observe(root,{subtree:true,attributes:true,attributeFilter:['class'],childList:true,characterData:true});
setInterval(syncAi,1500);
window.addEventListener('maamoon-ai-voice',syncAi);
document.querySelectorAll('.station-node').forEach(n=>n.addEventListener('click',()=>setTimeout(syncSpeech,40)));
syncWorldClass();syncAi();syncSpeech();
})();
