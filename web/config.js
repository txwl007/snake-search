/* =========================================================
 * 蛇小助 SnakeGuard · 全局配置
 * ---------------------------------------------------------
 * 识别接口开关：
 *   USE_MOCK = true  → 使用内置演示数据（当前阶段，即可运行）
 *   USE_MOCK = false → 调用真实 ModelArts 在线服务（T3 填入 url / key）
 * ========================================================= */
const SITE = {
    name: '蛇小助',
    nameEn: 'SnakeGuard',
    slogan: 'AI 驱动的毒蛇识别与院前风险预判',
    surveyUrl: 'app/survey.html', // 急救问诊（独立功能页）
    demoSnakePath: 'img/species/眼镜王蛇-1.jpg'
};

/** 识别接口开关：
 *  USE_MOCK = true  → 使用内置演示数据
 *  USE_MOCK = false → 调用真实 ModelArts MaaS 在线服务（经本地 proxy.py 转发）
 *  注意：真实调用需通过 proxy.py 启动（python proxy.py），前端将图片 POST 到 /api/recognize */
const USE_MOCK = false;

/** 真实在线服务配置（参见 api_config.json，接入时填写） */
const API = {
    url: '',   // 例：http://120.46.74.129/v2/infer/c09b...
    key: ''    // 例：z7C-s7.....
};