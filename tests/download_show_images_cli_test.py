import pathlib
import unittest

import download_show_images


class DownloadShowImagesCliTest(unittest.TestCase):
    def test_resolve_json_paths_supports_multiple_cli_arguments(self) -> None:
        result = download_show_images.resolve_json_paths(
            [
                "D:\\谷歌下载内容\\魔女2-import.json",
                "D:\\谷歌下载内容\\魔女-detail.json",
            ]
        )

        self.assertEqual(
            result,
            [
                pathlib.Path(r"D:\谷歌下载内容\魔女2-import.json"),
                pathlib.Path(r"D:\谷歌下载内容\魔女-detail.json"),
            ],
        )

    def test_resolve_json_paths_requires_argument(self) -> None:
        with self.assertRaisesRegex(ValueError, "JSON path is required"):
            download_show_images.resolve_json_paths([])


if __name__ == "__main__":
    unittest.main()
