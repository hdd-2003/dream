import { API_CONFIG } from '../config/api';
import { reportTraeDebug } from '../utils/telemetry';
import type { DreamType } from '../types';

export const callDreamAPI = async (text: string, type: DreamType) => {
  let url = API_CONFIG.url;
  const { apiKey, model, max_tokens, temperature } = API_CONFIG;

  if (!url || !apiKey || !model) {
    //#region debug-point
    reportTraeDebug({ ev: 'dream_api_skip', reason: 'missing_config', hasUrl: !!url, hasKey: !!apiKey, hasModel: !!model });
    //#endregion debug-point
    return null;
  }

  const systemPrompt = `你是一位专业的梦境心理分析师，擅长通过诗意的语言解读梦境。请根据用户的梦境描述，以JSON格式返回以下内容：
- title: 一个富有诗意的梦境标题（5-10字）
- summary: 梦境摘要，用一句优美语言概括（50字以内）
- interpretation: 梦境解读，2-3段温暖而富有哲理的文字
- suggestion: 温柔的建议，1-2条 actionable 的指引
- keyword: 一个关键词，概括这个梦的主题（2-4字）
- color: 一个十六进制颜色值，代表这个梦的基调
- gradient: Tailwind CSS 渐变类名（例如：from-amber-300 to-orange-500）
- imagePrompt: 一个英文提示词，用于AI生成这个梦境的背景图片（要梦幻、星空、艺术风格）

请直接返回纯JSON，不要有任何其他解释文字或Markdown格式。`;

  const userPrompt = `梦境描述：${text}\n梦境类型：${type === 'sweet' ? '美梦' : type === 'nightmare' ? '噩梦' : type === 'fantasy' ? '奇幻' : '回忆'}`;
  const apiStart = performance.now();
  const timeoutMs = 12000;
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    //#region debug-point
    reportTraeDebug({
      ev: 'dream_api_start',
      url,
      model,
      max_tokens,
      temperature,
      dreamType: type,
      dreamTextLen: text.length,
      timeoutMs
    });
    //#endregion debug-point
    
    let response;
    
    // 智能适配 Anthropic 和 OpenAI 格式
    if (url.includes('anthropic') && !url.includes('openai')) {
      if (url.endsWith('/anthropic') || url.endsWith('/anthropic/')) {
        url = url.replace(/\/$/, '') + '/v1/messages';
      }
      
      response = await fetch(url, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'Authorization': `Bearer ${apiKey}`,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
          max_tokens,
          temperature
        })
      });
    } else {
      response = await fetch(url, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          stream: false,
          max_tokens,
          temperature
        })
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      //#region debug-point
      reportTraeDebug({
        ev: 'dream_api_http_error',
        status: response.status,
        ms: Math.round(performance.now() - apiStart),
        errorText: errorText.slice(0, 500)
      });
      //#endregion debug-point
      throw new Error(`API请求失败: ${response.status} - ${errorText}`);
    }

    const data: unknown = await response.json();
    //#region debug-point
    reportTraeDebug({
      ev: 'dream_api_ok',
      ms: Math.round(performance.now() - apiStart),
      keys: typeof data === 'object' && data ? Object.keys(data as Record<string, unknown>) : typeof data
    });
    //#endregion debug-point
    
    let content = '';
    
    if (typeof data === 'object' && data !== null && 'choices' in data) {
      const choices = (data as { choices?: unknown }).choices;
      if (Array.isArray(choices)) {
        const first = choices[0] as unknown;
        if (typeof first === 'object' && first !== null) {
          const message = (first as { message?: unknown }).message;
          if (typeof message === 'object' && message !== null) {
            const messageContent = (message as { content?: unknown }).content;
            if (typeof messageContent === 'string') content = messageContent;
          }
        }
      }
    }

    if (!content && typeof data === 'object' && data !== null && 'content' in data) {
      const blocks = (data as { content?: unknown }).content;
      if (Array.isArray(blocks)) {
        const textBlock = blocks.find((block) => {
          if (typeof block !== 'object' || block === null) return false;
          const typeValue = (block as { type?: unknown }).type;
          const textValue = (block as { text?: unknown }).text;
          return typeValue === 'text' && typeof textValue === 'string';
        }) as { text?: string } | undefined;

        if (textBlock?.text) {
          content = textBlock.text;
        } else {
          const first = blocks[0];
          if (typeof first === 'object' && first !== null) {
            const firstText = (first as { text?: unknown }).text;
            if (typeof firstText === 'string') content = firstText;
          }
        }
      }
    }
    
    if (content) {
      content = content.replace(/```json/gi, '').replace(/```/g, '').trim();
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        if (Array.isArray(parsed.suggestion)) {
          parsed.suggestion = parsed.suggestion.join(' ');
        }
        //#region debug-point
        const imagePromptValue = (parsed as { imagePrompt?: unknown }).imagePrompt;
        reportTraeDebug({
          ev: 'dream_api_parse_ok',
          ms: Math.round(performance.now() - apiStart),
          parsedKeys: typeof parsed === 'object' && parsed ? Object.keys(parsed) : typeof parsed,
          hasImagePrompt: typeof imagePromptValue === 'string' && imagePromptValue.length > 0
        });
        //#endregion debug-point
        return parsed;
      }
    }
    
    //#region debug-point
    reportTraeDebug({
      ev: 'dream_api_parse_fail',
      ms: Math.round(performance.now() - apiStart),
      contentHead: (content || '').slice(0, 300)
    });
    //#endregion debug-point
    throw new Error('API返回格式无法解析为JSON: ' + content);
  } catch (error: unknown) {
    //#region debug-point
    if (error instanceof DOMException && error.name === 'AbortError') {
      reportTraeDebug({
        ev: 'dream_api_timeout',
        ms: Math.round(performance.now() - apiStart)
      });
    }
    reportTraeDebug({
      ev: 'dream_api_error',
      error: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : '',
      ms: Math.round(performance.now() - apiStart)
    });
    //#endregion debug-point
    return null;
  } finally {
    window.clearTimeout(timeoutId);
  }
};
