import { test } from "bun:test";
import { translate } from "..";

test("translate", async () => {
  const res = await translate("Hello World!", null, "Chinese (Literary)");
  console.log(JSON.stringify(res, null, 2));

  const res2 = await translate(
    `<div class="notranslate">This will not be translated.</div><div>This will be translated.</div>`,
    null,
    "zh-Hans",
    {
      translateOptions: {
        textType: "html",
      },
    }
  );
  console.log(JSON.stringify(res2, null, 2));
});
