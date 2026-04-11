const text = `
Here is a breakdown of your current assets:
[CHART_DATA: 
{
  "data": [
    {"label": "Cash", "value": 5000, "color": "#10b981"},
    {"label": "Crypto", "value": 1500, "color": "#8b5cf6"}
  ]
}
]
`;

  let chartData = null;
  let cleanText = text;
  
  // Try finding CHART_DATA
  const CHART_REGEX = /\[?CHART_DATA:?\s*(?:```json\s*)?(\{[\s\S]*?\})(?:\s*```)?\s*\]?/gi;
  const match = CHART_REGEX.exec(text);
  
  console.log(match ? 'Matched CHART_REGEX' : 'Failed CHART_REGEX');

  if (match && match[1]) {
    try {
      const parsed = JSON.parse(match[1]);
      if (parsed && Array.isArray(parsed.data)) {
        chartData = parsed.data;
        cleanText = text.replace(match[0], '').trim();
        console.log("Success A");
      }
    } catch (e) {
      console.log("Failed JSON.parse", e);
      // Fallback 1: Try to recover mildly malformed JSON inside a CHART_DATA block
      try {
        const fallbackRegex = /({[^{}]*"data"\s*:[^{}]*\[[\s\S]*?\][\s\S]*?})/s;
        const fallbackMatch = fallbackRegex.exec(match[1]);
        if (fallbackMatch) {
            const fallbackParsed = JSON.parse(fallbackMatch[1]);
            if (fallbackParsed && Array.isArray(fallbackParsed.data)) {
               chartData = fallbackParsed.data;
               cleanText = text.replace(match[0], '').trim();
               console.log("Success B");
            }
        }
      } catch (e2) {
        console.warn('[AI UI] Chart extraction failed', e2);
      }
    }
  } else {
     // Fallback 2: Raw JSON detection if the CHART_DATA tag was completely omitted
     try {
        const rawJsonMatch = /(?:```json\s*)?(\{[\s\S]*?"data"\s*:[\s\S]*?\[[\s\S]*?\][\s\S]*?\})(?:\s*```)?/s.exec(text);
        if (rawJsonMatch && rawJsonMatch[1]) {
           const parsed = JSON.parse(rawJsonMatch[1]);
           // Minimal validation for our simple chart structure
           if (parsed && Array.isArray(parsed.data) && parsed.data.length > 0 && parsed.data[0].label) {
              chartData = parsed.data;
              cleanText = text.replace(rawJsonMatch[0], '').trim();
              console.log("Success C");
           }
        }
     } catch (e) { /* ignore */ }
  }

console.log(chartData);
