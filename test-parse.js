async function test() {
  const url = 'https://api.longcat.chat/openai/v1/chat/completions';
  const apiKey = 'ak_2Ls5D22jV6fT57w9bp0Ql1C61Ue4G';
  
  const systemPrompt = "你是一位专业的梦境心理分析师，擅长通过诗意的语言解读梦境。请根据用户的梦境描述，以JSON格式返回以下内容：\n- title: 一个富有诗意的梦境标题（5-10字）\n- summary: 梦境摘要，用一句斜体的优美语言概括（50字以内）\n- interpretation: 梦境解读，2-3段温暖而富有哲理的文字\n- suggestion: 温柔的建议，1-2条 actionable 的指引\n- keyword: 一个关键词，概括这个梦的主题（2-4字）\n- color: 一个十六进制颜色值，代表这个梦的基调\n- gradient: Tailwind CSS 渐变类名（例如：from-amber-300 to-orange-500）\n\n请直接返回纯JSON，不要有任何其他解释文字或Markdown格式（如```json）。";

  const userPrompt = "梦境描述：我梦见自己在云端的一座图书馆里找一本发光的书，周围有很多会飞的鲸鱼。图书馆里的书架都在漂浮，我感觉很平静，但又有一种迫切的寻找感。\n梦境类型：奇幻";

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'LongCat-Flash-Thinking-2601',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        stream: false,
        max_tokens: 4096,
        temperature: 0.8
      })
    });
    
    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
  } catch(e) {
    console.error(e);
  }
}
test();
