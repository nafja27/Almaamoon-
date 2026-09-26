const reply=(body,status=200,headers={})=>new Response(body,{status,headers:{'cache-control':'no-store',...headers}});

const INSTRUCTIONS=`أنت شخصية "المأمون"، رفيق تعليمي للأطفال داخل منصة "مغامرة المأمون" لتعلّم العربية لغير الناطقين بها.
قواعدك ثابتة:
- تحدث بالعربية الفصحى المبسطة فقط، بصوت دافئ وطبيعي ومحادثي. استخدم تنغيمًا بشريًا متنوعًا ووقفات قصيرة طبيعية، واجعل الابتسامة مسموعة في صوتك من غير مبالغة. لا تتحدث بنبرة روبوتية أو كنبرة مذيع، ولا تستخدم إيقاعًا ثابتًا أو قراءة مسطحة.
- قل "أهلًا يا بطل"، ولا تستخدم كلمات عامية مثل: هلا، شنو، إي، عادي.
- اجعل كل رد قصيرًا جدًا: غالبًا جملة أو جملتين. تحدث كأنك تخاطب طفلًا أمامك مباشرة، لا كأنك تقرأ نصًا مكتوبًا.
- ركّز على الحروف والحركات والمدود والكلمات والجمل والقراءة والكتابة.
- إذا كان كلام الطفل خارج موضوع التعلم، أعده بلطف إلى نشاط العربية.
- لا تطلب الاسم أو العمر أو المدرسة أو الموقع أو أي معلومات شخصية.
- افهم الإنجليزية عند الحاجة، لكن أجب أساسًا بالعربية، ويمكنك إعطاء كلمة إنجليزية قصيرة جدًا كمساعدة.
- عند الإجابة الصحيحة شجّع الطفل بعبارات مثل: "أحسنت!" أو "ممتاز!".
- عند الخطأ لا تقل إن الإجابة سيئة. قل: "أحسنت المحاولة. استمع مرة أخرى ثم حاول.".
- عندما تطلب من الطفل النطق، انطق النموذج بوضوح وبإيقاع طبيعي ثم توقف فعلًا ليجيب. في الأصوات القصيرة والمدود لا تضف كلمات حول النموذج أثناء النطق نفسه.
- لا تتحدث طويلًا ولا تطرح أكثر من سؤال واحد في كل دور.`;

export default async(request)=>{
 if(request.method!=='POST')return reply(JSON.stringify({error:'method_not_allowed'}),405,{'content-type':'application/json'});
 const key=process.env.OPENAI_API_KEY;
 if(!key)return reply(JSON.stringify({error:'missing_api_key'}),503,{'content-type':'application/json'});
 try{
  const sdp=await request.text();
  if(!sdp||sdp.length>60000)return reply(JSON.stringify({error:'invalid_sdp'}),400,{'content-type':'application/json'});
  const session={
   type:'realtime',
   model:'gpt-realtime',
   instructions:INSTRUCTIONS,
   output_modalities:['audio'],
   max_output_tokens:180,
   audio:{
    input:{
     noise_reduction:{type:'near_field'},
     transcription:{model:'gpt-4o-mini-transcribe',language:'ar',prompt:'العربية الفصحى المبسطة، حروف وحركات ومدود وكلمات تعليمية للأطفال.'},
     turn_detection:{type:'semantic_vad',eagerness:'medium',create_response:true}
    },
    output:{voice:'marin'}
   }
  };
  const fd=new FormData();
  fd.append('sdp',new Blob([sdp],{type:'application/sdp'}),'offer.sdp');
  fd.append('session',new Blob([JSON.stringify(session)],{type:'application/json'}),'session.json');
  const r=await fetch('https://api.openai.com/v1/realtime/calls',{method:'POST',headers:{authorization:`Bearer ${key}`},body:fd});
  const body=await r.text();
  if(!r.ok){console.error('OpenAI Realtime:',r.status,body.slice(0,800));return reply(JSON.stringify({error:r.status===429?'rate_limited':'openai_realtime_error'}),r.status===429?429:502,{'content-type':'application/json'})}
  return reply(body,201,{'content-type':'application/sdp'});
 }catch(e){console.error('mamoun-realtime failed',e?.message||e);return reply(JSON.stringify({error:'server_error'}),500,{'content-type':'application/json'})}
};

export const config={
 path:'/api/mamoun-realtime',
 method:'POST',
 rateLimit:{windowLimit:20,windowSize:3600,aggregateBy:['ip','domain']}
};
