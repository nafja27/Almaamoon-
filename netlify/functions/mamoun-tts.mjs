const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});

const ARABIC=/[\u0600-\u06FF]/u;
const clean=(v)=>String(v||'').normalize('NFC').replace(/[<>\[\]{}\\]/g,'').replace(/\s+/g,' ').trim().slice(0,450);

export default async(request)=>{
 if(request.method!=='POST')return json({error:'method_not_allowed'},405);
 const key=process.env.OPENAI_API_KEY;
 if(!key)return json({error:'missing_api_key'},503);
 try{
  const body=await request.json().catch(()=>({}));
  const text=clean(body.text),slow=!!body.slow;
  if(!text||!ARABIC.test(text))return json({error:'invalid_text'},400);
  const shortSound=text.length<=5;
  let instructions='تحدث بالعربية الفصحى الواضحة بصوت دافئ وطبيعي ومحادثي، كرفيق تعليمي ودود لطفل يتعلم العربية كلغة ثانية. لا تتحدث كنظام آلي أو كمذيع، ولا تستخدم إيقاعًا ثابتًا أو نبرة مصطنعة. استخدم تنغيمًا بشريًا لطيفًا ووقفات قصيرة طبيعية، واجعل الابتسامة مسموعة في النبرة من غير مبالغة. التزم بالنص المكتوب كما هو، واحترم التشكيل والحركات والمدود بدقة.';
  if(shortSound)instructions+=' هذا تدريب أصوات وحروف: انطق المقطع أو الصوت نفسه كما كُتب، ولا تضف شرحًا، ولا تقل أسماء علامات التشكيل، ولا تحوّل المقطع إلى كلمة أخرى. حافظ بوضوح على الفرق بين الفتحة والضمة والكسرة وبين الحركة القصيرة والمد الطويل.';
  if(slow)instructions+=' انطق أبطأ قليلًا من المحادثة العادية مع بقاء الإيقاع طبيعيًا ومتصلًا. لا تفصل الحروف أو المقاطع بصورة آلية، ولا تمد الصوت أكثر من قيمته اللغوية.';
  else instructions+=' انطق بسرعة محادثة تعليمية هادئة، مع تنغيم طبيعي وغير آلي.';
  const r=await fetch('https://api.openai.com/v1/audio/speech',{method:'POST',headers:{authorization:`Bearer ${key}`,'content-type':'application/json'},body:JSON.stringify({model:'gpt-4o-mini-tts',voice:'marin',input:text,instructions,response_format:'wav',speed:slow?0.86:0.98})});
  if(!r.ok){const err=await r.text();console.error('mamoun-tts OpenAI error',r.status,err.slice(0,500));return json({error:r.status===429?'rate_limited':'openai_tts_error'},r.status===429?429:502)}
  const audio=await r.arrayBuffer();
  return new Response(audio,{status:200,headers:{'content-type':'audio/wav','cache-control':'private, max-age=0, no-store','x-content-type-options':'nosniff'}})
 }catch(e){console.error('mamoun-tts failed',e?.message||e);return json({error:'server_error'},500)}
};

export const config={path:'/api/mamoun-tts',method:'POST',rateLimit:{windowLimit:120,windowSize:60,aggregateBy:['ip','domain']}};
