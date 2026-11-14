#!/bin/bash
cd "$(dirname "$0")"
export HF_HUB_DISABLE_PROGRESS_BARS=1
P="${PYTHON:-python3}"
$P -W ignore chunks.py
$P -W ignore run.py index
TOPK=5 $P -W ignore run.py run
TOPK=10 $P -W ignore run.py run
