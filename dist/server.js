"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Koa = require("koa");
const Router = require("koa-router");
const send = require("koa-send");
const path = require("path");
const app = new Koa();
const router = new Router();
router.get("/*", async (ctx) => {
    await send(ctx, path.join(__dirname, "client", "build", "index.html"));
});
app.use(router.routes());
app.listen(4000);
console.log("Server running on port 4000");
//# sourceMappingURL=server.js.map