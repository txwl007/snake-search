/* ========== 选项数据（严格按文档 2.5 节） ========== */
const PROVINCES = [
    '北京','天津','上海','重庆','河北','山西','辽宁','吉林',
    '黑龙江','江苏','浙江','安徽','福建','江西','山东','河南',
    '湖北','湖南','广东','海南','四川','贵州','云南','陕西',
    '甘肃','青海','内蒙古','广西','西藏','宁夏','新疆'
];
const PLACE_OPTIONS = ['田里','山上','城市','水边','其他'];
const BODY_OPTIONS  = ['手','前臂','上臂','足','小腿','大腿','躯干','头颈','其他'];
const TREATMENT_OPTIONS = [
    '未做特殊处理','清水冲洗伤口','消毒液消毒伤口','白酒涂抹伤口',
    '结扎患处近心端','挤压伤口','经口吸伤口','火罐或注射器吸伤口',
    '切开放血','涂抹草药、药酒','烧灼伤口','拨打120求救',
    '自行前往医院或诊所','自行居家处理','其他'
];
const SYMPTOM_OPTIONS = [
    '头昏眼花','牙龈出血','尿血、便血','恶心、呕吐',
    '复视、眼睑下垂','腹泻','发热恶寒','呼吸困难',
    '胸闷心悸','肢体肿胀、疼痛','其他（请注明）'
];

/* ========== 运行时状态 ========== */
let formData = { place: '', body: '' };
let SERUM_MAP = null;

/* ========== 初始化 ========== */
function init() {
    initProvinces();
    initCheckboxGrid('treatment-grid', TREATMENT_OPTIONS, 'treatment');
    initCheckboxGrid('symptom-grid',   SYMPTOM_OPTIONS,   'symptom');
    document.getElementById('wound-photo').addEventListener('change', handleWoundPhoto);
    restoreForm();
    loadSerumMap();
}

/* ========== 刷新后从 localStorage 回填表单 ========== */
function restoreForm() {
    const raw = localStorage.getItem('snakeSurveyData');
    if (!raw) return;
    let data;
    try { data = JSON.parse(raw); } catch (e) { return; }
    if (!data) return;

    if (data.biteTime) {
        document.getElementById('bite-time').value = data.biteTime;
    }
    if (data.place) {
        formData.place = data.place;
        const el = document.getElementById('place-value');
        el.textContent = data.place;
        el.classList.add('selected');
    }
    if (data.province) {
        document.getElementById('province').value = data.province;
    }
    if (data.body) {
        formData.body = data.body;
        const el = document.getElementById('body-value');
        el.textContent = data.body;
        el.classList.add('selected');
    }
    if (data.treatment && data.treatment.length) {
        data.treatment.forEach(function(val) {
            const cb = document.querySelector('input[name="treatment"][value="' + val + '"]');
            if (cb) cb.checked = true;
        });
    }
    if (data.symptom && data.symptom.length) {
        data.symptom.forEach(function(val) {
            const cb = document.querySelector('input[name="symptom"][value="' + val + '"]');
            if (cb) cb.checked = true;
        });
        if (data.symptom.indexOf('其他（请注明）') !== -1) {
            document.getElementById('symptom-other').style.display = 'block';
            if (data.symptomOther) {
                document.getElementById('symptom-other').value = data.symptomOther;
            }
        }
    }
    if (data.history) {
        document.getElementById('history').value = data.history;
    }
}

function initProvinces() {
    const sel = document.getElementById('province');
    PROVINCES.forEach(p => {
        const o = document.createElement('option');
        o.value = p; o.textContent = p;
        sel.appendChild(o);
    });
}

function initCheckboxGrid(gridId, options, name) {
    const grid = document.getElementById(gridId);
    options.forEach((opt, i) => {
        const id = name + '-' + i;
        const item = document.createElement('div');
        item.className = 'checkbox-item';
        item.innerHTML =
            '<input type="checkbox" id="' + id + '" name="' + name + '" value="' + opt + '">' +
            '<label for="' + id + '">' + opt + '</label>';
        grid.appendChild(item);
    });
    if (name === 'symptom') {
        grid.querySelectorAll('input[type="checkbox"]').forEach(function(cb) {
            cb.addEventListener('change', function() {
                const otherCb = Array.from(grid.querySelectorAll('input'))
                    .find(function(c) { return c.value === '其他（请注明）'; });
                const otherInput = document.getElementById('symptom-other');
                otherInput.style.display = otherCb.checked ? 'block' : 'none';
                if (!otherCb.checked) otherInput.value = '';
            });
        });
    }
}

/* ========== 单选弹出面板 ========== */
function openSelectPanel(field) {
    const options = field === 'place' ? PLACE_OPTIONS : BODY_OPTIONS;
    const title   = field === 'place' ? '蛇伤场所'    : '咬伤部位';
    const current = formData[field];

    document.getElementById('select-panel-title').textContent = title;
    const box = document.getElementById('select-panel-options');
    box.innerHTML = '';
    options.forEach(function(opt) {
        const div = document.createElement('div');
        div.className = 'select-panel-option' + (opt === current ? ' selected' : '');
        div.textContent = opt;
        div.onclick = function() { selectOption(field, opt); };
        box.appendChild(div);
    });
    document.getElementById('select-panel').style.display = 'flex';
}

function selectOption(field, value) {
    formData[field] = value;
    const el = document.getElementById(field + '-value');
    el.textContent = value;
    el.classList.add('selected');
    closeSelectPanel();
    clearError('item-' + (field === 'place' ? 'place' : 'body'));
}

function closeSelectPanel(e) {
    if (e && e.target && e.target.id !== 'select-panel') return;
    document.getElementById('select-panel').style.display = 'none';
}

/* ========== 伤口照片本地预览（FileReader，不上传） ========== */
function handleWoundPhoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(ev) {
        document.getElementById('wound-preview-img').src = ev.target.result;
        document.getElementById('wound-preview').style.display = 'block';
    };
    reader.readAsDataURL(file);
}

function removeWoundPhoto() {
    document.getElementById('wound-photo').value = '';
    document.getElementById('wound-preview').style.display = 'none';
    document.getElementById('wound-preview-img').removeAttribute('src');
}

/* ========== 校验 ========== */
function showError(itemId, msg) {
    const item = document.getElementById(itemId);
    item.classList.add('has-error');
    let el = item.querySelector('.error-msg');
    if (!el) {
        el = document.createElement('div');
        el.className = 'error-msg';
        item.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
}

function clearError(itemId) {
    const item = document.getElementById(itemId);
    item.classList.remove('has-error');
    const el = item.querySelector('.error-msg');
    if (el) el.classList.remove('show');
}

function getCheckedValues(name) {
    return Array.from(
        document.querySelectorAll('input[name="' + name + '"]:checked')
    ).map(function(cb) { return cb.value; });
}

function validateForm() {
    let ok = true;

    const time = document.getElementById('bite-time').value;
    if (!time) { showError('item-bite-time', '请选择蛇伤时间'); ok = false; }
    else clearError('item-bite-time');

    if (!formData.place) { showError('item-place', '请选择蛇伤场所'); ok = false; }
    else clearError('item-place');

    const prov = document.getElementById('province').value;
    if (!prov) { showError('item-province', '请选择所在省份'); ok = false; }
    else clearError('item-province');

    if (!formData.body) { showError('item-body', '请选择咬伤部位'); ok = false; }
    else clearError('item-body');

    if (getCheckedValues('treatment').length === 0) {
        showError('item-treatment', '请至少选择一项'); ok = false;
    } else clearError('item-treatment');

    if (getCheckedValues('symptom').length === 0) {
        showError('item-symptom', '请至少选择一项'); ok = false;
    } else clearError('item-symptom');

    return ok;
}

/* ========== 提交 ========== */
function submitSurvey() {
    if (!validateForm()) {
        const first = document.querySelector('.has-error');
        if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
    }

    const data = {
        woundPhotoUploaded: !!document.getElementById('wound-preview-img').src,
        biteTime:      document.getElementById('bite-time').value,
        place:         formData.place,
        province:      document.getElementById('province').value,
        treatment:     getCheckedValues('treatment'),
        symptom:       getCheckedValues('symptom'),
        symptomOther:  document.getElementById('symptom-other').value || '',
        body:          formData.body,
        history:       document.getElementById('history').value || '',
        submitTime:    new Date().toISOString()
    };

    localStorage.setItem('snakeSurveyData', JSON.stringify(data));

    showSummary(data);
    showMockResult();
    renderSerumAdvice(CONFIG.mockResult[0].class, CONFIG.mockResult[0].confidence);

    document.getElementById('page-survey').classList.remove('active');
    document.getElementById('page-result').classList.add('active');
    window.scrollTo(0, 0);
}

/* ========== 摘要展示 ========== */
function showSummary(d) {
    const rows = [
        ['蛇伤时间', d.biteTime ? d.biteTime.replace('T', ' ') : ''],
        ['蛇伤场所', d.place],
        ['所在省份', d.province],
        ['院前处置', d.treatment.join('、')],
        ['症　　状', d.symptom.join('、') + (d.symptomOther ? '（' + d.symptomOther + '）' : '')],
        ['咬伤部位', d.body],
        ['过往病史', d.history || '无'],
        ['伤口照片', d.woundPhotoUploaded ? '已上传（仅本地预览）' : '未上传']
    ];
    document.getElementById('survey-summary').innerHTML = rows.map(function(r) {
        return '<div class="summary-row">' +
               '<span class="summary-label">' + r[0] + '</span>' +
               '<span class="summary-value">' + r[1] + '</span></div>';
    }).join('');
}

/* ========== 假识别结果展示 ========== */
function showMockResult() {
    const list = CONFIG.mockResult;
    document.getElementById('recognition-result').innerHTML = list.map(function(item, i) {
        return '<div class="result-item">' +
               '<div class="result-rank">' + (i + 1) + '</div>' +
               '<span class="result-class">' + item.class + '</span>' +
               '<span class="result-confidence">' + (item.confidence * 100).toFixed(1) + '%</span>' +
               '</div>';
    }).join('');
}

/* ========== 血清建议数据加载 ========== */
async function loadSerumMap() {
    try {
        const res = await fetch('../data/serum.json');
        if (!res.ok) throw new Error('HTTP ' + res.status);
        SERUM_MAP = await res.json();
    } catch (e) {
        SERUM_MAP = null;
        console.warn('serum.json 加载失败', e);
    }
}

/* ========== 血清建议渲染 ========== */
function renderSerumAdvice(className, confidence) {
    const box = document.getElementById('serum-advice');
    if (!box) return;

    if (confidence < 0.60) {
        box.innerHTML = '<div class="serum-warning">无法确定，请立即就医</div>';
        return;
    }

    if (!SERUM_MAP) {
        box.innerHTML = '<div class="serum-warning">血清信息加载失败，请遵医嘱</div>';
        return;
    }

    const info = SERUM_MAP[className];
    if (!info) {
        box.innerHTML = '<div class="serum-warning">暂无该品种的血清信息，请遵医嘱</div>';
        return;
    }

    box.innerHTML =
        '<div class="serum-row serum-row-species">' +
            '<span class="serum-species">' + className + '</span>' +
            '<span class="risk-tag risk-tag-' + info.riskLevel + '">' + info.riskLabel + '</span>' +
        '</div>' +
        '<div class="serum-row"><span class="serum-label">毒性</span><span class="serum-value">' + info.venom + '</span></div>' +
        '<div class="serum-row"><span class="serum-label">提示</span><span class="serum-value">' + info.riskNote + '</span></div>' +
        '<div class="serum-row"><span class="serum-label">建议血清</span><span class="serum-value">' + info.serum + '</span></div>';
}

/* ========== 返回修改 ========== */
function backToSurvey() {
    document.getElementById('page-result').classList.remove('active');
    document.getElementById('page-survey').classList.add('active');
    window.scrollTo(0, 0);
}

/* ========== 启动 ========== */
init();