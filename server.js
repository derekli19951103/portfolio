"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Koa = require("koa");
const Router = require("koa-router");
const send = require("koa-send");
const serve = require("koa-static");
const app = new Koa();
app.use(serve(__dirname + "/client/build"));
const router = new Router();
router.get("/*", async (ctx) => {
    await send(ctx, "build/index.html", {
        root: __dirname + "/client"
    });
});
app.use(router.routes());
app.listen(4000);
console.log("Server running on port 4000");
//# sourceMappingURL=server.js.map