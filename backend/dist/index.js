"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const express_1 = __importDefault(require("express"));
const api_1 = __importDefault(require("./routes/api"));
const mongo_1 = __importDefault(require("./config/mongo"));

require("./config/redis");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;

(0, mongo_1.default)();
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
app.use(express_1.default.json());

app.use('/api', api_1.default);
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}
exports.default = app;

