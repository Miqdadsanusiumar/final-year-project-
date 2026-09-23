#!/usr/bin/env python3
"""
Archive generator for LungNet research repository.
Executes from CLI outside the UI.
Usage: python3 tools/export_repo.py
"""

import os
import zipfile
import datetime

EXCLUDE_DIRS = {'.git', 'node_modules', '__pycache__', '.venv', 'dist', '.cache'}
EXCLUDE_EXTS = {'.pyc', '.pyo', '.DS_Store'}

def create_archive():
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    archive_name = f"lungnet_research_source_{timestamp}.zip"
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    archive_path = os.path.join(root_dir, archive_name)

    print(f"Generating repository bundle: {archive_name} ...")
    with zipfile.ZipFile(archive_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(root_dir):
            dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
            for file in files:
                if any(file.endswith(ext) for ext in EXCLUDE_EXTS):
                    continue
                if file.endswith('.zip'):
                    continue
                file_path = os.path.join(root, file)
                rel_path = os.path.relpath(file_path, root_dir)
                zipf.write(file_path, rel_path)

    print(f"✓ Archive created successfully: {archive_path}")
    print(f"File size: {os.path.getsize(archive_path) / 1024:.1f} KB")

if __name__ == '__main__':
    create_archive()
