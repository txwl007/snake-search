/* =========================================================
 * 蛇小卫 · 附近血清医院导航（集成页逻辑）
 * 数据：../data/hospitals.json（1472 家医院，GCJ-02 坐标）
 * 逻辑同「导航功能/app.js」：定位精度、WGS→GCJ、200m 容差排序、error.code 降级、高德 URI 导航
 * ========================================================= */
(function () {
    "use strict";

    var DATA_URL = "../data/hospitals.json";
    var PAGE_SIZE = 20;

    // 距离同档容差：200m。同档内按“血清品种齐全度 > 有电话优先”排序
    var DIST_TOLERANCE_KM = 0.2;
    // 定位精度阈值（米）
    var ACCURACY_WARN = 500;      // 超过则提示“精度较低”
    var ACCURACY_FALLBACK = 1000; // 超过则强制暴露手动选择入口

    var state = {
        hospitals: [],
        filtered: [],
        origin: null,          // { lng, lat } 已统一为 GCJ-02
        originLabel: "",
        accuracy: null,        // 定位精度半径（米）
        tab: "serum",
        keyword: "",
        province: "",
        shown: PAGE_SIZE
    };

    // 识别联动：从 URL ?serum=抗银环蛇毒血清,抗眼镜蛇毒血清 读取要筛选的血清品种
    var SERUM_FILTER = readSerumFilter();
    function readSerumFilter() {
        var q = location.search || "";
        var m = /[?&]serum=([^&]+)/.exec(q);
        if (!m) { return []; }
        try {
            return decodeURIComponent(m[1]).split(",")
                .map(function (s) { return s.trim(); })
                .filter(Boolean);
        } catch (e) { return []; }
    }

    var el = {
        locateBtn: document.getElementById("locateBtn"),
        locateBtnText: document.getElementById("locateBtnText"),
        locateStatus: document.getElementById("locateStatus"),
        locateAccuracy: document.getElementById("locateAccuracy"),
        manualPanel: document.getElementById("manualPanel"),
        manualTip: document.getElementById("manualTip"),
        selProvince: document.getElementById("selProvince"),
        selCity: document.getElementById("selCity"),
        selCounty: document.getElementById("selCounty"),
        manualBtn: document.getElementById("manualBtn"),
        searchInput: document.getElementById("searchInput"),
        filterProvince: document.getElementById("filterProvince"),
        tabs: document.querySelectorAll(".tab"),
        countSerum: document.getElementById("countSerum"),
        countAll: document.getElementById("countAll"),
        resultList: document.getElementById("resultList"),
        emptyState: document.getElementById("emptyState"),
        moreWrap: document.getElementById("moreWrap"),
        moreBtn: document.getElementById("moreBtn"),
        serumBanner: document.getElementById("serumBanner"),
        serumBannerText: document.getElementById("serumBannerText"),
        serumClearBtn: document.getElementById("serumClearBtn")
    };

    /* ---------------- 坐标转换：WGS-84 -> GCJ-02 ---------------- */
    // 只做正向转换（与高德/数据源一致）；不做逆向近似。
    var PI = Math.PI;
    var A = 6378245.0;
    var EE = 0.00669342162296594323;

    function outOfChina(lng, lat) {
        return lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271;
    }
    function transformLat(x, y) {
        var ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
        ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0;
        ret += (20.0 * Math.sin(y * PI) + 40.0 * Math.sin(y / 3.0 * PI)) * 2.0 / 3.0;
        ret += (160.0 * Math.sin(y / 12.0 * PI) + 320 * Math.sin(y * PI / 30.0)) * 2.0 / 3.0;
        return ret;
    }
    function transformLng(x, y) {
        var ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
        ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0;
        ret += (20.0 * Math.sin(x * PI) + 40.0 * Math.sin(x / 3.0 * PI)) * 2.0 / 3.0;
        ret += (150.0 * Math.sin(x / 12.0 * PI) + 300.0 * Math.sin(x / 30.0 * PI)) * 2.0 / 3.0;
        return ret;
    }
    function wgs84ToGcj02(lng, lat) {
        if (outOfChina(lng, lat)) {
            return { lng: lng, lat: lat };
        }
        var dLat = transformLat(lng - 105.0, lat - 35.0);
        var dLng = transformLng(lng - 105.0, lat - 35.0);
        var radLat = lat / 180.0 * PI;
        var magic = Math.sin(radLat);
        magic = 1 - EE * magic * magic;
        var sqrtMagic = Math.sqrt(magic);
        dLat = (dLat * 180.0) / ((A * (1 - EE)) / (magic * sqrtMagic) * PI);
        dLng = (dLng * 180.0) / (A / sqrtMagic * Math.cos(radLat) * PI);
        return { lng: lng + dLng, lat: lat + dLat };
    }

    /* ---------------- haversine 直线距离（km） ---------------- */
    function haversine(lng1, lat1, lng2, lat2) {
        var R = 6371.0;
        var toRad = PI / 180;
        var dLat = (lat2 - lat1) * toRad;
        var dLng = (lng2 - lng1) * toRad;
        var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) *
                Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return 2 * R * Math.asin(Math.sqrt(a));
    }

    // 统一文案：保留 1 位小数，不到米；并强调“直线距离”
    function formatKm(km) {
        return "直线距离约 " + km.toFixed(1) + " km";
    }

    /* ---------------- 筛选、排序与渲染 ---------------- */
    function applyFilters() {
        var kw = state.keyword.trim().toLowerCase();
        var prov = state.province;

        state.filtered = state.hospitals.filter(function (h) {
            if (state.tab === "serum" && h.hasSerum !== true) {
                return false;
            }
            if (state.tab === "serum" && SERUM_FILTER.length) {
                var hs = h.serum || [];
                var hit = false;
                for (var i = 0; i < SERUM_FILTER.length; i++) {
                    if (hs.indexOf(SERUM_FILTER[i]) !== -1) { hit = true; break; }
                }
                if (!hit) { return false; }
            }
            if (prov && h.province !== prov) {
                return false;
            }
            if (kw) {
                var hay = (h.name + " " + h.city + " " + h.county + " " + h.province).toLowerCase();
                if (hay.indexOf(kw) === -1) {
                    return false;
                }
            }
            return true;
        });

        if (state.origin) {
            var o = state.origin;
            state.filtered.forEach(function (h) {
                h.__dist = (h.lng == null || h.lat == null)
                    ? Infinity
                    : haversine(o.lng, o.lat, h.lng, h.lat);
            });
            state.filtered.sort(compareHospital);
        }

        state.shown = PAGE_SIZE;
        render();
    }

    // 排序：距离升序；相差 <200m 视为同档 → 血清品种多者优先 → 有电话者优先
    function compareHospital(a, b) {
        var d = a.__dist - b.__dist;
        if (isFinite(d) && Math.abs(d) < DIST_TOLERANCE_KM) {
            var sa = (a.serum || []).length;
            var sb = (b.serum || []).length;
            if (sa !== sb) { return sb - sa; }
            var pa = (a.phones && a.phones.length) ? 1 : 0;
            var pb = (b.phones && b.phones.length) ? 1 : 0;
            if (pa !== pb) { return pb - pa; }
        }
        return d;
    }

    function cardHtml(h) {
        var name = escapeHtml(h.name);

        var badge = "";
        if (h.hasSerum !== true && h.noStock === true) {
            badge = '<span class="badge badge-nostock">暂无储备</span>';
        }

        var distHtml = "";
        if (h.__dist != null && isFinite(h.__dist)) {
            distHtml = '<div class="card-distance">' + formatKm(h.__dist) + "</div>";
        }

        var addrParts = [];
        if (h.county) { addrParts.push(h.county); }
        if (h.address) { addrParts.push(h.address); }
        var addrText = addrParts.length ? addrParts.join(" · ") : (h.province + " · " + h.city);
        var addrHtml = '<div class="card-addr">' + escapeHtml(addrText) + "</div>";

        var tags;
        if (h.serum && h.serum.length) {
            tags = h.serum.map(function (s) {
                return '<span class="tag">' + escapeHtml(s) + "</span>";
            }).join("");
        } else {
            tags = '<span class="tag tag-empty">未标明储备血清</span>';
        }
        var tagsHtml = '<div class="serum-tags">' + tags + "</div>";

        var noteHtml = "";
        if (h.other && h.other.length) {
            noteHtml = '<div class="card-note">仅有蛇药/其他药品，无抗蛇毒血清</div>';
        }

        var phoneHtml;
        var extraNumbers = "";
        if (h.phones && h.phones.length) {
            phoneHtml = '<span class="phone">📞 ' + escapeHtml(h.phones[0]) + "</span>";
            if (h.phones.length > 1) {
                extraNumbers = '<div class="more-numbers">' +
                    h.phones.slice(1).map(function (p) {
                        return '<a href="tel:' + encodeURIComponent(p) + '">📞 ' + escapeHtml(p) + "</a>";
                    }).join("") + "</div>";
            }
        } else {
            phoneHtml = '<span class="phone phone-empty">暂无电话</span>';
        }

        var navHtml = "";
        if (h.lng != null && h.lat != null) {
            navHtml = '<a class="btn btn-primary btn-sm" href="https://uri.amap.com/marker?position=' +
                h.lng + "," + h.lat + "&name=" + encodeURIComponent(name) +
                "&src=" + encodeURIComponent("蛇小卫") +
                '" target="_blank" rel="noopener">🧭 导航</a>';
        }

        var dialHtml = (h.phones && h.phones.length)
            ? '<a class="btn btn-secondary btn-sm" href="tel:' + encodeURIComponent(h.phones[0]) + '">☎️ 拨号</a>'
            : "";

        return '<article class="card">' +
            '<div class="card-head"><div class="card-name">' + name + "</div>" + badge + "</div>" +
            distHtml + addrHtml + tagsHtml + noteHtml +
            '<div class="card-foot">' + phoneHtml + navHtml + dialHtml + extraNumbers + "</div>" +
            '<div class="updated">更新于 ' + escapeHtml(h.updated || "未知") + " · " +
            escapeHtml(h.province) + " " + escapeHtml(h.city) + "</div>" +
            "</article>";
    }

    function render() {
        var total = state.filtered.length;
        var list = state.filtered.slice(0, state.shown);
        el.resultList.innerHTML = list.map(cardHtml).join("");

        el.countSerum.textContent = state.tab === "serum" ? total : el.countSerum.textContent;
        el.countAll.textContent   = state.tab === "all"  ? total : el.countAll.textContent;

        el.emptyState.hidden = total !== 0;
        el.moreWrap.hidden   = total <= state.shown;
        updateBanner();
    }

    function escapeHtml(s) {
        return String(s == null ? "" : s)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function setStatus(text, isError) {
        el.locateStatus.textContent = text;
        el.locateStatus.style.color = isError ? "var(--danger)" : "var(--text-2)";
    }

    // 联动提示条：仅“有血清”Tab 且带筛选时显示
    function updateBanner() {
        if (SERUM_FILTER.length && state.tab === "serum") {
            el.serumBanner.hidden = false;
            el.serumBannerText.textContent = "仅显示储备「" + SERUM_FILTER.join("、") + "」的医院";
        } else {
            el.serumBanner.hidden = true;
        }
    }

    // 展示定位精度；>500m 提示“精度较低”
    function setAccuracy(acc) {
        state.accuracy = acc;
        if (acc == null) {
            el.locateAccuracy.hidden = true;
            return;
        }
        var txt = "定位精度 ±" + Math.round(acc) + " m";
        if (acc >= ACCURACY_WARN) {
            txt += " · 定位精度较低，结果可能不准";
        }
        el.locateAccuracy.textContent = txt;
        el.locateAccuracy.hidden = false;
        el.locateAccuracy.classList.toggle("warn", acc >= ACCURACY_WARN);
    }

    function showManual(tip) {
        el.manualTip.textContent = tip || "请手动选择地区（将按该地区中心排序）";
        el.manualPanel.hidden = false;
    }

    /* ---------------- 定位 ---------------- */
    function locate() {
        if (!navigator.geolocation) {
            setStatus("当前浏览器不支持定位，请手动选择地区", true);
            setAccuracy(null);
            showManual("当前浏览器不支持定位，请手动选择地区");
            return;
        }
        el.locateBtn.disabled = true;
        el.locateBtnText.textContent = "定位中…";
        setStatus("正在获取位置…", false);

        navigator.geolocation.getCurrentPosition(
            onLocateSuccess,
            onLocateError,
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    }

    function onLocateSuccess(pos) {
        el.locateBtn.disabled = false;
        el.locateBtnText.textContent = "重新定位";

        var gcj = wgs84ToGcj02(pos.coords.longitude, pos.coords.latitude);
        state.origin = gcj;
        state.originLabel = "当前位置";

        var acc = pos.coords.accuracy;
        setAccuracy(acc);

        if (acc != null && acc > ACCURACY_FALLBACK) {
            // 精度太差：必须给可见提示 + 手动入口
            setStatus("定位精度过低（>" + ACCURACY_FALLBACK + "m），请手动选择位置", true);
            showManual("定位精度过低（±" + Math.round(acc) + " m），建议手动选择位置后重新排序");
        } else {
            setStatus("定位成功，已按直线距离排序", false);
            el.manualPanel.hidden = true;
        }
        applyFilters();
    }

    function onLocateError(err) {
        el.locateBtn.disabled = false;
        el.locateBtnText.textContent = "定位我的位置";
        setAccuracy(null);

        var msg;
        if (err.code === 1 /* PERMISSION_DENIED */) {
            msg = "定位权限被拒绝，请手动选择地区";
        } else if (err.code === 2 /* POSITION_UNAVAILABLE */) {
            msg = "无法获取位置（无 GPS 或网络不可用），请手动选择地区";
        } else if (err.code === 3 /* TIMEOUT */) {
            msg = "定位超时，请重试或手动选择地区";
        } else {
            msg = "定位失败，请手动选择地区";
        }
        setStatus(msg, true);
        showManual(msg);
    }

    /* ---------------- 手动选择地区（省/市/区县） ---------------- */
    function uniqueSorted(values) {
        return values
            .filter(function (v, i, arr) { return v && arr.indexOf(v) === i; })
            .sort();
    }

    function initRegionSelects() {
        uniqueSorted(state.hospitals.map(function (d) { return d.province; }))
            .forEach(function (p) {
                var o1 = document.createElement("option");
                o1.value = p; o1.textContent = p;
                el.selProvince.appendChild(o1);

                var o2 = document.createElement("option");
                o2.value = p; o2.textContent = p;
                el.filterProvince.appendChild(o2);
            });
    }

    function resetSelect(sel, placeholder) {
        sel.innerHTML = '<option value="">' + placeholder + "</option>";
        sel.value = "";
    }

    function fillCities(province) {
        resetSelect(el.selCity, "选择城市");
        resetSelect(el.selCounty, "选择区县");
        if (!province) {
            el.selCity.disabled = true;
            el.selCounty.disabled = true;
            return;
        }
        uniqueSorted(
            state.hospitals
                .filter(function (d) { return d.province === province; })
                .map(function (d) { return d.city; })
        ).forEach(function (c) {
            var o = document.createElement("option");
            o.value = c; o.textContent = c;
            el.selCity.appendChild(o);
        });
        el.selCity.disabled = false;
    }

    function fillCounties(province, city) {
        resetSelect(el.selCounty, "选择区县");
        if (!city) {
            el.selCounty.disabled = true;
            return;
        }
        uniqueSorted(
            state.hospitals
                .filter(function (d) { return d.province === province && d.city === city; })
                .map(function (d) { return d.county; })
        ).forEach(function (c) {
            var o = document.createElement("option");
            o.value = c; o.textContent = c;
            el.selCounty.appendChild(o);
        });
        el.selCounty.disabled = false;
    }

    function regionCenter(province, city, county) {
        var rows = state.hospitals.filter(function (d) {
            if (d.province !== province) { return false; }
            if (city && d.city !== city) { return false; }
            if (county && d.county !== county) { return false; }
            return d.lng != null && d.lat != null;
        });
        if (!rows.length) { return null; }
        var sumLng = 0, sumLat = 0;
        rows.forEach(function (d) { sumLng += d.lng; sumLat += d.lat; });
        return { lng: sumLng / rows.length, lat: sumLat / rows.length };
    }

    function setupRegionEvents() {
        el.selProvince.addEventListener("change", function () {
            fillCities(el.selProvince.value);
        });
        el.selCity.addEventListener("change", function () {
            fillCounties(el.selProvince.value, el.selCity.value);
        });
        el.manualBtn.addEventListener("click", function () {
            var prov = el.selProvince.value;
            var city = el.selCity.value;
            var county = el.selCounty.value;
            if (!prov) {
                setStatus("请先选择省份", true);
                return;
            }
            var center = regionCenter(prov, city, county);
            if (!center) {
                setStatus("该地区暂无坐标数据，请更换地区", true);
                return;
            }
            state.origin = center;
            state.originLabel = [prov, city, county].filter(Boolean).join(" · ");
            state.province = prov;
            el.filterProvince.value = prov;
            setStatus("已按「" + state.originLabel + "」中心位置排序", false);
            el.manualPanel.hidden = true;
            applyFilters();
        });
    }

    /* ---------------- 加载数据 ---------------- */
    function loadData() {
        setStatus("正在加载医院数据…", false);
        return fetch(DATA_URL)
            .then(function (res) {
                if (!res.ok) { throw new Error("HTTP " + res.status); }
                return res.json();
            })
            .then(function (payload) {
                state.hospitals = Array.isArray(payload)
                    ? payload
                    : (payload.hospitals || []);
                initRegionSelects();
                setupRegionEvents();
                applyFilters();
                setStatus("数据已加载，共 " + state.hospitals.length + " 家医院", false);
            })
            .catch(function (err) {
                setStatus("医院数据加载失败：" + err.message + "，可手动选择地区重试", true);
                showManual("医院数据加载失败，请检查网络或稍后重试；也可手动选择地区");
            });
    }

    function setupUiEvents() {
        el.locateBtn.addEventListener("click", locate);
        el.searchInput.addEventListener("input", function () {
            state.keyword = el.searchInput.value;
            applyFilters();
        });
        el.filterProvince.addEventListener("change", function () {
            state.province = el.filterProvince.value;
            applyFilters();
        });
        el.tabs.forEach(function (btn) {
            btn.addEventListener("click", function () {
                state.tab = btn.dataset.tab;
                el.tabs.forEach(function (b) {
                    b.classList.toggle("active", b === btn);
                });
                applyFilters();
            });
        });
        el.moreBtn.addEventListener("click", function () {
            state.shown += PAGE_SIZE;
            render();
        });
        el.serumClearBtn.addEventListener("click", function () {
            SERUM_FILTER = [];
            if (history.replaceState) { history.replaceState(null, "", location.pathname); }
            applyFilters();
        });
    }

    setupUiEvents();
    loadData();
})();