import * as Koa from "koa";
import * as Router from "koa-router";
import * as send from "koa-send";
import * as serve from "koa-static";

const app = new Koa();
app.use(serve(__dirname + "/client/build"));

const router = new Router();
router.get("/*", async ctx => {
  await send(ctx, "build/index.html", {
    root: __dirname + "/client"
  });
});
app.use(router.routes());

app.listen(4000);

console.log("Server running on port 4000");
