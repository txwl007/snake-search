/* =========================================================
   蛇小助 SnakeGuard · 前端交互
   当前阶段：识别使用演示数据（USE_MOCK），接口接入点已预留。
   ========================================================= */
(function () {

'use strict';

/* ---------- 物种基础数据（与 classes.json 名称一致，顺序一致） ---------- */
const SPECIES = [
    {name:'短尾蝮',      img:'短尾蝮-1.jpg',      alias:'草上飞、土公蛇', desc:'体粗短，头略呈三角形，背部有两行褐色圆斑，多活动于平原田野、山麓地带的草丛与农田。', region:'我国东部、中部及长江流域广大地区', habit:'多在晨昏活动，栖于草丛、水沟与田埂'},
    {name:'中介蝮',      img:'中介蝮-1.jpg',      alias:'蛇、土球子',   desc:'中等体型，背部具模糊斑纹，头略呈三角形，适应山地与草原环境的蝮科毒蛇。', region:'我国北部及西北山地草原地区', habit:'喜凉湿环境，多在夜间活动'},
    {name:'原矛头蝮',    img:'原矛头蝮-1.jpg',    alias:'烙铁头、新蛇', desc:'头呈长三角形，背面黄褐带深色不规则斑块，是我国最常见的致伤毒蛇之一，咬伤率高。', region:'我国南方多省，分布广泛', habit:'夜行性，常栖于山地、林间及农田边'},
    {name:'尖吻蝮',      img:'尖吻蝮-1.jpg',      alias:'五步蛇、百花蛇', desc:'头窄长，吻端尖而翘，背部有显著方形或三角形斑，含五步蛇毒，血循毒强。', region:'我国长江以南各省区', habit:'栖于山地溪涧、林间石隙'},
    {name:'白唇竹叶青',  img:'白唇竹叶青-1.jpg',  alias:'焦尾蛇',       desc:'通体翠绿，尾部焦红，唇部白色，多在竹木丛生环境中活动的一种绿色毒蛇。', region:'我国南方竹林及山间地区', habit:'昼伏夜出，栖于竹丛、树枝上'},
    {name:'福建竹叶青',  img:'福建竹叶青-1.jpg',  alias:'青竹蛇',       desc:'身体绿色，具细小鳞脊，与竹叶青相近，生活于低海拔山林与溪流附近。', region:'福建及华南丘陵地带', habit:'树栖为主，多在枝头或灌丛中'},
    {name:'舟山眼镜蛇',  img:'舟山眼镜蛇-1.jpg',  alias:'眼镜蛇、饭铲头', desc:'受惊时颈部膨胀直立，眼镜状花纹明显，神经毒为主、混血循毒，攻击性较强。', region:'我国长江以南及东南沿海', habit:'白天活动，常出没于鼠洞、田地与村舍附近'},
    {name:'眼镜王蛇',    img:'眼镜王蛇-1.jpg',    alias:'过山峰、山万蛇', desc:'体型极大，能直立抬颈，分泌巨量神经毒，致死率极高，遇之应迅速远离。', region:'我国华南、西南山区', habit:'喜居于密林、溪边，捕食其他蛇类'},
    {name:'银环蛇',      img:'银环蛇-1.jpg',      alias:'白节蛇、寸白蛇', desc:'体背黑白相间环纹，神经毒强，咬伤后局部症状轻但可能迅速危及呼吸。', region:'我国南方各省广泛分布', habit:'夜行性，常在水边、田埂活动'},
    {name:'金环蛇',      img:'金环蛇-1.jpg',      alias:'金甲带、金银蛇', desc:'体背黄黑相间的环状纹，具神经毒，栖于平原、丘陵的树林与湿地。', region:'我国华南及西南地区', habit:'多在夜间活动，栖于林缘、田边'},
    {name:'中华珊瑚蛇',  img:'中华珊瑚蛇-1.jpg',  alias:'珊瑚蛇、棍仔蛇', desc:'体表具红黑黄相间的警戒色彩，属前沟牙毒蛇，少见但毒性强。', region:'我国南方山地及季雨林区域', habit:'多栖于湿润林内的落叶与石下'},
    {name:'虎斑颈槽蛇',  img:'虎斑颈槽蛇-1.jpg',  alias:'虎斑蛇、池蛇',   desc:'体表有虎斑样斑纹，毒性较弱，多生活于水田、池塘边，属后沟牙微毒蛇。', region:'我国各地水域周边多见', habit:'喜水，栖于稻田、沼泽与溪边'},
    {name:'红脖颈槽蛇',  img:'红脖颈槽蛇-1.jpg',  alias:'红脖游蛇、野鸡项', desc:'颈背具红褐色斑块，属于微毒蛇，一般不构成威胁，但咬后仍建议观察。', region:'我国南方多省', habit:'白昼活动，栖于水田、灌丛'}
];

/* 蛇种 → 标准抗蛇毒血清品种（用于“识别 → 找附近医院”联动；与 data/serum.json 的建议逐条一致） */
const SERUM_TYPES = {
    '中介蝮':     ['抗蝮蛇毒血清'],
    '原矛头蝮':   ['抗蝮蛇毒血清'],
    '短尾蝮':     ['抗蝮蛇毒血清'],
    '白唇竹叶青': ['抗蝮蛇毒血清'],
    '福建竹叶青': ['抗蝮蛇毒血清'],
    '尖吻蝮':     ['抗五步蛇毒血清'],
    '舟山眼镜蛇': ['抗眼镜蛇毒血清'],
    '眼镜王蛇':   ['抗眼镜蛇毒血清', '抗银环蛇毒血清'],
    '银环蛇':     ['抗银环蛇毒血清'],
    '金环蛇':     ['抗银环蛇毒血清'],
    '中华珊瑚蛇': [],
    '虎斑颈槽蛇': [],
    '红脖颈槽蛇': []
};

let SERUM_MAP = {};      // 毒性/风险/血清（来自 serum.json）

/* ---------- 元素引用 ---------- */
const $ = (id) => document.getElementById(id);
const nav = $('nav');
const burger = $('nav-burger');
const navLinks = $('nav-links');

/* ---------- 导航：滚动阴影 + 移动端菜单 ---------- */
addEventListener('scroll', () => nav.classList.toggle('scrolled', scrollY > 10), {passive:true});
burger.addEventListener('click', () => navLinks.classList.toggle('open'));
navLinks.addEventListener('click', (e) => { if (e.target.tagName === 'A') navLinks.classList.remove('open'); });

/* ---------- 锚点平滑滚动（兼容 data-scroll） ---------- */
document.querySelectorAll('a[data-scroll]').forEach(a => {
    a.addEventListener('click', (e) => {
        const id = a.getAttribute('href');
        if (!id.startsWith('#')) return;
        e.preventDefault();
        const t = document.querySelector(id);
        if (t) { t.scrollIntoView({behavior:'smooth'}); history.replaceState(null,'',id); }
    });
});

/* ---------- 物种库渲染 ---------- */
const grid = $('species-grid');
function renderSpecies(filter){
    grid.innerHTML = '';
    SPECIES.filter(s => filter === 'all' || !filter || SERUM_MAP[s.name]?.venom === filter).forEach(s => {
        const info = SERUM_MAP[s.name] || {};
        const vd = info.venom === '剧毒' ? 'tag tag-v' : 'tag tag-ok';
        const vTxt = info.venom || '—';
        const c = document.createElement('div');
        c.className = 'species-card';
        c.innerHTML =
            '<img src="img/species/' + s.img + '" alt="' + s.name + '" loading="lazy">' +
            '<div class="species-card-body">' +
                '<div class="species-card-row"><h3>' + s.name + '</h3>' +
                (vTxt !== '—' ? '<span class="' + vd + '">' + vTxt + '</span>' : '') +
                '</div>' +
                '<p>' + (s.alias) + '</p>' +
            '</div>';
        c.addEventListener('click', () => openDetail(s));
        grid.appendChild(c);
    });
}
$('species-filter').addEventListener('click', (e) => {
    const b = e.target.closest('.chip'); if (!b) return;
    document.querySelectorAll('.chip').forEach(x => x.classList.toggle('active', x === b));
    renderSpecies(b.dataset.filter);
});

/* ---------- 物种详情弹窗 ---------- */
const mask = document.createElement('div');
mask.className = 'modal-mask'; mask.id = 'detail-mask';
mask.addEventListener('click', (e) => { if (e.target === mask) closeDetail(); });
document.body.appendChild(mask);

function openDetail(s){
    const info = SERUM_MAP[s.name] || {};
    const riskTag = info.riskLevel ? {
        1:['tag-r1','极高风险'],2:['tag-r2','高风险'],3:['tag-r3','低风险']
    }[info.riskLevel] : ['tag-r2','—'];
    mask.innerHTML =
        '<div class="modal">' +
            '<div class="modal-head"><img src="img/species/' + s.img + '" alt="' + s.name + '">' +
            '<button class="modal-close" onclick="window.__closeDetail()">✕</button></div>' +
            '<div class="modal-body">' +
                '<div class="modal-title-row"><h2>' + s.name + '</h2>' +
                '<span class="tag tag-v">' + (info.venom || '未知') + '</span>' +
                '<span class="tag ' + riskTag[0] + '">' + riskTag[1] + '</span></div>' +
                '<p style="color:var(--muted);margin-top:6px;font-size:14px">别名：' + s.alias + '</p>' +
                '<div class="modal-meta">' +
                    '<div class="meta-item"><span>毒性等级</span><p>' + (info.venom || '—') + '</p></div>' +
                    '<div class="meta-item"><span>建议血清</span><p>' + (info.serum || '遵医嘱') + '</p></div>' +
                    '<div class="meta-item" style="grid-column:1/-1"><span>主要分布</span><p>' + s.region + '</p></div>' +
                    '<div class="meta-item" style="grid-column:1/-1"><span>习性</span><p>' + s.habit + '</p></div>' +
                '</div>' +
                '<p class="modal-desc">' + s.desc + '</p>' +
                '<p style="font-size:12px;color:var(--muted);margin-top:16px">' + (info.riskNote || '') + '</p>' +
            '</div>' +
        '</div>';
    mask.style.display = 'flex';
}
window.__closeDetail = closeDetail;
function closeDetail(){ mask.style.display = 'none'; }

/* ---------- FAQ 折叠 ---------- */
document.querySelectorAll('#faq .faq-item').forEach(item => {
    const q = item.querySelector('.faq-q'), a = item.querySelector('.faq-a');
    q.addEventListener('click', () => {
        const open = item.classList.toggle('open');
        a.style.maxHeight = open ? a.scrollHeight + 'px' : '0';
    });
});

/* ---------- 在线识别（演示数据） ---------- */
const dropzone = $('dropzone'), fileInput = $('file-input'), dzPreview = $('dz-preview'),
      dzRemove = $('dz-remove'), dzEmpty = $('dz-empty'), btnRec = $('btn-recognize');

let selectedFile = null;
let selectedDataUrl = '';

['dragenter','dragover'].forEach(ev => dropzone.addEventListener(ev, e => { e.preventDefault(); dropzone.classList.add('dragover'); }));
['dragleave','drop'].forEach(ev => dropzone.addEventListener(ev, e => e.preventDefault()));
dropzone.addEventListener('drop', e => { dropzone.classList.remove('dragover'); if (e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]); });
fileInput.addEventListener('change', e => { if (e.target.files[0]) setFile(e.target.files[0]); });
dzRemove.addEventListener('click', clearFile);

function setFile(f){
    selectedFile = f;
    const rd = new FileReader();
    rd.onload = ev => {
        selectedDataUrl = ev.target.result;
        dzPreview.src = ev.target.result;
    };
    rd.readAsDataURL(f);
    dzPreview.style.display = 'block'; dzEmpty.style.display = 'none'; dzRemove.style.display = 'block';
    btnRec.disabled = false;
    resetResult();
}
function clearFile(){
    selectedFile = null; selectedDataUrl = '';
    fileInput.value = ''; dzPreview.removeAttribute('src');
    dzPreview.style.display = 'none'; dzEmpty.style.display = ''; dzRemove.style.display = 'none';
    btnRec.disabled = true; resetResult();
}

function resetResult(){ $('result-empty').style.display=''; $('result-body').style.display='none'; }

/* 演示预测：模拟推理延迟，返回 Top-3（置信度降序） */
function mockPredict(imgName){
    const confs = {
        眼镜王蛇:.987, 舟山眼镜蛇:.966, 银环蛇:.941, 金环蛇:.918, 尖吻蝮:.902,
        原矛头蝮:.884, 白唇竹叶青:.871, 福建竹叶青:.859, 短尾蝮:.843, 中介蝮:.821,
        中华珊瑚蛇:.806, 虎斑颈槽蛇:.772, 红脖颈槽蛇:.755
    };
    const top = SPECIES.find(s => s.name === imgName) || SPECIES[0];
    let candidates = [{ class: top.name, confidence: confs[top.name] ?? .95 }];
    const rest = SPECIES.filter(s => s.name !== top.name).map(s => ({class:s.name, confidence: confs[s.name]*.04+.01}))
        .sort((a,b) => b.confidence - a.confidence).slice(0,2);
    return candidates.concat(rest);
}

btnRec.addEventListener('click', runRecognize);

async function runRecognize(){
    if (!selectedFile) return;
    btnRec.disabled = true; btnRec.textContent = '识别中…';
    resetResult();
    if (USE_MOCK) {
        setTimeout(() => {
            const list = mockPredict(SITE.demoSnakePath.split('/')[2].replace('-1.jpg',''));
            renderResult(list, '当前为演示数据，接入真实接口后自动切换。');
            done();
        }, 900);
    } else {
        await runRecognizeReal();
        done();
    }
}
function done(){ btnRec.disabled = false; btnRec.textContent = '上传并识别'; }

async function runRecognizeReal(){
    try {
        const res = await fetch('/api/recognize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: selectedDataUrl })
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || ('HTTP ' + res.status));

        const list = (json.predictions || []).map(p => ({
            class: p.class, confidence: Math.min(1, Math.max(0, Number(p.confidence) || 0))
        }));

        if (!list.length) {
            renderUndetermined('模型未能识别出有效蛇种，请更换更清晰的照片重试。');
            return;
        }
        renderResult(list, '已接入本地 ResNet18 模型（本地 CPU 推理）。');
    } catch (e) {
        console.warn('识别接口调用失败：', e);
        renderUndetermined('识别服务暂不可用（' + (e.message||'网络错误') + '），请确认已通过 proxy.py 启动服务后重试。');
    }
}

function renderUndetermined(msg){
    $('result-empty').style.display = 'none';
    const body = $('result-body'); body.style.display = 'block';
    body.innerHTML =
        '<div class="result-emergency" style="border-left-color:var(--danger);background:var(--danger-soft);color:#8a3a33">' +
        '🤔 <b>未能确定蛇种</b>：' + msg + '</div>' +
        '<p class="result-note">识别仅供参考，若被咬伤请立即就医。</p>';
}

function navLinkHtml(topName){
    const types = SERUM_TYPES[topName] || [];
    if (types.length) {
        const url = 'app/navigate.html?serum=' + encodeURIComponent(types.join(','));
        return '<a class="btn btn-primary" style="display:inline-flex;margin-top:14px" href="' + url + '">' +
               '🗺️ 查找附近有「' + types.join('、') + '」的医院</a>';
    }
    return '<a class="btn btn-ghost" style="display:inline-flex;margin-top:14px" href="app/navigate.html">' +
           '🗺️ 查看附近有血清的医院</a>';
}

function renderResult(list, note){
    const topName = list[0].class, topConf = list[0].confidence;
    const s = SPECIES.find(x => x.name === topName);
    const info = SERUM_MAP[topName] || {};
    const riskTag = info.riskLevel ? {
        1:['tag-r1','极高风险'],2:['tag-r2','高风险'],3:['tag-r3','低风险']
    }[info.riskLevel] : ['tag-r2','未分级'];
    const max = list[0].confidence;

    $('result-empty').style.display = 'none';
    const body = $('result-body'); body.style.display = 'block';

    body.innerHTML =
        '<div class="result-top">' +
            '<div class="result-thumb"><img src="img/species/' + (s ? s.img : SITE.demoSnakePath) + '" alt="' + topName + '"></div>' +
            '<div class="result-id">' +
                '<h3>' + topName + '</h3>' +
                '<div class="conf-line">置信度 ' + (topConf*100).toFixed(1) + '%</div>' +
                '<div class="badges">' +
                    '<span class="tag tag-v">' + (info.venom || '未知') + '</span>' +
                    '<span class="tag ' + riskTag[0] + '">' + riskTag[1] + '</span>' +
                '</div>' +
            '</div>' +
        '</div>' +
        '<div class="result-cands"><h4>Top-3 候选结果</h4>' +
        list.map((c,i) =>
            '<div class="cand' + (i===0?' cand-top':'') + '">' +
                '<span>' + c.class + '</span>' +
                '<div class="bar"><i style="width:' + (c.confidence/max*100).toFixed(0) + '%"></i></div>' +
                '<span class="pct">' + (c.confidence*100).toFixed(1) + '%</span>' +
            '</div>').join('') +
        '</div>' +
        (info.serum ?
        '<div class="result-advice"><h5>💉 用药与处置建议</h5><p><b>建议血清：</b>' + info.serum +
        '　<b>毒性：</b>' + (info.venom||'') + '　<b>风险：</b>' + (info.riskNote || '') + '</p></div>' : '') +
        navLinkHtml(topName) +
        '<div class="result-emergency">🚨 <b>立即就医</b>：识别结果仅供参考。若被咬伤，请立刻拨打 120 或前往就近医院急诊，切勿因等待结果延误救治。</div>' +
        '<p class="result-note">' + (note || (USE_MOCK ? '当前为演示数据，接入真实接口后自动切换。' : '已接入 ModelArts 在线服务。')) + '</p>';
}

/* ---------- 初始化 ---------- */
init();
async function init(){
    try {
        const res = await fetch('data/serum.json');
        if (res.ok) SERUM_MAP = await res.json();
    } catch(e) { /* 保持空映射 */ }
    renderSpecies('all');
    document.querySelectorAll('#faq .faq-item.open').forEach(item => {
        const a = item.querySelector('.faq-a'); a.style.maxHeight = a.scrollHeight + 'px';
    });
}

})();