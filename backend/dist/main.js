"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const platform_express_1 = require("@nestjs/platform-express");
const express = require("express");
const server = express();
let nestAppPromise;
async function bootstrapServerless() {
    if (!nestAppPromise) {
        const app = await core_1.NestFactory.create(app_module_1.AppModule, new platform_express_1.ExpressAdapter(server));
        app.enableCors();
        await app.init();
        nestAppPromise = Promise.resolve(app);
    }
    return server;
}
if (process.env.NODE_ENV !== 'production') {
    async function bootstrapLocal() {
        const app = await core_1.NestFactory.create(app_module_1.AppModule);
        app.enableCors();
        const port = process.env.PORT || 3001;
        await app.listen(port);
        console.log(`SI-TAQUA Backend running locally on port ${port}`);
    }
    bootstrapLocal();
}
exports.default = async (req, res) => {
    const handler = await bootstrapServerless();
    return handler(req, res);
};
//# sourceMappingURL=main.js.map