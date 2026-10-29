import { defineEval, includes } from "@grok/agent-sdk/evals";

export default defineEval({
  tags: ["smoke"],
  description: "Lists Creative Tugs services on first contact.",
  async test(t) {
    await t.send(
      "Hi — I'm exploring a new company website. What services does Creative Tugs offer?",
    );
    t.succeeded();
    t.calledTool("list_services");
    t.check(t.reply, includes(/website|design|service/i));
  },
});
