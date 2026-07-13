# A local document agent for accurate, cited answers from your files

Heph is a project I have worked on for months that helps you work with files directly on your PC. I wanted something I could point at a folder of material, ask questions about and still understand where every answer actually came from.

One could argue that Codex achieves the same, which it does, however Heph is built around a different expectation. Giving me an answer is not enough when I am trying to study something or fill the gaps in my understanding. I want the exact source it used to be visible so I can check that the answer is not made up, read the surrounding material and decide whether I agree with it myself.

## Why the sources matter

Models are very good at sounding confident even when something is slightly wrong. That is not as much of a problem when you are brainstorming, but it becomes a much bigger problem when the answer is supposed to teach you something. If I have to search through every file again to verify the response, the agent did not really save me much work.

Heph keeps the evidence attached to the answer. The goal is that you can ask a question, read the response, open the exact passage behind it and continue from there. I do not want the source to be hidden behind the interface or added as an afterthought. It is the main reason I am building Heph in the first place.

## Armories keep things focused

The core idea of Heph is an armory. An armory is a normal folder for one body of knowledge, with its own materials, index, chats and memory. If you wanted to learn Biology, for example, you would create a `Biology` armory and place the relevant files inside `~/.armories/Biology/materials`.

Those materials get indexed so Heph can retrieve the relevant parts instead of sending every file into the model at once. You can open the armory with `heph Biology`, ask questions in the chatbox and use the evidence view to inspect what Heph used. Keeping each armory separate also makes it much easier to understand what Heph can use before you ask it anything.

![Heph demo](media:heph-demo)

## Still early, but useful

Heph is still a very early project and I will work hard to make it more reliable, work for more use-cases and overall increase its accuracy. There are many details I still want to improve, especially around indexing, retrieval and making the evidence easier to inspect without interrupting the conversation.

I also think Heph will only get better as the models, especially the open source ones, get better and cheaper to run. The model can change over time without changing the core idea: your files stay organized, the context stays focused and the evidence stays visible.

I am not pretending that Heph is finished. I am building the tool I personally want to use, learning where it falls apart and improving it from there. More to come.

[GitHub repository](https://github.com/gildrb/heph)
