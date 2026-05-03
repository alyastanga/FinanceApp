# 🤖 AI Assistant Testing Prompts

Use these prompts to test your multi-provider AI engine (Gemini, ChatGPT, Claude, Grok, or Local Llama). These are designed to trigger specific financial intelligence features of the app.

---

## 📊 1. Financial Context & Portfolio Analysis
*Test how well the AI understands your live database context (Net Worth, Goals, Incomes).*

> "Analyze my current net worth and tell me if I'm on track for my primary savings goal."

> "Which of my income sources is the most stable, and how does it compare to my monthly spending?"

> "Based on my portfolio, should I be worried about my current liquidity? List my most liquid assets."

---

## 📈 2. Scenario Simulation & "What If"
*Test the AI's ability to calculate complex projections.*

> "If I invest an additional 20,000 PHP every month into my 'High Growth' portfolio, when will I reach my 1M PHP target? Assume a 7% annual return."

> "What happens to my survival runway if my monthly rent increases by 15% starting next month?"

> "Can I afford to buy a 50,000 PHP laptop next month without dipping into my emergency fund?"

---

## 💰 3. Budgeting & Optimization
*Test the AI's strategy and categorization logic.*

> "Suggest a more aggressive budget for next month that prioritizes my 'Downpayment' goal over my 'Entertainment' spending."

> "I spent too much on 'Dining Out' this week. How should I adjust my remaining budget for the month to stay in the green?"

> "Give me 3 actionable tips to increase my monthly savings rate based on my recent expense categories."

---

## 🛠️ 4. Technical & Parser Testing
*Test the parser-ready response format.*

> "I just received a 10,000 PHP bonus. Log this as a 'Bonus' income for today with the description 'Performance Reward'."

> "Create a new goal for me called 'Japan Trip' with a target of 150,000 PHP and a deadline for December 2026."

---

## 🧠 5. Stress Testing (Model Comparison)
*Switch providers in Settings and run these to see the difference in "personality" and depth.*

> "Explain the concept of 'Compound Interest' to me like I'm a 10-year-old, but use my actual savings goals as examples."

> "What is the most 'risky' part of my current financial profile, and how would a Senior Wealth Manager suggest I fix it?"

---

## 💡 Pro Tips for Testing:
1. **Toggle Modes**: Test the same prompt in **Cloud Mode** vs **Local Mode** to see the trade-off between speed/privacy and intelligence.
2. **Provider Switch**: Try a complex simulation in **Claude 3.5 Sonnet** (Anthropic) and compare it to **GPT-4o** (OpenAI).
3. **Data Check**: The AI has access to your *real* data (anonymized/encrypted). If it says something incorrect about your balance, check if your bank sync is up to date!
