#!/usr/bin/env python3
"""
Browser Agent SDK - Python 客户端安装脚本
"""

from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

setup(
    name="browser-agent-sdk",
    version="1.0.0",
    author="Browser Agent Team",
    description="Python SDK for Browser Agent Server",
    long_description=long_description,
    long_description_content_type="text/markdown",
    packages=find_packages(),
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "Topic :: Software Development :: Libraries :: Python Modules",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.7",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
    ],
    python_requires=">=3.7",
    install_requires=[
        "requests>=2.25.0",
    ],
    extras_require={
        "websocket": ["websocket-client>=1.0.0"],
    },
    entry_points={
        "console_scripts": [
            "browser-agent=src.cli:main",
        ],
    },
)
