# A local document agent for accurate, cited answers from your files

Heph is a project I have worked on for months. It helps you work with files directly on your PC. I wanted to point it at a folder, ask it questions, and then actually see where the answers came from.

### Why I made it

One could argue that Codex achieves the same thing. However, I wanted Heph to be much more focused on the sources. When I am trying to study something or fill the gaps in my understanding, I want more than an answer that sounds right. I want to see the exact passage from the file it used so I can check it myself.

Models can sound very confident while being slightly wrong. That matters less when I am brainstorming, but it bothers me a lot when I am trying to learn something. If I have to search every file again just to make sure the answer isn't made up, the agent did not really save me much work.

This is why Heph keeps the evidence attached to the answer. You ask a question, read the answer, and can then open the passage it used. Keeping the sources attached was basically the reason I started making Heph in the first place.

### The armory

The core idea of Heph is an armory. An armory is just a normal folder for one topic with its own materials, index, chats, and memory. If you wanted to learn biology, for example, you would create a `Biology` armory and put the files inside `~/.armories/Biology/materials`.

The materials get indexed so Heph can find the useful parts instead of sending every file into the model at once. You open it with `heph Biology` and start asking questions in the chatbox. If an answer is interesting or seems weird, you can open the evidence and see what Heph used. I also like that every armory is separate because I know what files Heph can and can't use before I ask it anything.

![Heph demo](media:heph-demo)

The demo above shows the basic interaction. This is how Heph currently looks in use, with the active armory, evidence, commands, and cited answer visible together.

![Heph in use](media:heph-interface)

### A typeface for Heph

Once Heph was already working, I started drawing a custom typeface for it. I wanted the interface to feel more polished and more like a complete system, while keeping it quiet and easy to read.

![Drawing the first letterforms](media:heph-typeface-early)

I kept working through the character set, checking individual curves and how the letters felt together. Some shapes took much longer to settle than I expected.

![Refining the typeface](media:heph-typeface-refinement)

This work also led to a new Heph lockup, giving the product a clearer visual identity as I continue polishing it.

![The Heph lockup](media:heph-lockup)

### Where it is now

Heph is still a very early project, and there are many things I want to improve. I want it to be more reliable, work for more use cases, and be more accurate overall. Indexing and retrieval can get better, and I also want it to be easier to check the evidence without that process getting in the way of the conversation.

I think Heph will naturally improve as the models, especially the open-source ones, become more capable and cheaper to run. The model can change while the main idea stays the same. Your files remain yours, and you can check what the answer is based on.

I am basically building the tool I want for myself and then noticing where it falls apart in practice. Heph is still in progress, and I already like using it a lot. More to come.

[GitHub repository](https://github.com/gildrb/heph)
