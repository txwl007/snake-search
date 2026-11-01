/**
 * 蛇伤识别辅助系统 · 全局配置
 * T3 接入真实模型时替换 apiUrl / apiKey 即可
 */
const CONFIG = {
    // ModelArts 在线服务（本轮不调用，T3 时填入）
    apiUrl: '',
    apiKey: '',

    // 赛伦100 小程序链接（T6 使用）
    sailun100Link: '#小程序://赛伦100蛇伤防治/1Sl8QlbZJGjIero',

    // 本轮假识别结果（T3 后替换为真实调用）
    mockResult: [
        { class: '银环蛇',   confidence: 0.87 },
        { class: '金环蛇',   confidence: 0.06 },
        { class: '舟山眼镜蛇', confidence: 0.03 }
    ]
};