#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""蛇小卫 · 本地识别服务（静态文件 + 本地 ResNet18 推理）

功能：
  1. 静态文件服务（web/ 目录下的 HTML/CSS/JS/图片）
  2. POST /api/recognize → 用本地训练的 ResNet18 权重推理，返回 Top-3

启动：  python proxy.py
访问：  http://localhost:8000

模型权重（只读，绝不修改）：
  默认读取 D:\\snake-model\\model\\snake_resnet18.pt
  可用环境变量 SNAKE_MODEL_PATH 覆盖（便于部署到其它机器）
推理设备：默认 CPU（可用 SNAKE_DEVICE=cuda 覆盖）
"""
import http.server
import socketserver
import json
import os
import sys
import io
import base64
import threading

import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image

PORT = 8000
WEB_DIR = os.path.dirname(os.path.abspath(__file__))

# ========== 模型配置 ==========
MODEL_PATH = os.environ.get("SNAKE_MODEL_PATH") or r"D:\snake-model\model\snake_resnet18.pt"
CLASSES_JSON = os.path.join(os.path.dirname(MODEL_PATH), "classes.json")

# 默认 CPU（部署机器无独显；可用环境变量启用 GPU）
DEVICE = torch.device(os.environ.get("SNAKE_DEVICE", "cpu"))

# 预处理：与训练时验证集完全一致（不可改）
VAL_TF = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
])

_model = None
_classes = None
_lock = threading.Lock()


def load_checkpoint(path):
    """兼容不同 torch 版本的 torch.load 参数差异（torch 2.6 起 weights_only 默认值变了）。"""
    try:
        return torch.load(path, map_location="cpu", weights_only=False)
    except TypeError:
        return torch.load(path, map_location="cpu")


def load_model():
    global _model, _classes
    ckpt = load_checkpoint(MODEL_PATH)
    if isinstance(ckpt, dict) and "state_dict" in ckpt:
        state_dict = ckpt["state_dict"]
        classes = ckpt.get("classes")
    else:
        state_dict = ckpt
        classes = None

    # 类别优先 classes.json（同目录），回退 ckpt["classes"]；顺序保持不变
    if os.path.exists(CLASSES_JSON):
        with open(CLASSES_JSON, "r", encoding="utf-8") as f:
            classes = json.load(f)
    if not classes:
        raise RuntimeError("无法确定类别名单：classes.json 与权重中的 classes 均不可用")
    classes = [str(c) for c in classes]

    model = models.resnet18(weights=None)
    model.fc = nn.Linear(model.fc.in_features, len(classes))
    model.load_state_dict(state_dict)
    model = model.to(DEVICE)
    model.eval()

    _model = model
    _classes = classes
    print("[OK] 模型已加载: %s | 类别数=%d | device=%s" % (MODEL_PATH, len(classes), DEVICE))
    print("[OK] 类别顺序: %s" % ("、".join(classes)))


def predict(image_bytes):
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    x = VAL_TF(img).unsqueeze(0).to(DEVICE)
    with _lock, torch.no_grad():
        probs = torch.softmax(_model(x), dim=1)[0]
    top = torch.topk(probs, min(3, len(_classes)))
    return [{"class": _classes[int(i)], "confidence": round(float(v), 4)}
            for v, i in zip(top.values, top.indices)]


def parse_data_url(data_url):
    """把 data:image/xxx;base64,... 或纯 base64 解析成字节。"""
    if "," in data_url:
        data_url = data_url.split(",", 1)[1]
    return base64.b64decode(data_url)


class Handler(http.server.SimpleHTTPRequestHandler):
    """静态文件 + 识别接口"""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=WEB_DIR, **kwargs)

    def do_POST(self):
        if self.path == "/api/recognize":
            self._handle_recognize()
        else:
            self.send_error(404, "Not Found")

    def _handle_recognize(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(length)
            req = json.loads(body)
            image_data_url = req.get("image", "")
            if not image_data_url:
                self._send_json(400, {"error": "缺少 image 字段"})
                return
            img_bytes = parse_data_url(image_data_url)
            preds = predict(img_bytes)
            self._send_json(200, {"predictions": preds})
        except Exception as e:
            print("[X] 推理异常:", e)
            self._send_json(500, {"error": str(e)})

    def _send_json(self, code, obj):
        data = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, fmt, *args):
        if self.path.startswith("/api/"):
            sys.stderr.write("[%s] %s\n" % (self.log_date_time_string(), fmt % args))


def main():
    print("=" * 52)
    print("  蛇小卫 · 本地识别服务（ResNet18 本地推理）")
    print("=" * 52)
    print("  访问地址 : http://localhost:%d" % PORT)
    print("  静态目录 : %s" % WEB_DIR)
    print("  推理设备 : %s" % DEVICE)
    print("=" * 52)
    load_model()
    socketserver.TCPServer.allow_reuse_address = True
    httpd = http.server.ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n已停止")
        httpd.server_close()


if __name__ == "__main__":
    main()