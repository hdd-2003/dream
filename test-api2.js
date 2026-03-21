async function test() {
  const url = 'https://api.longcat.chat/openai/v1/chat/completions';
  const apiKey = 'ak_2Ls5D22jV6fT57w9bp0Ql1C61Ue4G';
  
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
          { role: 'user', content: 'test' }
        ]
      })
    });
    console.log('Status:', response.status);
    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
  } catch(e) {
    console.error(e);
  }
}
test();
