"""Setup script for ribotree-pyodide package."""

from setuptools import setup, find_packages

setup(
    name="ribotree_pyodide",
    version="2.0.2",
    description="Monte Carlo Tree Search for RNA sequence design - Pyodide compatible",
    author="DasLab",
    packages=find_packages(),
    python_requires=">=3.9",
    install_requires=[
        "numpy>=1.20.0",
        "pandas>=1.3.0",
        "networkx>=2.6.0",
        "scipy>=1.7.0",
    ],
    extras_require={
        "dev": [
            "pytest>=7.0",
            "pytest-cov>=3.0",
        ],
    },
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Science/Research",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Topic :: Scientific/Engineering :: Bio-Informatics",
    ],
)
