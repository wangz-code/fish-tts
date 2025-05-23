const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const path = require("path");
const fs = require("fs").promises; // 使用 promise 版本的 fs API
const fsa = require("fs"); // 使用 promise 版本的 fs API
const glob = require("glob-promise"); // 用于模式匹配文件路径
const https = require("https"); // 引入 HTTPS 模块
const http = require("http"); // 引入 HTTP 模块
const morgan = require("morgan");
const app = express();
const router = express.Router();
const port = 2334;
const referenceDir = "/home/wz/program/fish-speech/references";
const spleeterDir = "/home/wz/program/spleeter/output/audio";

// 3. 新增接口：获取 reference 目录下的所有文件夹名称
const folders_cash = [];
router.get("/getreference_id", async (req, res) => {
    if (folders_cash.length) {
        res.json(folders_cash);
        return;
    }
    try {
        // 读取目录内容
        const entries = await fs.readdir(referenceDir, { withFileTypes: true });
        // 过滤出文件夹并提取名称
        const folders = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
        folders_cash.splice(0, folders_cash.length);
        folders_cash.push(...folders);
        res.json(folders);
    } catch (error) {
        console.error("读取文件夹失败:", error);
        res.status(500).json({ error: "服务器内部错误" });
    }
});

const texts_cash = [];
router.get("/getreference_texts", async (req, res) => {
    if (texts_cash.length) {
        console.log("使用缓存");
        res.json(texts_cash);
        return;
    }
    try {
        // 使用 glob 模式匹配所有子目录下的 text.txt 文件
        const textFiles = await glob(`${referenceDir}/*/text.txt`);
        // 并行读取所有文件内容
        const textPromises = textFiles.map(async (filePath) => {
            const content = await fs.readFile(filePath, "utf8");
            return content;
        });
        // 等待所有读取操作完成
        const texts = await Promise.all(textPromises);
        texts_cash.splice(0, texts_cash.length);
        texts_cash.push(...texts);
        res.json(texts);
    } catch (error) {
        console.error("读取文件失败:", error);
        res.status(500).json({ error: "服务器内部错误" });
    }
});

// 音频样本静态文件
router.use("/static", express.static(referenceDir));
// 人声伴奏分离文件
router.use("/spleeter", express.static(spleeterDir));
// fishtts server
router.use("/fish", createProxyMiddleware({ target: "http://127.0.0.1:2333", changeOrigin: true, pathRewrite: { "^/api/fish": "" } }));

app.use(express.static("./"));
app.use(express.static(spleeterDir));
app.use("/api", router);

const logInit = async function () {
    // 创建日志目录
    const logDirectory = path.join(__dirname, "logs");
    fsa.existsSync(logDirectory) || fsa.mkdirSync(logDirectory);
    // 按日期创建日志文件
    const accessLogStream = fsa.createWriteStream(path.join(logDirectory, `access_${new Date().toISOString().split("T")[0]}.log`), { flags: "a" });
    // 同时输出到控制台和文件
    app.use(morgan("combined", { stream: accessLogStream }));
    app.use(morgan("dev"));
};

// const httpRun = async function () {
//     logInit();
//     const httpServer = http.createServer(app);
//     httpServer.listen(port, () => {
//         console.log(`HTTP 服务器运行在端口 ${port}`);
//     });
// };

// // 启动应用
// httpRun();

const httpsRun = async function () {
    logInit();
    let credentials;
    try {
        const [key, cert] = await Promise.all([
            fs.readFile("/home/wz/ssl/wz.djgo.cc.key"), // 替换为你的证书
            fs.readFile("/home/wz/ssl/wz.djgo.cc.crt"), // 替换为你的证书
        ]);

        credentials = { key, cert };
    } catch (error) {
        console.error("加载证书失败:", error);
        process.exit(1);
    }
    const httpsServer = https.createServer(credentials, app);
    httpsServer.listen(port, () => {
        console.log(`HTTPS 服务器运行在端口 ${port}`);
    });
};
httpsRun();