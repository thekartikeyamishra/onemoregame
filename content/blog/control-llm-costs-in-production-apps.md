---
title: "How to keep LLM costs under control in a production app"
description: "A practical playbook for AI features that earn more than they cost: per-user maths, routing, caching, prompt trimming, hard limits and abuse protection."
date: 2026-10-21
seoTitle: "How to control LLM costs in production apps"
tags: ["AI", "LLM", "unit economics", "app costs"]
faq:
  - q: "How do I calculate the cost of an AI feature per user?"
    a: "Multiply average input and output tokens per request by the model's per-token prices, then by requests per active user per month. Compare that number with the revenue per user the feature supports, and keep a margin for spikes and abuse."
  - q: "What is the quickest way to cut LLM costs?"
    a: "Stop calling the model for questions you can answer without it. Rule-based answers, search over your own content and an answer cache for repeated questions often remove a large share of calls before you touch prompts or models."
---

The first invoice from an AI provider is often the moment a founder realises the feature they launched has negative margins. Language models charge for every token in and every token out, and a chatty feature used by enthusiastic free users can cost more than the subscription it was meant to sell.

The good news is that most of that cost is avoidable. Here's the playbook I follow when adding AI to a product, in the order that saves the most money.

## Start with the unit economics

Before choosing a model, write down four numbers:

1. **Tokens per request:** system prompt + context + user message (input), and the typical answer length (output).
2. **Price per token:** from your provider's current price list; input and output are priced differently, and output is usually more expensive.
3. **Requests per active user per month.**
4. **Revenue per active user per month** that this feature supports.

Cost per user = tokens per request × price × requests per user. If that's more than a small fraction of revenue per user, the design has to change, not just the model.

Do this for your heaviest 5% of users too. Averages hide the people who will use the feature 50 times a day.

## 1. Don't call the model at all

The cheapest token is one you never send. In most products, a large share of questions are predictable:

- **Rules first.** Match common intents (pricing, how-to, account questions) with keywords or a small classifier and answer from reviewed text. The Mitra assistant on this site works this way: most conversations never reach a model.
- **Search your own content.** For help and documentation questions, retrieve the relevant article and show it. Only ask a model to summarise when the user needs it.
- **UI over chat.** If people keep asking the AI to do one specific thing, that's a button, not a conversation.

## 2. Cache repeated answers

Many users ask the same question in slightly different words. Normalise the text (lowercase, trim punctuation and whitespace), hash it with the language and any parameters that change the answer, and cache the response for days.

Rules that keep caching safe:

- **Only cache answers that contain no user-specific data.** A cached answer must be correct for anyone who asks.
- **Cache single-turn questions, not whole conversations,** unless you include the full context in the key.
- **Expire entries** when the underlying content changes.

Providers also offer prompt caching for long, repeated prefixes such as system prompts and documents. Put stable content first in the prompt so it can be cached.

## 3. Send fewer tokens

- **Trim history.** Send the last few turns, not the whole conversation, and summarise older turns if they matter.
- **Retrieve, don't paste.** Include only the two or three most relevant chunks of a document, not the whole thing.
- **Cap input length** at the API boundary. A 600-character limit on a support chat costs users nothing and stops pasted novels.
- **Cap output length** with the provider's max-tokens setting, and ask for short answers in the instructions.

## 4. Route to the smallest model that works

Use a small, fast, cheap model by default, and escalate to a larger one only for tasks that need it: complex reasoning, long documents, or when the small model's answer fails a check. For classification, extraction and short replies, small models are usually enough.

Keep the provider and model as configuration, not code, so you can switch when prices change, which they do often.

## 5. Put hard limits everywhere

Limits are what turn an unbounded cost into a budget:

- **Per user:** requests per minute and per day, tighter for anonymous and free users.
- **Per feature:** a daily ceiling on total model calls. When it's reached, fall back to non-AI answers gracefully instead of failing.
- **Per request:** timeouts and max tokens.
- **Per provider account:** spending alerts and caps in the provider dashboard as a last line of defence.

Make the fallback good. "I can't answer that right now, here's the contact page" is fine; a spinning wheel is not.

## 6. Defend against abuse

A public AI endpoint is an attractive free model for anyone who finds it. Protect it like a payment endpoint:

- **Same-origin checks and authentication** where possible, so other sites can't use your endpoint.
- **Rate limiting by user and by network,** stored in a shared cache rather than per server instance.
- **Input screening** for obvious prompt-injection patterns and off-topic use, rejected before reaching the model.
- **A narrow system prompt** that limits the assistant to your product's topics and tells it to ignore instructions to change its rules.
- **Output checks:** strip links to domains you don't control, and never let model output trigger actions (sending emails, changing data) without validation.

## 7. Charge in a way that tracks cost

If AI is a core feature, price it so heavy users pay more:

- **Credits or quotas** included in each plan, with top-ups.
- **Higher tiers** that unlock larger models or longer contexts.
- **Free tiers with tight daily limits** and cached or rule-based answers.

Store the cost of every request against the user and the feature. You can't manage what you don't measure, and you'll want those numbers when you set prices.

## 8. Turn usage into a moat

Every question a model answers is information about what your users need. Log questions without personal identifiers, count how often each kind appears, and promote the most frequent ones into reviewed, rule-based answers or product features. Over time:

- more questions are answered instantly and for free;
- answers become more accurate and consistent;
- your cost per user falls as usage grows, which is the opposite of what happens by default.

That compounding loop (usage improves the free path, which lowers cost, which lets you serve more users) is hard for a competitor who just wraps an API to copy.

## A checklist before you ship

- [ ] Cost per user calculated for average and heavy users
- [ ] Rule-based or search answers for the most common questions
- [ ] Answer cache for anonymous, single-turn questions
- [ ] Input and output length caps
- [ ] Small model by default; provider and model configurable
- [ ] Per-user, per-network and global daily limits with a graceful fallback
- [ ] Same-origin checks, injection screening and a narrow system prompt
- [ ] Per-request cost logging
- [ ] Spending alerts at the provider
- [ ] Privacy notice updated to mention the AI provider (see the [DPDP and GDPR checklist](/blog/dpdp-act-gdpr-checklist-for-app-founders))

The AI part of an AI feature is usually the easy part. The engineering around it decides whether it's a business. If you're planning one, the [cost calculator](/tools/app-cost-calculator) includes a line for AI work, and I'm happy to [review your design](/work-with-me).
