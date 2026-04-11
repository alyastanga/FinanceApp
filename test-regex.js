const tests = [
  `Here is your chart:
[CHART_DATA: {"data": [{"label": "Cash", "value": 5000, "color": "#10b981"}, {"label": "Crypto", "value": 1500, "color": "#8b5cf6"}]}]`,
  
  `Here is your chart in raw JSON:
\`\`\`json
{
  "data": [
    {"label": "Cash", "value": 5000, "color": "#10b981"}
  ]
}
\`\`\``,

  `Here is your chart:
[CHART_DATA: 
\`\`\`json
{
  "data": [
    {"label": "Cash", "value": 5000, "color": "#10b981"}
  ]
}
\`\`\`
]`
];

tests.forEach((text, i) => {
  let chartData = null;
  let cleanText = text;
  
  const CHART_REGEX = /\[?CHART_DATA:?\s*(?:```json\s*)?(\{[\s\S]*?\})(?:\s*```)?\s*\]?/gi;
  const match = CHART_REGEX.exec(text);

  if (match && match[1]) {
    try {
      const parsed = JSON.parse(match[1]);
      if (parsed && Array.isArray(parsed.data)) {
        chartData = parsed.data;
        cleanText = text.replace(match[0], '').trim();
      }
    } catch (e) {
      try {
        const fallbackRegex = /({[^{}]*"data"\s*:[^{}]*\[[\s\S]*?\][\s\S]*?})/s;
        const fallbackMatch = fallbackRegex.exec(match[1]);
        if (fallbackMatch) {
            const fallbackParsed = JSON.parse(fallbackMatch[1]);
            if (fallbackParsed && Array.isArray(fallbackParsed.data)) {
               chartData = fallbackParsed.data;
               cleanText = text.replace(match[0], '').trim();
            }
        }
      } catch (e2) {
      }
    }
  } else {
     try {
        const rawJsonMatch = /(?:```json\s*)?(\{[\s\S]*?"data"\s*:[\s\S]*?\[[\s\S]*?\][\s\S]*?\})(?:\s*```)?/s.exec(text);
        if (rawJsonMatch && rawJsonMatch[1]) {
           const parsed = JSON.parse(rawJsonMatch[1]);
           if (parsed && Array.isArray(parsed.data) && parsed.data.length > 0 && parsed.data[0].label) {
              chartData = parsed.data;
              cleanText = text.replace(rawJsonMatch[0], '').trim();
           }
        }
     } catch (e) { }
  }

  console.log(`Test ${i}:`, chartData ? 'SUCCESS' : 'FAILED');
  if (chartData) {
     console.log('Clean Text:', cleanText);
  }
});
