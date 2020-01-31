import * as Koa from "koa";
import * as Router from "koa-router";
import * as send from "koa-send";
import * as path from "path";

const app = new Koa();

const router = new Router();
router.get("/*", async ctx => {
  await send(ctx, path.join(__dirname, "client", "build", "index.html"));
});
app.use(router.routes());

app.listen(4000);

console.log("Server running on port 4000");
