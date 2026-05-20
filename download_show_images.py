"""
给小白看的使用说明

这个脚本的作用：
1. 读取浏览器导出的 JSON 文件
2. 找出里面记录的图片 URL 和本地保存路径
3. 把海报图、背景图等图片下载到你指定的位置

最常用的运行方式：
1. 下载单个作品
   py download_show_images.py "D:\谷歌下载内容\王国第一季-import.json"

2. 一次下载多个作品
   py download_show_images.py "D:\谷歌下载内容\王国第一季-import.json" "D:\谷歌下载内容\魔女2-import.json"

运行前你需要准备：
1. 电脑里已经装好 Python，并且可以直接使用 `py`
2. 已安装依赖：`requests`、`urllib3`
   如果还没装，可以运行：
   py -m pip install requests urllib3

脚本会从 JSON 里读取这些信息：
1. 远程图片地址，例如 `posterUrl`、`backdropUrls`
2. 本地保存路径，例如 `localPosterPath`
3. 或者新版结构里的 `downloadResults[*].url` 和 `targetPath`

下载完成后：
1. 图片会保存到 JSON 里写好的本地路径
2. 终端里会打印每一张图的下载结果
3. 如果某张图失败，会在终端里看到 `Failed ...`

如果你看到这类提示：
1. `JSON path is required`
   说明你运行脚本时没有传 JSON 文件路径
2. `No download tasks found`
   说明这份 JSON 里没有可下载的图片任务
"""

import json
import pathlib
import sys
from urllib.parse import urlparse

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


def load_payload(json_path: pathlib.Path) -> dict:
    """读取抓取结果 JSON，返回 Python 字典。"""
    return json.loads(json_path.read_text(encoding="utf-8"))


def resolve_json_paths(argv: list[str]) -> list[pathlib.Path]:
    """解析命令行参数里的 JSON 路径列表。"""
    if not argv:
        raise ValueError("JSON path is required. Usage: py download_show_images.py <json-path> [json-path ...]")
    return [pathlib.Path(item).expanduser() for item in argv]


def build_session() -> requests.Session:
    """创建带重试能力的 requests 会话，减少偶发下载失败。"""
    session = requests.Session()
    retry = Retry(
        total=3,
        connect=3,
        read=3,
        backoff_factor=1.2,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["GET"],
    )
    adapter = HTTPAdapter(max_retries=retry)
    session.mount("http://", adapter)
    session.mount("https://", adapter)
    return session


def guess_ext(url: str, content_type: str = "") -> str:
    """根据图片 URL 或响应头猜测扩展名。"""
    lowered = content_type.lower()
    if "jpeg" in lowered:
        return ".jpg"
    if "png" in lowered:
        return ".png"
    if "webp" in lowered:
        return ".webp"
    if "gif" in lowered:
        return ".gif"

    path = urlparse(url).path.lower()
    for ext in [".jpg", ".jpeg", ".png", ".webp", ".gif"]:
        if path.endswith(ext):
            return ".jpg" if ext == ".jpeg" else ext
    return ".jpg"


def normalize_target_path(target_path: str, url: str, content_type: str = "") -> pathlib.Path:
    """把目标路径补成最终文件路径。"""
    path = pathlib.Path(target_path)
    # 如果 JSON 里已经写了完整文件名，例如 poster.jpg，就直接使用。
    if path.suffix:
        return path
    # 如果只给了一个“没有扩展名的路径”，就按图片实际类型补后缀。
    return path.with_suffix(guess_ext(url, content_type))


def build_download_tasks(payload: dict) -> list[dict]:
    """把 JSON 数据整理成统一的下载任务列表。"""
    tasks: list[dict] = []

    # 优先读取新版结构：downloadResults 里同时保存了远程图片 URL 和本地目标路径。
    for item in payload.get("downloadResults", []) or []:
        url = str(item.get("url") or "").strip()
        target_path = str(item.get("targetPath") or "").strip()
        if not url or not target_path:
            continue

        # label 主要用于日志输出，方便你知道当前下载的是哪一张图。
        label = str(item.get("label") or pathlib.Path(target_path).stem or f"image-{len(tasks) + 1}")
        tasks.append(
            {
                "label": label,
                "url": url,
                "target_path": pathlib.Path(target_path),
            }
        )

    # 只要新版结构存在，就直接使用，不再回退到旧结构。
    if tasks:
        return tasks

    # 兼容旧版结构：图片 URL 在 images 下，本地路径在 localPosterPath / localCarouselPaths 下。
    images = payload.get("images", {}) or {}
    poster_url = str(images.get("posterUrl") or "").strip()
    local_poster_path = str(payload.get("localPosterPath") or "").strip()
    if poster_url and local_poster_path:
        tasks.append(
            {
                "label": "poster",
                "url": poster_url,
                "target_path": pathlib.Path(local_poster_path),
            }
        )

    backdrop_urls = [str(url).strip() for url in (images.get("backdropUrls") or []) if str(url).strip()]
    local_carousel_paths = [str(path).strip() for path in (payload.get("localCarouselPaths") or []) if str(path).strip()]

    # 这里按索引一一对应：第 1 张背景图对应第 1 个本地路径，以此类推。
    for index, url in enumerate(backdrop_urls, start=1):
        target_path = local_carousel_paths[index - 1] if index - 1 < len(local_carousel_paths) else ""
        if not target_path:
            continue
        tasks.append(
            {
                "label": f"backdrop-{index}",
                "url": url,
                "target_path": pathlib.Path(target_path),
            }
        )

    return tasks


def download_file(session: requests.Session, headers: dict[str, str], task: dict) -> None:
    """下载单张图片并保存到目标路径。"""
    label = task["label"]
    url = task["url"]
    target_path = pathlib.Path(task["target_path"])

    print(f"Downloading {label}: {url}")
    with session.get(url, headers=headers, stream=True, timeout=(10, 60)) as response:
        response.raise_for_status()
        final_path = normalize_target_path(str(target_path), url, response.headers.get("Content-Type", ""))
        # 如果目标目录不存在，就自动创建，避免手动建文件夹。
        final_path.parent.mkdir(parents=True, exist_ok=True)
        with final_path.open("wb") as file:
            # 分块写入适合下载大图片，内存占用更稳。
            for chunk in response.iter_content(chunk_size=65536):
                if chunk:
                    file.write(chunk)
        print(f"Saved -> {final_path}")


def download_from_json(json_path: pathlib.Path, session: requests.Session) -> bool:
    """按单个 JSON 文件执行整组图片下载。"""
    payload = load_payload(json_path)
    source_url = payload.get("source", {}).get("url", "https://www.hanjupro.com/")
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/140.0.0.0 Safari/537.36"
        ),
        "Referer": source_url,
    }

    tasks = build_download_tasks(payload)
    if not tasks:
        print(f"No download tasks found: {json_path}")
        return True

    # 只要其中一张图失败，就把这份 JSON 的结果标记为失败。
    ok = True
    for task in tasks:
        try:
            download_file(session, headers, task)
        except Exception as error:
            ok = False
            print(f"Failed {task['label']}: {error}")

    if ok:
        print(f"Done: {json_path}")

    return ok


def main(argv: list[str] | None = None) -> int:
    """脚本入口：支持一次传入一个或多个 JSON 文件路径。"""
    args = sys.argv[1:] if argv is None else argv
    try:
        json_paths = resolve_json_paths(args)
    except ValueError as error:
        print(error)
        return 1

    # 多个 JSON 共享一个下载会话，能少建几次连接。
    session = build_session()
    ok = True
    for json_path in json_paths:
        if not download_from_json(json_path, session):
            ok = False

    return 0 if ok else 1


if __name__ == "__main__":
    # 让脚本可以直接通过 `py download_show_images.py ...` 运行。
    raise SystemExit(main())
